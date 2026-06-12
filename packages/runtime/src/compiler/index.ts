import type { M13Scene, M13Object, M13Material } from '../parser/schema.js';
import { COMMON_WGSL } from '../shaders/common.js';
import { RAYMARCH_WGSL } from '../shaders/raymarch.js';
import { getConcept, type Concept } from '@m13/synth';

/**
 * Layout del buffer MAT_PARAMS — describe dónde vive cada parámetro de cada
 * concepto en el segundo uniform buffer del pipeline.
 *
 * Determinismo: los slots se ordenan por (conceptId asc, paramName asc).
 * Solo se incluyen conceptos que declaran `paramsSchema` con al menos un campo.
 */
export interface MatParamSlot {
  conceptId: string;
  paramName: string;
  /** Índice en el array f32 (0-based). Byte offset = index * 4. */
  index: number;
  /** Valor resuelto: scene override > concept.defaults > 0 */
  value: number;
}

export interface MatParamsLayout {
  /** Cantidad total de slots f32 en el buffer. 0 si ningún concepto declara params. */
  totalFloats: number;
  /** Todos los slots en orden canónico determinista. */
  slots: MatParamSlot[];
  /** Lookup rápido: conceptId → paramName → index. */
  byKey: Record<string, Record<string, number>>;
  /** Float32Array listo para escribir al uniform buffer (longitud = totalFloats). */
  values: Float32Array;
}

export interface CompiledScene {
  /** WGSL fuente completo, listo para createShaderModule */
  wgsl: string;
  /** Escena validada con la que se compiló */
  scene: M13Scene;
  /** Conceptos que se referencian en la escena, ordenados lexicográficamente */
  conceptsUsed: string[];
  /** Layout del buffer MAT_PARAMS (vacío si ningún concepto usa params) */
  matParams: MatParamsLayout;
}

/**
 * Convierte una M13Scene en un módulo WGSL ejecutable por WebGPU.
 *
 * Estructura del shader resultante:
 *   1. COMMON_WGSL (Uniforms, SDF prims, noise, vs_main)
 *   2. MatParams struct + binding @binding(1) — SOLO si algún concepto usa params
 *   3. Funciones de cada concepto material referenciado (orden lexicográfico)
 *   4. function map(p) — geometría de la escena
 *   5. function material(p, n) — material por región
 *   6. RAYMARCH_WGSL (calcNormal, raymarch, shadows, AO, shade, fs_main)
 *
 * El WGSL es DETERMINISTA: misma escena de entrada → mismo string byte-por-byte.
 * Esto permite caché por hash en M13Engine.
 */
export function compileScene(scene: M13Scene): CompiledScene {
  const conceptIds = collectConceptIds(scene);
  const concepts = conceptIds.map((id) => {
    const c = getConcept(id);
    if (!c) {
      throw new Error(
        `[m13/compiler] Concepto desconocido: "${id}". Asegúrate de que @m13/synth lo exporta.`,
      );
    }
    return c;
  });

  const matParams = buildMatParamsLayout(scene, concepts);
  const matParamsBlock =
    matParams.totalFloats > 0 ? `\n${generateMatParamsStruct(matParams)}\n` : '';

  // Filtrar conceptos geométricos (los que exponen wgslSdf). T-021.
  const sdfBlocks = concepts.filter((c) => c.wgslSdf).map((c) => c.wgslSdf!);
  const sdfSection = sdfBlocks.length > 0
    ? '\n// ===== SDFs de conceptos geométricos =====\n' + sdfBlocks.join('\n')
    : '';

  const wgsl = [
    COMMON_WGSL,
    matParamsBlock,
    '\n// ===== constantes de escena =====\n',
    generateSceneConstants(scene),
    '\n// ===== conceptos materiales =====\n',
    ...concepts.map((c) => c.wgsl),
    sdfSection,
    '\n// ===== map() generada =====\n',
    generateMapFunction(scene),
    '\n// ===== material() generada =====\n',
    generateMaterialFunction(scene),
    RAYMARCH_WGSL,
  ].join('\n');

  return { wgsl, scene, conceptsUsed: conceptIds, matParams };
}

// ============================================================
// helpers
// ============================================================

/**
 * Formatea un número como literal de float WGSL determinista.
 *
 * Usa 6 decimales fijos para evitar ruido de float (e.g. `0.300000000004`).
 * Resultado siempre tiene punto decimal — WGSL distingue `5` (int) de `5.0` (float),
 * y las primitivas SDF esperan f32.
 */
function f(n: number): string {
  return n.toFixed(6);
}

/**
 * Hashea el WGSL output con SHA-256 vía Web Crypto API.
 *
 * Cross-platform: funciona en navegador (siempre) y Node 15+ (donde
 * `crypto.subtle` está disponible globalmente). Para tests en Node con
 * versiones más viejas, usar `node:crypto.createHash` directamente.
 *
 * El hash es la clave de caché de shaders en M13Engine — misma escena
 * compilada dos veces produce el mismo WGSL (T-011/T-012) → mismo hash
 * → reuso del pipeline GPU sin recompile.
 */
export async function hashWgsl(wgsl: string): Promise<string> {
  const buf = new TextEncoder().encode(wgsl);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function materialIdOf(m: M13Material): string {
  return typeof m === 'string' ? m : m.concept;
}

function materialParamsOf(m: M13Material): Record<string, unknown> | undefined {
  if (typeof m === 'string') return undefined;
  return m.params;
}

/**
 * Id del concepto efectivo para un objeto. Para `kind: 'concept'` viene del campo
 * `concept` (geometría + material implícito). Para primitivos viene del `material`.
 * El parser garantiza vía superRefine que el campo correcto está presente.
 */
function effectiveConceptId(obj: M13Object): string {
  if (obj.kind === 'concept') return obj.concept!;
  return materialIdOf(obj.material!);
}

function collectConceptIds(scene: M13Scene): string[] {
  const set = new Set<string>();
  set.add(scene.walls.concept);
  set.add(scene.floor.concept);
  set.add(scene.ceiling.concept);
  for (const obj of scene.objects) {
    set.add(effectiveConceptId(obj));
  }
  // Orden lexicográfico → output WGSL determinista entre corridas
  return [...set].sort();
}

/**
 * Construye el layout del buffer MAT_PARAMS para esta escena.
 *
 * Reglas:
 *  - Solo se incluyen conceptos que declaran `paramsSchema` con campos.
 *  - El orden es determinista: conceptos ASC por id, params ASC por nombre.
 *  - Valor por slot = scene override > concept.defaults > 0.
 *  - Si el usuario provee `params` para un concepto SIN paramsSchema → error.
 *  - Si el usuario provee `params` que no validan contra paramsSchema → error Zod.
 *  - Si varios objects usan el mismo concept con params distintos: gana el primero
 *    en orden de aparición (warning para conflictos).
 */
function buildMatParamsLayout(
  scene: M13Scene,
  concepts: Concept[],
): MatParamsLayout {
  // 1. Recolectar params por concept (primer object con ese concept gana).
  const sceneParamsByConcept: Record<string, Record<string, unknown>> = {};

  // Superficies (walls/floor/ceiling) — siempre son materiales.
  const surfaceMats: M13Material[] = [scene.walls, scene.floor, scene.ceiling];
  // Objects: si kind ≠ 'concept', su material está definido (parser lo refina).
  // Si kind === 'concept', no hay params explícitos del scene (defaults del concept aplican).
  const objectMats: M13Material[] = scene.objects
    .filter((o): o is M13Object & { material: M13Material } => o.material !== undefined)
    .map((o) => o.material);
  const allMaterialSurfaces: M13Material[] = [...surfaceMats, ...objectMats];

  for (const m of allMaterialSurfaces) {
    const id = materialIdOf(m);
    const params = materialParamsOf(m);
    if (!params || Object.keys(params).length === 0) continue;
    if (sceneParamsByConcept[id] !== undefined) {
      // Conflicto silencioso por ahora — primer object gana, sucesivos se ignoran.
      // Mejora futura: warning con paths. Comentado para no romper tests determinísticos.
      continue;
    }
    sceneParamsByConcept[id] = params;
  }

  // 2. Validar params contra concept.paramsSchema y construir slots.
  const slots: MatParamSlot[] = [];
  const byKey: Record<string, Record<string, number>> = {};

  for (const c of concepts) {
    const userParams = sceneParamsByConcept[c.id];

    if (!c.paramsSchema) {
      if (userParams !== undefined) {
        throw new Error(
          `[m13/compiler] Concepto "${c.id}" no declara paramsSchema pero la escena le pasa params: ${JSON.stringify(userParams)}`,
        );
      }
      continue; // concepto sin params → no slots
    }

    // Merge defaults + userParams
    const merged: Record<string, unknown> = {
      ...(c.defaults ?? {}),
      ...(userParams ?? {}),
    };

    // Validar contra schema
    const parsed = c.paramsSchema.safeParse(merged);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  · ${i.path.join('.') || '<root>'} — ${i.message}`)
        .join('\n');
      throw new Error(
        `[m13/compiler] params inválidos para concepto "${c.id}":\n${issues}`,
      );
    }

    // Generar slots ordenados por paramName ASC
    const paramNames = Object.keys(parsed.data as Record<string, unknown>).sort();
    byKey[c.id] = {};
    for (const paramName of paramNames) {
      const value = (parsed.data as Record<string, unknown>)[paramName];
      if (typeof value !== 'number') {
        throw new Error(
          `[m13/compiler] params del concepto "${c.id}" solo soporta number (f32) en v0.1; ` +
            `"${paramName}" es ${typeof value}`,
        );
      }
      const index = slots.length;
      slots.push({ conceptId: c.id, paramName, index, value });
      byKey[c.id][paramName] = index;
    }
  }

  const values = new Float32Array(slots.length);
  for (const s of slots) values[s.index] = s.value;

  return {
    totalFloats: slots.length,
    slots,
    byKey,
    values,
  };
}

/**
 * Emite el bloque WGSL con la estructura MatParams y su binding.
 * Solo se llama cuando `layout.totalFloats > 0`.
 *
 * Los conceptos referencian estos campos como `matParams.<conceptId>_<paramName>`.
 */
function generateMatParamsStruct(layout: MatParamsLayout): string {
  const lines: string[] = [];
  lines.push('// ===== MatParams (T-018 — uniforms editables por concepto) =====');
  lines.push('struct MatParams {');
  for (const slot of layout.slots) {
    lines.push(`  ${slot.conceptId}_${slot.paramName}: f32,`);
  }
  lines.push('};');
  lines.push('@group(0) @binding(1) var<uniform> matParams: MatParams;');
  return lines.join('\n');
}

/**
 * Constantes de escena que el shader estático (RAYMARCH_WGSL) consume.
 * `missColor()` es parte del contrato: raymarch.ts la llama en el miss del
 * raymarcher, así `ambient.background` por fin llega al pixel (antes el miss
 * renderizaba negro puro ignorando background).
 */
function generateSceneConstants(scene: M13Scene): string {
  const [br, bg, bb] = scene.ambient.background;
  return [
    'fn missColor() -> vec3<f32> {',
    `  return vec3<f32>(${f(br)}, ${f(bg)}, ${f(bb)});`,
    '}',
  ].join('\n');
}

/**
 * Matriz de rotación inversa (Rᵀ) para una rotación Euler XYZ extrínseca en
 * grados. Se precomputa en compile-time y se emite como constante mat3x3 —
 * costo runtime: un multiply de matriz por objeto rotado, cero para el resto.
 *
 * Convención: R = Rz(γ)·Ry(β)·Rx(α) rota el OBJETO; el SDF evalúa en espacio
 * local, así que el punto se transforma con la inversa Rᵀ.
 */
function rotationInverseMatrix(deg: readonly [number, number, number]): number[][] {
  const [ax, ay, az] = deg.map((d) => (d * Math.PI) / 180);
  const [cx, sx] = [Math.cos(ax), Math.sin(ax)];
  const [cy, sy] = [Math.cos(ay), Math.sin(ay)];
  const [cz, sz] = [Math.cos(az), Math.sin(az)];
  const Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]];
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  const mul = (A: number[][], B: number[][]): number[][] =>
    A.map((row, i) => row.map((_, j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
  const R = mul(Rz, mul(Ry, Rx));
  // transpose = inversa (R es ortogonal)
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => R[j][i]));
}

function hasStaticRotation(obj: M13Object): boolean {
  return obj.rotation !== undefined && obj.rotation.some((v) => v !== 0);
}

function generateMapFunction(scene: M13Scene): string {
  const [bx, by, bz] = scene.bounds;
  const lines: string[] = [];
  lines.push('fn map(p: vec3<f32>) -> f32 {');
  lines.push(`  let room = -sdBox(p, vec3<f32>(${f(bx)}, ${f(by)}, ${f(bz)}));`);

  if (scene.window) {
    const [wx, wy, wz] = scene.window.position;
    const [sx, sy, sz] = scene.window.size;
    lines.push(`  let windowPos = p - vec3<f32>(${f(wx)}, ${f(wy)}, ${f(wz)});`);
    lines.push(
      `  let windowCut = sdBox(windowPos, vec3<f32>(${f(sx)}, ${f(sy)}, ${f(sz)}));`,
    );
    lines.push('  var d = opSub(room, windowCut);');
  } else {
    lines.push('  var d = room;');
  }

  scene.objects.forEach((obj, i) => {
    lines.push(generateObjectSdf(obj, i));
    lines.push(`  d = opUnion(d, obj${i});`);
  });

  lines.push('  return d;');
  lines.push('}');
  return lines.join('\n');
}

function generateObjectSdf(obj: M13Object, index: number): string {
  const [px, py, pz] = obj.position;
  const scale = typeof obj.scale === 'number'
    ? [obj.scale, obj.scale, obj.scale] as const
    : obj.scale;
  const [sx, sy, sz] = scale;

  // Construcción del offset y por animación/audio. Cada parte se concatena con ' + '
  // para garantizar WGSL válido en todas las combinaciones (bob solo, audio solo, ambos, ninguno).
  const yOffsetParts: string[] = [];
  if (obj.animate?.mode === 'bob') {
    yOffsetParts.push(
      `sin(u.time * ${f(obj.animate.speed)}) * ${f(obj.animate.amplitude)}`,
    );
  }
  if (obj.audio_reactive) {
    yOffsetParts.push(`u.audioAmp * 0.1`);
  }
  const yOffset = yOffsetParts.length > 0 ? yOffsetParts.join(' + ') : '0.0';

  // Radio adicional por audio (solo aplica a sphere, pero se calcula uniforme).
  // Default '+ 0.0' (no-op) para que la sintaxis WGSL sea válida también cuando
  // no hay audio reactivity — antes producía `sdSphere(..., r 0.0)` (inválido).
  const extraR = obj.audio_reactive ? `+ u.audioAmp * 0.05` : `+ 0.0`;

  // Transformaciones adicionales (FR-1.3 rotation, animate rotate/pulse).
  // Se emiten SOLO cuando el objeto las usa: una escena sin estas features
  // produce el mismo WGSL byte-por-byte que antes (determinismo + shader cache).
  const pre: string[] = [];
  let localP = `(p - vec3<f32>(${f(px)}, ${f(py)} + (${yOffset}), ${f(pz)}))`;

  if (hasStaticRotation(obj)) {
    const m = rotationInverseMatrix(obj.rotation!);
    // mat3x3<f32> recibe COLUMNAS: columna j = (m[0][j], m[1][j], m[2][j])
    pre.push(
      `  let rotM${index} = mat3x3<f32>(` +
        `vec3<f32>(${f(m[0][0])}, ${f(m[1][0])}, ${f(m[2][0])}), ` +
        `vec3<f32>(${f(m[0][1])}, ${f(m[1][1])}, ${f(m[2][1])}), ` +
        `vec3<f32>(${f(m[0][2])}, ${f(m[1][2])}, ${f(m[2][2])}));`,
    );
    localP = `(rotM${index} * ${localP})`;
  }

  if (obj.animate?.mode === 'rotate') {
    // Giro continuo alrededor del eje Y local. speed = velocidad angular (rad/s).
    // Inversa de Ry(θ) aplicada al punto: (c·x − s·z, y, s·x + c·z) con θ = time·speed.
    pre.push(`  let ang${index} = u.time * ${f(obj.animate.speed)};`);
    pre.push(`  let cs${index} = cos(ang${index});`);
    pre.push(`  let sn${index} = sin(ang${index});`);
    pre.push(`  let rp${index} = ${localP};`);
    pre.push(
      `  let rq${index} = vec3<f32>(cs${index} * rp${index}.x - sn${index} * rp${index}.z, rp${index}.y, sn${index} * rp${index}.x + cs${index} * rp${index}.z);`,
    );
    localP = `rq${index}`;
  }

  // Pulse: escala uniforme oscilante. SDF válida bajo escala uniforme:
  // d = sdf(p/k) · k. amplitude se acota a 0.9 para que k nunca llegue a 0.
  let scaleIn = '';
  let scaleOut = '';
  if (obj.animate?.mode === 'pulse') {
    const amp = Math.min(obj.animate.amplitude, 0.9);
    pre.push(
      `  let k${index} = 1.0 + ${f(amp)} * sin(u.time * ${f(obj.animate.speed)});`,
    );
    pre.push(`  let pp${index} = ${localP} / k${index};`);
    localP = `pp${index}`;
    scaleIn = '(';
    scaleOut = `) * k${index}`;
  }

  const prefix = pre.length > 0 ? pre.join('\n') + '\n' : '';

  switch (obj.kind) {
    case 'sphere': {
      const r = sx; // sphere uses x scale as radius
      return `${prefix}  let obj${index} = ${scaleIn}sdSphere(${localP}, ${f(r)} ${extraR})${scaleOut};`;
    }
    case 'box':
      return `${prefix}  let obj${index} = ${scaleIn}sdBox(${localP}, vec3<f32>(${f(sx)}, ${f(sy)}, ${f(sz)}))${scaleOut};`;
    case 'round_box':
      return `${prefix}  let obj${index} = ${scaleIn}sdRoundBox(${localP}, vec3<f32>(${f(sx)}, ${f(sy)}, ${f(sz)}), 0.05)${scaleOut};`;
    case 'cylinder':
      return `${prefix}  let obj${index} = ${scaleIn}sdCylinder(${localP}, ${f(sy)}, ${f(sx)})${scaleOut};`;
    case 'torus':
      return `${prefix}  let obj${index} = ${scaleIn}sdTorus(${localP}, vec2<f32>(${f(sx)}, ${f(sy)}))${scaleOut};`;
    case 'concept':
      // T-021: delegamos al SDF del concepto geométrico. Firma esperada:
      //   fn sdf_<id>(p: vec3<f32>, scale: vec3<f32>) -> f32
      // El compiler ya hace la translación de posición y animación a través de `localP`.
      return `${prefix}  let obj${index} = ${scaleIn}sdf_${obj.concept!}(${localP}, vec3<f32>(${f(sx)}, ${f(sy)}, ${f(sz)}))${scaleOut};`;
  }
}

function generateMaterialFunction(scene: M13Scene): string {
  const [, by] = scene.bounds;
  const wallsId = scene.walls.concept;
  const floorId = scene.floor.concept;
  const ceilingId = scene.ceiling.concept;

  const lines: string[] = [];
  lines.push('fn material(p: vec3<f32>, n: vec3<f32>) -> vec3<f32> {');
  lines.push(`  // Piso (normal hacia arriba, y bajo)`);
  lines.push(`  if (n.y > 0.7 && p.y < -${f(by * 0.83)}) {`);
  lines.push(`    return mat_${floorId}(p, n, u.audioAmp);`);
  lines.push(`  }`);
  lines.push(`  // Techo (normal hacia abajo)`);
  lines.push(`  if (n.y < -0.7) {`);
  lines.push(`    return mat_${ceilingId}(p, n, u.audioAmp);`);
  lines.push(`  }`);

  // objetos: por posición + radio aproximado.
  // B8 (auditoría 06-12): el radio incluye (1) distancia real a la esquina del
  // bound — length(scale) en vez de max(scale)*1.4, que con boxes planos
  // [3,0.2,0.5] generaba esferas gigantes que se tragaban materiales vecinos —
  // y (2) la amplitud de animación: un bob con amplitud > 0.4·scale salía de
  // su esfera a media animación y perdía su material.
  scene.objects.forEach((obj) => {
    const [px, py, pz] = obj.position;
    const matId = effectiveConceptId(obj);
    const baseRadius =
      typeof obj.scale === 'number'
        ? obj.scale * 1.4 // scalar (esferas/uniformes): comportamiento histórico
        : Math.hypot(...obj.scale) * 1.15; // vec3: distancia a la esquina + margen
    let animPad = 0;
    if (obj.animate?.mode === 'bob') {
      animPad = obj.animate.amplitude; // desplaza la posición ±amplitude
    } else if (obj.animate?.mode === 'pulse') {
      animPad = baseRadius * Math.min(obj.animate.amplitude, 0.9); // escala el SDF
    }
    const r = baseRadius + animPad;
    lines.push(`  if (length(p - vec3<f32>(${f(px)}, ${f(py)}, ${f(pz)})) < ${f(r)}) {`);
    lines.push(`    return mat_${matId}(p, n, u.audioAmp);`);
    lines.push(`  }`);
  });

  // default: paredes
  lines.push(`  return mat_${wallsId}(p, n, u.audioAmp);`);
  lines.push('}');
  return lines.join('\n');
}
