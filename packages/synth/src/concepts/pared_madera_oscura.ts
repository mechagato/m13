import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * T-026 — Pared de madera oscura (boiserie, despacho, biblioteca).
 *
 * Vetas senoidales horizontales tintadas en café oscuro, con grain noise
 * de alta frecuencia para textura cercana.
 *
 * Params:
 *   - darkness (0..1): factor que oscurece la base. Default 0.6.
 *   - grainScale (1..20): frecuencia de las vetas. Default 8.
 */
export const paredMaderaOscura: Concept = {
  id: 'pared_madera_oscura',
  category: 'wall',
  description: 'Madera oscura con vetas — despacho, biblioteca, boiserie clásica.',
  // FR-2.2 — base (0.36,0.22,0.12) oscurecida por darkness 0.6 → dominante ≈ (0.25,0.15,0.08).
  // Vetas senoidales + grain noise. Sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.25, 0.15, 0.08],
    roughness: 0.55,
    normalVariation: 0.4,
    audioReactivity: 0,
  },
  seed: 1011,
  paramsSchema: z.object({
    darkness: z.number().min(0).max(1),
    grainScale: z.number().min(1).max(20),
  }),
  defaults: { darkness: 0.6, grainScale: 8 },
  wgsl: /* wgsl */ `
fn mat_pared_madera_oscura(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let darkness = matParams.pared_madera_oscura_darkness;
  let grainScale = matParams.pared_madera_oscura_grainScale;
  let wobble = noise3(p * 5.0) * 1.5;
  let veta = sin(p.y * grainScale + wobble) * 0.5 + 0.5;
  let grain = noise3(p * 60.0) * 0.06;
  let base = vec3<f32>(0.36, 0.22, 0.12);
  let dark = mix(base, base * 0.35, darkness);
  return dark * (1.0 + veta * 0.18) - vec3<f32>(grain);
}
`,
};
