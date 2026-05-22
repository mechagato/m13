import type { Concept } from '../index.js';

export const paredYesoBlanco: Concept = {
  id: 'pared_yeso_blanco',
  category: 'wall',
  description: 'Yeso blanco con micro-textura sutil. Limpio, neutral, museo/galería.',
  wgsl: /* wgsl */ `
fn mat_pared_yeso_blanco(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let t = fbm(p * 8.0, 3) * 0.08;
  return vec3<f32>(0.93 - t, 0.92 - t, 0.90 - t);
}
`,
};
