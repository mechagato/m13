import type { Concept } from '../index.js';

/**
 * T-034 — Cubo básico (concepto geométrico mínimo).
 *
 * Box neutral. Sin params en v0.1 — usa `scale` del object para
 * dimensiones (vec3 o scalar). Color gris medio. Útil como bloque
 * de construcción de prototipado rápido en `.m13`.
 *
 * Uso:
 *   - id: bloque
 *     kind: concept
 *     concept: cubo_basico
 *     position: [1, -2, 0]
 *     scale: [0.5, 0.5, 0.5]
 */
export const cuboBasico: Concept = {
  id: 'cubo_basico',
  category: 'object_geo',
  description: 'Cubo gris básico — bloque de construcción para prototipado de escenas.',
  // FR-2.2 — signature derivada del WGSL real: base vec3(0.55,0.55,0.58), speckle leve 0.03, sin audioAmp.
  signature: {
    baseColor: [0.55, 0.55, 0.58],
    roughness: 0.7,
    normalVariation: 0.1,
    audioReactivity: 0,
  },
  // Seed procedural (1001 = primero en orden alfabético). Reserva la base para
  // variación per-instancia en Fase 2 — el WGSL aún no lo consume.
  seed: 1001,
  wgsl: /* wgsl */ `
fn mat_cubo_basico(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let n_speckle = noise3(p * 30.0) * 0.03;
  return vec3<f32>(0.55, 0.55, 0.58) - vec3<f32>(n_speckle);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_cubo_basico(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let q = abs(p) - s;
  return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}
`,
};
