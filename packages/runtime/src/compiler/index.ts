import type { M13Scene, M13Object, M13Material } from '../parser/schema.js';
import { COMMON_WGSL } from '../shaders/common.js';
import { RAYMARCH_WGSL } from '../shaders/raymarch.js';
import { getConcept } from '@m13/synth';

export interface CompiledScene {
  /** WGSL fuente completo, listo para createShaderModule */
  wgsl: string;
  /** Escena validada con la que se compiló */
  scene: M13Scene;
  /** Conceptos que se referencian en la escena */
  conceptsUsed: string[];
}

/**
 * Convierte una M13Scene en un módulo WGSL ejecutable por WebGPU.
 *
 * Estructura del shader resultante:
 *   1. COMMON_WGSL (Uniforms, SDF prims, noise, vs_main)
 *   2. Funciones de cada concepto material referenciado
 *   3. function map(p) — geometría de la escena
 *   4. function material(p, n) — material por región
 *   5. RAYMARCH_WGSL (calcNormal, raymarch, shadows, AO, shade, fs_main)
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
  return [...set];
}

function generateMapFunction(scene: M13Scene): string {
  const [bx, by, bz] = scene.bounds;
  const lines: string[] = [];
  lines.push('fn map(p: vec3<f32>) -> f32 {');
  lines.push(`  let room = -sdBox(p, vec3<f32>(${bx}, ${by}, ${bz}));`);

  if (scene.window) {
    const [wx, wy, wz] = scene.window.position;
    const [sx, sy, sz] = scene.window.size;
    lines.push(
      `  let windowPos = p - vec3<f32>(${wx}, ${wy}, ${wz});`,
    );
    lines.push(
      `  let windowCut = sdBox(windowPos, vec3<f32>(${sx}, ${sy}, ${sz}));`,
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

  // animaciones
  let yOffset = '0.0';
  let extraR = '0.0';
  if (obj.animate?.mode === 'bob') {
    yOffset = `sin(u.time * ${obj.animate.speed}) * ${obj.animate.amplitude}`;
  }
  if (obj.audio_reactive) {
    extraR = `+ u.audioAmp * 0.05`;
    yOffset = `${yOffset} + u.audioAmp * 0.1`;
  }

  const localP = `(p - vec3<f32>(${px}, ${py} + (${yOffset}), ${pz}))`;

  switch (obj.kind) {
    case 'sphere': {
      const r = sx; // sphere uses x scale as radius
      return `  let obj${index} = sdSphere(${localP}, ${r} ${extraR});`;
    }
    case 'box':
      return `  let obj${index} = sdBox(${localP}, vec3<f32>(${sx}, ${sy}, ${sz}));`;
    case 'round_box':
      return `  let obj${index} = sdRoundBox(${localP}, vec3<f32>(${sx}, ${sy}, ${sz}), 0.05);`;
    case 'cylinder':
      return `  let obj${index} = sdCylinder(${localP}, ${sy}, ${sx});`;
    case 'torus':
      return `  let obj${index} = sdTorus(${localP}, vec2<f32>(${sx}, ${sy}));`;
  }
}

function generateMaterialFunction(scene: M13Scene): string {
  const [bx, by, bz] = scene.bounds;
  const wallsId = scene.walls.concept;
  const floorId = scene.floor.concept;
  const ceilingId = scene.ceiling.concept;

  const lines: string[] = [];
  lines.push('fn material(p: vec3<f32>, n: vec3<f32>) -> vec3<f32> {');
  lines.push(`  // Piso (normal hacia arriba, y bajo)`);
  lines.push(`  if (n.y > 0.7 && p.y < -${by * 0.83}) {`);
  lines.push(`    return mat_${floorId}(p, n, u.audioAmp);`);
  lines.push(`  }`);
  lines.push(`  // Techo (normal hacia abajo)`);
  lines.push(`  if (n.y < -0.7) {`);
  lines.push(`    return mat_${ceilingId}(p, n, u.audioAmp);`);
  lines.push(`  }`);

  // objetos: por posición + radio aproximado
  scene.objects.forEach((obj, _i) => {
    const [px, py, pz] = obj.position;
    const matId = materialIdOf(obj.material);
    const scale = typeof obj.scale === 'number' ? obj.scale : Math.max(...obj.scale);
    const r = scale * 1.4;
    lines.push(`  if (length(p - vec3<f32>(${px}, ${py}, ${pz})) < ${r}) {`);
    lines.push(`    return mat_${matId}(p, n, u.audioAmp);`);
    lines.push(`  }`);
  });

  // default: paredes
  lines.push(`  return mat_${wallsId}(p, n, u.audioAmp);`);
  lines.push('}');
  // Silencio uso del param bz si no se usa
  void bx; void bz;
  return lines.join('\n');
}
