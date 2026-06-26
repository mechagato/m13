import type { Concept } from '../index.js';

export const piedraVolcanica: Concept = {
  id: 'piedra_volcanica',
  category: 'universal',
  description: 'Piedra volcánica oscura con relieves. Templos, prehispánico, dramático.',
  // FR-2.2 — mix (0.32,0.25,0.19)↔(0.45,0.36,0.26) → dominante ≈ (0.38,0.30,0.22). fbm 5 octavas + glifos step. Sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.38, 0.3, 0.22],
    roughness: 0.95,
    normalVariation: 0.7,
    audioReactivity: 0,
  },
  seed: 1014,
  wgsl: /* wgsl */ `
fn mat_piedra_volcanica(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  // T-224: detalle continuo (Sonido 13) — octavas según el footprint del pixel.
  let fp = pixelFootprint(p);
  let stone = fbm_detail(p * 3.5, fp * 3.5, 2.0, 5);
  // F7: el footprint del glyph usa el factor de escala MÁXIMO por eje (Y=4) para acotar
  // por la frecuencia dominante. Umbral 0.72 recalibrado al rango normalizado del fbm.
  let glyph = step(0.72, fbm_detail(p * vec3<f32>(2.0, 4.0, 2.0), fp * 4.0, 1.5, 3));
  let base = mix(vec3<f32>(0.32, 0.25, 0.19), vec3<f32>(0.45, 0.36, 0.26), stone);
  return base - glyph * vec3<f32>(0.1, 0.08, 0.06);
}
`,
};
