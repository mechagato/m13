import { MAX_SCENE_OBJECTS, type M13Scene, type M13SceneV01, type M13SceneV02, type M13Object, type M13ObjectV02, type M13Material, type M13Timeline } from '../parser/schema.js';
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
  if (scene.objects.length > MAX_SCENE_OBJECTS) {
    throw new Error(`[m13/compiler] La escena excede el máximo de ${MAX_SCENE_OBJECTS} objetos.`);
  }
  // v0.2 sin timeline conserva el camino estático byte-idéntico a v0.1.
  const staticScene = scene as M13SceneV01;
  const temporalScene = scene.version === '0.2' && scene.objects.some((obj) => isTimelineAnimation(obj.animate));
  const hasLightFlash = scene.version === '0.2' && scene.events.length > 0;
  const conceptIds = collectConceptIds(staticScene);
  const concepts = conceptIds.map((id) => {
    const c = getConcept(id);
    if (!c) {
      throw new Error(
        `[m13/compiler] Concepto desconocido: "${id}". Asegúrate de que @m13/synth lo exporta.`,
      );
    }
    return c;
  });

  const matParams = buildMatParamsLayout(staticScene, concepts);
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
    hasLightFlash ? generateTemporalSceneConstants(scene as M13SceneV02) : generateSceneConstants(staticScene),
    '\n// ===== conceptos materiales =====\n',
    ...concepts.map((c) => c.wgsl),
    sdfSection,
    '\n// ===== map() generada =====\n',
    temporalScene ? generateTemporalMapFunction(scene as M13SceneV02) : generateMapFunction(staticScene),
    '\n// ===== material() generada =====\n',
    temporalScene ? generateTemporalMaterialFunction(scene as M13SceneV02) : generateMaterialFunction(staticScene),
    hasLightFlash ? RAYMARCH_WGSL.replace('u.lightIntensity', 'sceneLightIntensity()') : RAYMARCH_WGSL,
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

function collectConceptIds(scene: M13SceneV01): string[] {
  const set = new Set<string>();
  if (scene.walls) set.add(scene.walls.concept);
  set.add(scene.floor.concept);
  if (scene.ceiling) set.add(scene.ceiling.concept);
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
  scene: M13SceneV01,
  concepts: Concept[],
): MatParamsLayout {
  // 1. Recolectar params por concept (primer object con ese concept gana).
  const sceneParamsByConcept: Record<string, Record<string, unknown>> = {};

  // Superficies (walls/floor/ceiling) — materiales. walls/ceiling son opcionales
  // en exterior (T-231); se filtran los ausentes manteniendo el orden interior.
  const surfaceMats: M13Material[] = [scene.walls, scene.floor, scene.ceiling].filter(
    (s): s is NonNullable<typeof s> => s !== undefined,
  );
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
function generateSceneConstants(scene: Pick<M13Scene, 'ambient' | 'sky' | 'walls' | 'ceiling'>): string {
  let bg: readonly [number, number, number] = scene.ambient.background;
  // F10: el cielo solo aplica en exterior (en interior el miss casi nunca se ve y
  // alteraría el hash silenciosamente). Sin sky/exterior → background tal cual (byte-idéntico).
  const exterior = scene.walls === undefined || scene.ceiling === undefined;
  if (scene.sky && exterior) {
    // Cielo de exterior (T-232): por ahora color plano ponderado hacia el cénit.
    // El gradiente per-pixel horizonte→cénit es mejora futura (requiere pasar la
    // dirección del rayo al miss, lo que cambiaría el contrato del shader estático).
    // Sin `sky` el WGSL es byte-idéntico al anterior → hashes interiores intactos.
    const [hr, hg, hb] = scene.sky.horizon;
    const [zr, zg, zb] = scene.sky.zenith;
    bg = [(hr + 2 * zr) / 3, (hg + 2 * zg) / 3, (hb + 2 * zb) / 3];
  }
  const [br, bgc, bb] = bg;
  return [
    'fn missColor() -> vec3<f32> {',
    `  return vec3<f32>(${f(br)}, ${f(bgc)}, ${f(bb)});`,
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

/** Solo se agrega a escenas v0.2 con eventos, para no modificar hashes v0.1. */
function generateTemporalSceneConstants(scene: M13SceneV02): string {
  const lines = [generateSceneConstants(scene)];
  lines.push('fn sceneLightIntensity() -> f32 {');
  lines.push('  var flash: f32 = 0.0;');
  for (const event of scene.events) {
    // El schema solo admite light_flash en P1. max evita que eventos solapados exploten la luz.
    lines.push(`  flash = max(flash, (1.0 - clamp(abs(u.time - ${f(event.t)}) / ${f(event.duration)}, 0.0, 1.0)) * ${f(event.intensity)});`);
  }
  lines.push('  return u.lightIntensity * (1.0 + flash);');
  lines.push('}');
  return lines.join('\n');
}

function isTimelineAnimation(
  animate: M13ObjectV02['animate'] | M13Object['animate'],
): animate is M13Timeline {
  return animate !== undefined && 'keyframes' in animate;
}

/**
 * Offset de dominio determinista desde un seed (P5/T-251). Descorrelaciona el muestreo
 * de ruido del material → dos instancias del mismo concepto se ven hermanas, no clones.
 * Mismo seed = mismo offset (determinista); seeds distintos = offsets distintos. K=13
 * separa lo suficiente para que las vetas/grano no se repitan.
 */
/** P4/T-242: canal del uniform para la reactividad de audio. `true` = amplitud global
 *  (u.audioAmp, compat); `{band}` = la banda FFT (graves→x, medios→y, agudos→z); ''=sin audio. */
function audioChannel(ar: M13Object['audio_reactive']): string {
  if (ar === true) return 'u.audioAmp';
  if (typeof ar === 'object' && ar !== null) {
    return `u.audioBands.${ar.band === 'bass' ? 'x' : ar.band === 'mid' ? 'y' : 'z'}`;
  }
  return '';
}

function seedOffset(seed: number): [number, number, number] {
  const h = (x: number): number => {
    const s = Math.sin(x) * 43758.5453123;
    return s - Math.floor(s);
  };
  const K = 13.0;
  // F8: cada canal hashea el seed con una transformación independiente (no un delta
  // pequeño compartido) → ningún par (seedA, eje) colisiona con (seedB, otro eje).
  return [h(seed * 0.1031) * K, h(seed * 0.0973 + 19.19) * K, h(seed * 0.1107 + 71.71) * K];
}

function generateMapFunction(scene: M13SceneV01): string {
  const [bx, by, bz] = scene.bounds;
  const exterior = scene.walls === undefined || scene.ceiling === undefined;
  const lines: string[] = [];
  lines.push('fn map(p: vec3<f32>) -> f32 {');

  if (exterior) {
    // Modo exterior (T-232): suelo plano infinito en y=-by, cielo abierto (sin caja
    // de cuarto). El cielo es el "miss" del raymarcher, no una superficie.
    lines.push(`  var d = p.y + ${f(by)};`);
  } else {
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
  const audioCh = audioChannel(obj.audio_reactive);
  if (audioCh) {
    yOffsetParts.push(`${audioCh} * 0.1`);
  }
  const yOffset = yOffsetParts.length > 0 ? yOffsetParts.join(' + ') : '0.0';

  // Radio adicional por audio (solo aplica a sphere, pero se calcula uniforme).
  // Default '+ 0.0' (no-op) para que la sintaxis WGSL sea válida también cuando
  // no hay audio reactivity — antes producía `sdSphere(..., r 0.0)` (inválido).
  const extraR = audioCh ? `+ ${audioCh} * 0.05` : `+ 0.0`;

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

type TimelineKeyframe = {
  t: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  scale: readonly [number, number, number];
  ease: 'linear' | 'smooth' | 'in' | 'out';
};

/**
 * Completa cada pista con el valor anterior. Las transformaciones temporales son
 * relativas al objeto: position parte de [0,0,0], rotation de [0,0,0] y scale
 * de [1,1,1]. Si el primer keyframe no esta en t=0, se interpola desde identidad.
 */
function resolveTimeline(timeline: M13Timeline): TimelineKeyframe[] {
  let position: readonly [number, number, number] = [0, 0, 0];
  let rotation: readonly [number, number, number] = [0, 0, 0];
  let scale: readonly [number, number, number] = [1, 1, 1];
  const keyframes: TimelineKeyframe[] = [];

  for (const keyframe of timeline.keyframes) {
    position = keyframe.position ?? position;
    rotation = keyframe.rotation ?? rotation;
    if (keyframe.scale !== undefined) {
      scale = typeof keyframe.scale === 'number'
        ? [keyframe.scale, keyframe.scale, keyframe.scale]
        : keyframe.scale;
    }
    keyframes.push({ t: keyframe.t, position, rotation, scale, ease: keyframe.ease });
  }

  if (keyframes[0].t > 0) {
    keyframes.unshift({
      t: 0,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      ease: keyframes[0].ease,
    });
  }
  return keyframes;
}

function vec3Literal(value: readonly [number, number, number]): string {
  return `vec3<f32>(${f(value[0])}, ${f(value[1])}, ${f(value[2])})`;
}

function easingExpression(ease: TimelineKeyframe['ease'], raw: string): string {
  switch (ease) {
    case 'linear': return raw;
    case 'smooth': return `smoothstep(0.0, 1.0, ${raw})`;
    case 'in': return `(${raw} * ${raw})`;
    case 'out': return `(1.0 - (1.0 - ${raw}) * (1.0 - ${raw}))`;
  }
}

/** Emite evaluacion de pista completamente en WGSL; no hay trabajo de CPU por frame. */
function generateTimelineEvaluation(timeline: M13Timeline, index: number, prefix: string): string[] {
  const frames = resolveTimeline(timeline);
  const name = `${prefix}${index}`;
  const first = frames[0];
  const lines = [
    `  let ${name}Time = ${timeline.loop ? `fract(u.time / ${f(timeline.duration)}) * ${f(timeline.duration)}` : `min(u.time, ${f(timeline.duration)})`};`,
    `  var ${name}Pos = ${vec3Literal(first.position)};`,
    `  var ${name}Rot = ${vec3Literal(first.rotation)};`,
    `  var ${name}Scale = ${vec3Literal(first.scale)};`,
  ];

  for (let i = 0; i < frames.length - 1; i += 1) {
    const from = frames[i];
    const to = frames[i + 1];
    const raw = `${name}Raw${i}`;
    const eased = `${name}Ease${i}`;
    lines.push(`  if (${name}Time >= ${f(from.t)} && ${name}Time < ${f(to.t)}) {`);
    lines.push(`    let ${raw} = clamp((${name}Time - ${f(from.t)}) / ${f(to.t - from.t)}, 0.0, 1.0);`);
    lines.push(`    let ${eased} = ${easingExpression(to.ease, raw)};`);
    lines.push(`    ${name}Pos = mix(${vec3Literal(from.position)}, ${vec3Literal(to.position)}, ${eased});`);
    lines.push(`    ${name}Rot = mix(${vec3Literal(from.rotation)}, ${vec3Literal(to.rotation)}, ${eased});`);
    lines.push(`    ${name}Scale = mix(${vec3Literal(from.scale)}, ${vec3Literal(to.scale)}, ${eased});`);
    lines.push('  }');
  }
  const last = frames[frames.length - 1];
  lines.push(`  if (${name}Time >= ${f(last.t)}) {`);
  lines.push(`    ${name}Pos = ${vec3Literal(last.position)};`);
  lines.push(`    ${name}Rot = ${vec3Literal(last.rotation)};`);
  lines.push(`    ${name}Scale = ${vec3Literal(last.scale)};`);
  lines.push('  }');
  return lines;
}

function generateTemporalMapFunction(scene: M13SceneV02): string {
  const [bx, by, bz] = scene.bounds;
  const exterior = scene.walls === undefined || scene.ceiling === undefined;
  const lines: string[] = ['fn map(p: vec3<f32>) -> f32 {'];
  if (exterior) {
    lines.push(`  var d = p.y + ${f(by)};`);
  } else {
    lines.push(`  let room = -sdBox(p, vec3<f32>(${f(bx)}, ${f(by)}, ${f(bz)}));`);
    if (scene.window) {
      const [wx, wy, wz] = scene.window.position;
      const [sx, sy, sz] = scene.window.size;
      lines.push(`  let windowPos = p - vec3<f32>(${f(wx)}, ${f(wy)}, ${f(wz)});`);
      lines.push(`  let windowCut = sdBox(windowPos, vec3<f32>(${f(sx)}, ${f(sy)}, ${f(sz)}));`);
      lines.push('  var d = opSub(room, windowCut);');
    } else {
      lines.push('  var d = room;');
    }
  }
  scene.objects.forEach((obj, i) => {
    lines.push(isTimelineAnimation(obj.animate)
      ? generateTemporalObjectSdf(obj, i)
      : generateObjectSdf(obj as M13Object, i));
    lines.push(`  d = opUnion(d, obj${i});`);
  });
  lines.push('  return d;');
  lines.push('}');
  return lines.join('\n');
}

function generateTemporalObjectSdf(obj: M13ObjectV02, index: number): string {
  if (!isTimelineAnimation(obj.animate)) throw new Error('[m13/compiler] Timeline esperado.');
  const [px, py, pz] = obj.position;
  const baseScale = typeof obj.scale === 'number' ? [obj.scale, obj.scale, obj.scale] as const : obj.scale;
  const audioCh = audioChannel(obj.audio_reactive);
  const yOffset = audioCh ? `${audioCh} * 0.1` : '0.0';
  const extraR = audioCh ? `+ ${audioCh} * 0.05` : '+ 0.0';
  const pre = generateTimelineEvaluation(obj.animate, index, 'tl');
  let localP = `(p - (vec3<f32>(${f(px)}, ${f(py)} + (${yOffset}), ${f(pz)}) + tl${index}Pos))`;

  if (hasStaticRotation(obj as M13Object)) {
    const m = rotationInverseMatrix(obj.rotation!);
    pre.push(`  let rotM${index} = mat3x3<f32>(vec3<f32>(${f(m[0][0])}, ${f(m[1][0])}, ${f(m[2][0])}), vec3<f32>(${f(m[0][1])}, ${f(m[1][1])}, ${f(m[2][1])}), vec3<f32>(${f(m[0][2])}, ${f(m[1][2])}, ${f(m[2][2])}));`);
    localP = `(rotM${index} * ${localP})`;
  }
  // R = Rz * Ry * Rx. Para evaluar el SDF aplicamos R^-1 en orden Z, Y, X.
  pre.push(`  let tl${index}Rad = radians(tl${index}Rot);`);
  pre.push(`  let tl${index}Z = vec3<f32>(cos(tl${index}Rad.z) * ${localP}.x + sin(tl${index}Rad.z) * ${localP}.y, -sin(tl${index}Rad.z) * ${localP}.x + cos(tl${index}Rad.z) * ${localP}.y, ${localP}.z);`);
  pre.push(`  let tl${index}Y = vec3<f32>(cos(tl${index}Rad.y) * tl${index}Z.x - sin(tl${index}Rad.y) * tl${index}Z.z, tl${index}Z.y, sin(tl${index}Rad.y) * tl${index}Z.x + cos(tl${index}Rad.y) * tl${index}Z.z);`);
  pre.push(`  let tl${index}X = vec3<f32>(tl${index}Y.x, cos(tl${index}Rad.x) * tl${index}Y.y + sin(tl${index}Rad.x) * tl${index}Y.z, -sin(tl${index}Rad.x) * tl${index}Y.y + cos(tl${index}Rad.x) * tl${index}Y.z);`);
  pre.push(`  let tl${index}P = tl${index}X / tl${index}Scale;`);
  pre.push(`  let tl${index}DistanceScale = min(tl${index}Scale.x, min(tl${index}Scale.y, tl${index}Scale.z));`);
  localP = `tl${index}P`;
  const prefix = pre.join('\n') + '\n';
  const distance = ` * tl${index}DistanceScale`;
  switch (obj.kind) {
    case 'sphere': return `${prefix}  let obj${index} = sdSphere(${localP}, ${f(baseScale[0])} ${extraR})${distance};`;
    case 'box': return `${prefix}  let obj${index} = sdBox(${localP}, ${vec3Literal(baseScale)})${distance};`;
    case 'round_box': return `${prefix}  let obj${index} = sdRoundBox(${localP}, ${vec3Literal(baseScale)}, 0.05)${distance};`;
    case 'cylinder': return `${prefix}  let obj${index} = sdCylinder(${localP}, ${f(baseScale[1])}, ${f(baseScale[0])})${distance};`;
    case 'torus': return `${prefix}  let obj${index} = sdTorus(${localP}, vec2<f32>(${f(baseScale[0])}, ${f(baseScale[1])}))${distance};`;
    case 'concept': return `${prefix}  let obj${index} = sdf_${obj.concept!}(${localP}, ${vec3Literal(baseScale)})${distance};`;
  }
}

function generateMaterialFunction(scene: M13SceneV01): string {
  const [, by] = scene.bounds;
  const exterior = scene.walls === undefined || scene.ceiling === undefined;
  const floorId = scene.floor.concept;
  // En exterior no hay paredes/techo; el material por defecto es el del suelo.
  const wallsId = scene.walls?.concept ?? floorId;
  const ceilingId = scene.ceiling?.concept ?? floorId;

  const lines: string[] = [];
  lines.push('fn material(p: vec3<f32>, n: vec3<f32>) -> vec3<f32> {');
  lines.push(`  // Piso (normal hacia arriba, y bajo)`);
  lines.push(`  if (n.y > 0.7 && p.y < -${f(by * 0.83)}) {`);
  lines.push(`    return mat_${floorId}(p, n, u.audioAmp);`);
  lines.push(`  }`);
  if (!exterior) {
    lines.push(`  // Techo (normal hacia abajo)`);
    lines.push(`  if (n.y < -0.7) {`);
    lines.push(`    return mat_${ceilingId}(p, n, u.audioAmp);`);
    lines.push(`  }`);
  }

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
    // P5/T-251: seed por instancia → offset de dominio en el muestreo del material.
    const matArg =
      obj.seed !== undefined
        ? (() => {
            const [ox, oy, oz] = seedOffset(obj.seed);
            return `p + vec3<f32>(${f(ox)}, ${f(oy)}, ${f(oz)})`;
          })()
        : 'p';
    lines.push(`  if (length(p - vec3<f32>(${f(px)}, ${f(py)}, ${f(pz)})) < ${f(r)}) {`);
    lines.push(`    return mat_${matId}(${matArg}, n, u.audioAmp);`);
    lines.push(`  }`);
  });

  // default: paredes
  lines.push(`  return mat_${wallsId}(p, n, u.audioAmp);`);
  lines.push('}');
  return lines.join('\n');
}

/** Materiales para una escena temporal: el volumen de seleccion sigue la posicion
 * de la pista y se expande con su escala maxima para no perder el material al animar. */
function generateTemporalMaterialFunction(scene: M13SceneV02): string {
  const [, by] = scene.bounds;
  const exterior = scene.walls === undefined || scene.ceiling === undefined;
  const floorId = scene.floor.concept;
  const wallsId = scene.walls?.concept ?? floorId;
  const ceilingId = scene.ceiling?.concept ?? floorId;
  const lines: string[] = ['fn material(p: vec3<f32>, n: vec3<f32>) -> vec3<f32> {'];
  lines.push('  // Piso (normal hacia arriba, y bajo)');
  lines.push(`  if (n.y > 0.7 && p.y < -${f(by * 0.83)}) {`);
  lines.push(`    return mat_${floorId}(p, n, u.audioAmp);`);
  lines.push('  }');
  if (!exterior) {
    lines.push('  // Techo (normal hacia abajo)');
    lines.push('  if (n.y < -0.7) {');
    lines.push(`    return mat_${ceilingId}(p, n, u.audioAmp);`);
    lines.push('  }');
  }

  scene.objects.forEach((obj, index) => {
    const [px, py, pz] = obj.position;
    const matId = effectiveConceptId(obj as M13Object);
    const baseRadius = typeof obj.scale === 'number' ? obj.scale * 1.4 : Math.hypot(...obj.scale) * 1.15;
    let center = `vec3<f32>(${f(px)}, ${f(py)}, ${f(pz)})`;
    let radius = baseRadius;
    if (isTimelineAnimation(obj.animate)) {
      lines.push(...generateTimelineEvaluation(obj.animate, index, 'matTl'));
      center = `(vec3<f32>(${f(px)}, ${f(py)}, ${f(pz)}) + matTl${index}Pos)`;
      radius *= Math.max(...resolveTimeline(obj.animate).flatMap((keyframe) => keyframe.scale));
    } else if (obj.animate?.mode === 'bob') {
      radius += obj.animate.amplitude;
    } else if (obj.animate?.mode === 'pulse') {
      radius += baseRadius * Math.min(obj.animate.amplitude, 0.9);
    }
    const matArg = obj.seed === undefined
      ? 'p'
      : (() => {
          const [ox, oy, oz] = seedOffset(obj.seed);
          return `p + vec3<f32>(${f(ox)}, ${f(oy)}, ${f(oz)})`;
        })();
    lines.push(`  if (length(p - ${center}) < ${f(radius)}) {`);
    lines.push(`    return mat_${matId}(${matArg}, n, u.audioAmp);`);
    lines.push('  }');
  });
  lines.push(`  return mat_${wallsId}(p, n, u.audioAmp);`);
  lines.push('}');
  return lines.join('\n');
}
