import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * T-029 — Bronce cobrizo pulido con shimmer.
 *
 * Color cálido base + shimmer animado por `u.time` que da sensación de
 * reflejo dinámico (sin tener que hacer ray-traced reflections reales).
 * NO es audio-reactive (esa propiedad la lleva metal_dorado_pulido).
 *
 * Params:
 *   - shimmer (0..1): intensidad del brillo animado. Default 0.5.
 */
export const metalBroncePulido: Concept = {
  id: 'metal_bronce_pulido',
  category: 'object',
  description: 'Bronce cobrizo cálido con shimmer animado — herrajes, candelabros, decoración premium.',
  paramsSchema: z.object({
    shimmer: z.number().min(0).max(1),
  }),
  defaults: { shimmer: 0.5 },
  wgsl: /* wgsl */ `
fn mat_metal_bronce_pulido(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let shimmer = matParams.metal_bronce_pulido_shimmer;
  let glint = noise3(p * 18.0 + vec3<f32>(u.time * 0.15)) * shimmer * 0.18;
  let base = vec3<f32>(0.74, 0.46, 0.22);
  return base + vec3<f32>(glint, glint * 0.85, glint * 0.6);
}
`,
};
