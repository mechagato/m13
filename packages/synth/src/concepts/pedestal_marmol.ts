import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * T-031 — Pedestal de mármol (concepto geométrico).
 *
 * round_box parametrizable + material de mármol blanco-vetas integrado.
 * El tamaño (width/height/depth) viene del `scale` del object en `.m13`.
 * El parámetro `cornerRadius` controla qué tan redondeadas son las aristas.
 *
 * Uso:
 *   - id: pedestal_centro
 *     kind: concept
 *     concept: pedestal_marmol
 *     position: [0, -2.5, 0]
 *     scale: [0.5, 0.4, 0.5]
 *
 * Params:
 *   - cornerRadius (0..0.5): radio de las aristas redondeadas. Default 0.05.
 */
export const pedestalMarmol: Concept = {
  id: 'pedestal_marmol',
  category: 'object_geo',
  description: 'Pedestal de mármol blanco con aristas redondeadas — base para esculturas, escaparates.',
  // FR-2.2 — base vec3(0.94,0.93,0.88) con vetas grises fbm (mix 0.45). Sin audioAmp.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.94, 0.93, 0.88],
    roughness: 0.3,
    normalVariation: 0.35,
    audioReactivity: 0,
  },
  seed: 1013,
  paramsSchema: z.object({
    cornerRadius: z.number().min(0).max(0.5),
  }),
  defaults: { cornerRadius: 0.05 },
  wgsl: /* wgsl */ `
fn mat_pedestal_marmol(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let vein = fbm(p * 2.2, 4);
  let base = vec3<f32>(0.94, 0.93, 0.88);
  let veinColor = vec3<f32>(0.55, 0.55, 0.60);
  return mix(base, veinColor, smoothstep(0.42, 0.52, vein) * 0.45);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_pedestal_marmol(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let r = matParams.pedestal_marmol_cornerRadius;
  let q = abs(p) - s + vec3<f32>(r);
  return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
`,
};
