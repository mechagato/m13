import type { Concept } from '../index.js';

export const metalDoradoPulido: Concept = {
  id: 'metal_dorado_pulido',
  category: 'object',
  description: 'Dorado mate audio-reactivo con shimmer animado. La "esfera m13".',
  // FR-2.2 — base vec3(0.82,0.65,0.18), shimmer fbm 0.3, pulse = audioAmp*0.6 (muy reactivo).
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.82, 0.65, 0.18],
    roughness: 0.35,
    normalVariation: 0.35,
    audioReactivity: 0.6,
  },
  seed: 1007,
  wgsl: /* wgsl */ `
fn mat_metal_dorado_pulido(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let pulse = audioAmp * 0.6;
  let shimmer = fbm(p * 8.0 + vec3<f32>(u.time * 0.3, 0.0, 0.0), 4);
  let base = vec3<f32>(0.82, 0.65, 0.18);
  return base * (0.7 + shimmer * 0.3 + pulse);
}
`,
};
