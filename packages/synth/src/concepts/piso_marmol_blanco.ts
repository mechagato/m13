import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * T-027 — Piso de mármol blanco pulido.
 *
 * Variante floor-optimizada del `marmol_blanco_vetas` original: vetas
 * más sutiles y veteado más fino para que el piso no compita visualmente
 * con los objetos de la escena.
 *
 * Params:
 *   - veinIntensity (0..1): contraste de las vetas. Default 0.3.
 */
export const pisoMarmolBlanco: Concept = {
  id: 'piso_marmol_blanco',
  category: 'floor',
  description: 'Mármol blanco pulido — galería, lobby, baño premium. Vetas sutiles.',
  paramsSchema: z.object({
    veinIntensity: z.number().min(0).max(1),
  }),
  defaults: { veinIntensity: 0.3 },
  wgsl: /* wgsl */ `
fn mat_piso_marmol_blanco(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let veinIntensity = matParams.piso_marmol_blanco_veinIntensity;
  let v = fbm(p * 1.5, 5);
  let veinSharp = smoothstep(0.42, 0.50, v) * veinIntensity;
  let base = vec3<f32>(0.95, 0.94, 0.92);
  let vein = vec3<f32>(0.58, 0.58, 0.62);
  return mix(base, vein, veinSharp * 0.55);
}
`,
};
