import type { Concept } from '../index.js';

export const marmolBlancoVetas: Concept = {
  id: 'marmol_blanco_vetas',
  category: 'universal',
  description: 'Mármol blanco con vetas grises procedurales. Galería, lujo, baños.',
  // FR-2.2 — base blanco vec3(0.92,0.91,0.88) con vetas fbm gris (mix hasta 0.6); sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.92, 0.91, 0.88],
    roughness: 0.3,
    normalVariation: 0.4,
    audioReactivity: 0,
  },
  seed: 1005,
  wgsl: /* wgsl */ `
fn mat_marmol_blanco_vetas(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  // T-224: vetas con detalle continuo (menos shimmer de lejos, más finura de cerca).
  let fp = pixelFootprint(p);
  let vein = fbm_detail(p * vec3<f32>(2.0, 0.5, 2.0), fp * 2.0, 2.0, 4);
  let v = smoothstep(0.4, 0.55, vein);
  return mix(vec3<f32>(0.92, 0.91, 0.88), vec3<f32>(0.55, 0.55, 0.58), v * 0.6);
}
`,
};
