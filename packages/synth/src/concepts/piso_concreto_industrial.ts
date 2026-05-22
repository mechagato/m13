import type { Concept } from '../index.js';

export const pisoConcretoIndustrial: Concept = {
  id: 'piso_concreto_industrial',
  category: 'floor',
  description: 'Concreto pulido con speckle y leves manchas. Loft, garaje, lab.',
  wgsl: /* wgsl */ `
fn mat_piso_concreto_industrial(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let speckle = fbm(p * 15.0, 4);
  let stain = fbm(p * 2.0, 3) * 0.1;
  let v = 0.41 + speckle * 0.15 - stain;
  return vec3<f32>(v + 0.01, v, v - 0.01);
}
`,
};
