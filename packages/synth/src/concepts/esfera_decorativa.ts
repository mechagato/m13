import type { Concept } from '../index.js';

/**
 * T-033 — Esfera decorativa (concepto geométrico).
 *
 * Sphere parametrizable + material blanco mate con iridiscencia sutil.
 * El radio viene del `scale.x` del object. Sin paramsSchema en v0.1
 * (futuras versiones podrían exponer `iridescence` o `tint`).
 *
 * Uso:
 *   - id: bola
 *     kind: concept
 *     concept: esfera_decorativa
 *     position: [0, -1, 0]
 *     scale: 0.4
 */
export const esferaDecorativa: Concept = {
  id: 'esfera_decorativa',
  category: 'object_geo',
  description: 'Esfera decorativa blanco mate con iridiscencia sutil — escultura genérica, decoración.',
  // FR-2.2 — base vec3(0.95,0.94,0.92); iridiscencia depende de la normal, no hay ruido espacial; sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.95, 0.94, 0.92],
    roughness: 0.6,
    normalVariation: 0.05,
    audioReactivity: 0,
  },
  seed: 1003,
  wgsl: /* wgsl */ `
fn mat_esfera_decorativa(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  // Iridiscencia leve dependiente del ángulo de la normal.
  let iridescence = sin(dot(n, vec3<f32>(0.7, 0.3, 0.5)) * 6.28) * 0.08 + 0.92;
  return vec3<f32>(0.95, 0.94, 0.92) * iridescence;
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_esfera_decorativa(p: vec3<f32>, s: vec3<f32>) -> f32 {
  return length(p) - s.x;
}
`,
};
