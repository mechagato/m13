import type { Concept } from '../index.js';

export const marmolBlancoVetas: Concept = {
  id: 'marmol_blanco_vetas',
  category: 'universal',
  description: 'Mármol blanco con vetas grises procedurales. Galería, lujo, baños.',
  wgsl: /* wgsl */ `
fn mat_marmol_blanco_vetas(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let vein = fbm(p * vec3<f32>(2.0, 0.5, 2.0), 4);
  let v = smoothstep(0.4, 0.55, vein);
  return mix(vec3<f32>(0.92, 0.91, 0.88), vec3<f32>(0.55, 0.55, 0.58), v * 0.6);
}
`,
};
