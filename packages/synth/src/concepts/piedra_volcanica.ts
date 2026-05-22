import type { Concept } from '../index.js';

export const piedraVolcanica: Concept = {
  id: 'piedra_volcanica',
  category: 'universal',
  description: 'Piedra volcánica oscura con relieves. Templos, prehispánico, dramático.',
  wgsl: /* wgsl */ `
fn mat_piedra_volcanica(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let stone = fbm(p * 3.5, 5);
  let glyph = step(0.65, fbm(p * vec3<f32>(2.0, 4.0, 2.0), 3));
  let base = mix(vec3<f32>(0.32, 0.25, 0.19), vec3<f32>(0.45, 0.36, 0.26), stone);
  return base - glyph * vec3<f32>(0.1, 0.08, 0.06);
}
`,
};
