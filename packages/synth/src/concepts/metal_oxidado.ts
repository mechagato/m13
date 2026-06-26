import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * T-028 — Metal con óxido naranja sobre base gris.
 *
 * Mancha procedural FBM controla la cantidad de óxido visible.
 * Para esculturas industriales, fierros viejos, ambientes post-apocalípticos.
 *
 * Params:
 *   - rustAmount (0..1): cuánto del metal está oxidado. Default 0.5.
 */
export const metalOxidado: Concept = {
  id: 'metal_oxidado',
  category: 'object',
  description: 'Metal con óxido naranja — esculturas industriales, fierros viejos, ambientes rústicos.',
  // FR-2.2 — mezcla gris (0.55) ↔ óxido (0.62,0.30,0.13) con rustAmount default 0.5: dominante ≈ (0.58,0.44,0.34).
  // fbm rust mask + speckle alta frecuencia. Sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.58, 0.44, 0.34],
    roughness: 0.8,
    normalVariation: 0.6,
    audioReactivity: 0,
  },
  seed: 1008,
  paramsSchema: z.object({
    rustAmount: z.number().min(0).max(1),
  }),
  defaults: { rustAmount: 0.5 },
  wgsl: /* wgsl */ `
fn mat_metal_oxidado(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let rustAmount = matParams.metal_oxidado_rustAmount;
  // T-224: mancha de óxido con detalle continuo.
  let fp = pixelFootprint(p);
  let rust = smoothstep(0.4, 0.7, fbm_detail(p * 6.0, fp * 6.0, 2.0, 4));
  let metal = vec3<f32>(0.55, 0.55, 0.55);
  let rustColor = vec3<f32>(0.62, 0.30, 0.13);
  let speckle = noise3(p * 70.0) * 0.05;
  return mix(metal, rustColor, rust * rustAmount) - vec3<f32>(speckle);
}
`,
};
