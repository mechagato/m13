import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * T-030 — Vidrio esmerilado EMULADO (sin transmisión real).
 *
 * **Limitación documentada:** v0.1 no soporta transmisión/refracción.
 * Emulamos el efecto con noise alto + tinta semi-transparente faked +
 * brillo especular alto (que el shader `shade()` añadirá encima).
 * Para vidrio "real" con transmisión, esperar Fase 3+ (neural materials)
 * o reemplazar con Gaussian Splatting (Fase 4).
 *
 * Params:
 *   - clarity (0..1): qué tan transparente se ve (0 = muy esmerilado, 1 = casi claro). Default 0.5.
 */
export const vidrioEsmerilado: Concept = {
  id: 'vidrio_esmerilado',
  category: 'object',
  description: 'Vidrio esmerilado emulado (sin transmisión real — limitación v0.1). Mamparas, lámparas, ventanas.',
  // FR-2.2 — albedo mix frost(0.92,0.94,0.96)↔clear(0.78,0.84,0.88) con clarity 0.5 → ≈ (0.85,0.89,0.92).
  // Frost noise 0.18 + micro fbm 0.08. Sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.85, 0.89, 0.92],
    roughness: 0.35,
    normalVariation: 0.35,
    audioReactivity: 0,
  },
  seed: 1018,
  paramsSchema: z.object({
    clarity: z.number().min(0).max(1),
  }),
  defaults: { clarity: 0.5 },
  wgsl: /* wgsl */ `
fn mat_vidrio_esmerilado(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let clarity = matParams.vidrio_esmerilado_clarity;
  let frost = noise3(p * 35.0) * 0.18;
  let micro = fbm(p * 80.0, 2) * 0.08;
  let baseClear = vec3<f32>(0.78, 0.84, 0.88);
  let baseFrost = vec3<f32>(0.92, 0.94, 0.96);
  let albedo = mix(baseFrost, baseClear, clarity);
  return albedo + vec3<f32>(frost - micro);
}
`,
};
