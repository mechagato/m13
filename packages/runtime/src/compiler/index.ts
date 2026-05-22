import type { M13Scene, M13Object, M13Material } from '../parser/schema.js';
import { COMMON_WGSL } from '../shaders/common.js';
import { RAYMARCH_WGSL } from '../shaders/raymarch.js';
import { getConcept } from '@m13/synth';

export interface CompiledScene {
  /** WGSL fuente completo, listo para createShaderModule */
  wgsl: string;
  /** Escena validada con la que se compiló */
  scene: M13Scene;
  /** Conceptos que se referencian en la escena, ordenados lexicográficamente */
  conceptsUsed: string[];
}

/**
 * Convierte una M13Scene en un módulo WGSL ejecutable por WebGPU.
 *
 * Estructura del shader resultante:
 *   1. COMMON_WGSL (Uniforms, SDF prims, noise, vs_main)
 *   2. Funciones de cada concepto material referenciado (orden lexicográfico)
 *   3. function map(p) — geometría de la escena
 *   4. function material(p, n) — material por región
 *   5. RAYMARCH_WGSL (calcNormal, raymarch, shadows, AO, shade, fs_main)
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

  const wgsl = [
    COMMON_WGSL,
    '\n// ===== conceptos materiales =====\n',
    ...concepts.map((c) => c.wgsl),
    '\n// ===== map() generada =====\n',
    generateMapFunction(scene),
    '\n// ===== material() generada =====\n',
    generateMaterialFunction(scene),
    RAYMARCH_WGSL,
  ].join('\n');

  return { wgsl, scene, conceptsUsed: conceptIds };
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

function collectConceptIds(scene: M13Scene): string[] {
  const set = new Set<string>();
  set.add(scene.walls.concept);
  set.add(scene.floor.concept);
  set.add(scene.ceiling.concept);
  for (const obj of scene.objects) {
    set.add(materialIdOf(obj.material));
  }
  // Orden lexicográfico → output WGSL determinista entre corridas
  return [...set].sort();
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

  const localP = `(p - vec3<f32>(${f(px)}, ${f(py)} + (${yOffset}), ${f(pz)}))`;

  switch (obj.kind) {
    case 'sphere': {
      const r = sx; // sphere uses x scale as radius
      return `  let obj${index} = sdSphere(${localP}, ${f(r)} ${extraR});`;
    }
    case 'box':
      return `  let obj${index} = sdBox(${localP}, vec3<f32>(${f(sx)}, ${f(sy)}, ${f(sz)}));`;
    case 'round_box':
      return `  let obj${index} = sdRoundBox(${localP}, vec3<f32>(${f(sx)}, ${f(sy)}, ${f(sz)}), 0.05);`;
    case 'cylinder':
      return `  let obj${index} = sdCylinder(${localP}, ${f(sy)}, ${f(sx)});`;
    case 'torus':
      return `  let obj${index} = sdTorus(${localP}, vec2<f32>(${f(sx)}, ${f(sy)}));`;
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

  // objetos: por posición + radio aproximado
  scene.objects.forEach((obj) => {
    const [px, py, pz] = obj.position;
    const matId = materialIdOf(obj.material);
    const scale = typeof obj.scale === 'number' ? obj.scale : Math.max(...obj.scale);
    const r = scale * 1.4;
    lines.push(`  if (length(p - vec3<f32>(${f(px)}, ${f(py)}, ${f(pz)})) < ${f(r)}) {`);
    lines.push(`    return mat_${matId}(p, n, u.audioAmp);`);
    lines.push(`  }`);
  });

  // default: paredes
  lines.push(`  return mat_${wallsId}(p, n, u.audioAmp);`);
  lines.push('}');
  return lines.join('\n');
}
