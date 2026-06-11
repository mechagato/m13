import type { Concept } from '../index.js';

export const cueroVintage: Concept = {
  id: 'cuero_vintage',
  category: 'object',
  description: 'Cuero envejecido con poros y leve crackling. Sillones, libros, sofás.',
  // FR-2.2 — base vec3(0.32,0.18,0.10), poros noise + cracks step; sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.32, 0.18, 0.1],
    roughness: 0.75,
    normalVariation: 0.45,
    audioReactivity: 0,
  },
  seed: 1002,
  wgsl: /* wgsl */ `
fn mat_cuero_vintage(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let pore = noise3(p * 40.0);
  let crack = step(0.85, fbm(p * 10.0, 4));
  let base = vec3<f32>(0.32, 0.18, 0.10);
  return base + vec3<f32>(pore * 0.08) - crack * vec3<f32>(0.1, 0.06, 0.03);
}
`,
};
