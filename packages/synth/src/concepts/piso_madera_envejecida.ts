import type { Concept } from '../index.js';

export const pisoMaderaEnvejecida: Concept = {
  id: 'piso_madera_envejecida',
  category: 'floor',
  description: 'Madera con vetas senoidales + grain noise. Cálida, residencial.',
  // FR-2.2 — mix (0.32,0.18,0.10)↔(0.52,0.35,0.20) → dominante ≈ (0.42,0.27,0.15). Vetas + grain fbm. Sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.42, 0.27, 0.15],
    roughness: 0.7,
    normalVariation: 0.5,
    audioReactivity: 0,
  },
  seed: 1016,
  wgsl: /* wgsl */ `
fn mat_piso_madera_envejecida(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let wood = sin(p.x * 4.0 + noise3(p * 1.5)) * 0.5 + 0.5;
  let grain = fbm(p * vec3<f32>(20.0, 5.0, 20.0), 3);
  return mix(vec3<f32>(0.32, 0.18, 0.10), vec3<f32>(0.52, 0.35, 0.20), wood) + vec3<f32>(grain * 0.05);
}
`,
};
