import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * T-025 — Pared de concreto pulido industrial.
 *
 * Base gris claro/oscuro modulada por `darkness`, con speckle FBM y manchas
 * sutiles. Para lofts, oficinas, parking, lobbies modernos.
 *
 * Params:
 *   - darkness (0..1): qué tan oscuro el gris base. Default 0.5.
 *   - roughness (0..1): cantidad de speckle visible. Default 0.3.
 */
export const paredConcretoPulido: Concept = {
  id: 'pared_concreto_pulido',
  category: 'wall',
  description: 'Concreto pulido industrial — gris speckled con manchas sutiles. Loft / oficina / parking.',
  paramsSchema: z.object({
    darkness: z.number().min(0).max(1),
    roughness: z.number().min(0).max(1),
  }),
  defaults: { darkness: 0.5, roughness: 0.3 },
  wgsl: /* wgsl */ `
fn mat_pared_concreto_pulido(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let darkness = matParams.pared_concreto_pulido_darkness;
  let roughness = matParams.pared_concreto_pulido_roughness;
  let base = mix(0.78, 0.42, darkness);
  let speckle = noise3(p * 80.0) * roughness * 0.12;
  let stain = fbm(p * 2.5, 3) * 0.05;
  let val = clamp(base - stain - speckle, 0.0, 1.0);
  return vec3<f32>(val * 1.00, val * 0.99, val * 0.97);
}
`,
};
