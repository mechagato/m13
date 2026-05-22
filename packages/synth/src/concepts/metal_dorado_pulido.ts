import type { Concept } from '../index.js';

export const metalDoradoPulido: Concept = {
  id: 'metal_dorado_pulido',
  category: 'object',
  description: 'Dorado mate audio-reactivo con shimmer animado. La "esfera m13".',
  wgsl: /* wgsl */ `
fn mat_metal_dorado_pulido(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let pulse = audioAmp * 0.6;
  let shimmer = fbm(p * 8.0 + vec3<f32>(u.time * 0.3, 0.0, 0.0), 4);
  let base = vec3<f32>(0.82, 0.65, 0.18);
  return base * (0.7 + shimmer * 0.3 + pulse);
}
`,
};
