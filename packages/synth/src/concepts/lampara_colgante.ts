import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * T-032 — Lámpara colgante con emisión inline.
 *
 * Cilindro suspendido + material brillante warm-white que simula emisión
 * (sin ser physically-based — el shader `shade()` aún aplica diffuse encima,
 * pero el factor 1+glow lo lleva por encima del tonemap, dando look HDR).
 *
 * **Limitación v0.1:** no añade contribución de luz real al resto de la escena.
 * Es solo apariencia de "objeto que brilla". Para luz real desde la lámpara,
 * habría que mover `light.position` del scene a esta ubicación (workaround manual).
 *
 * El SDF es un cilindro corto suspendido del techo (escala-Y controla longitud).
 *
 * Params:
 *   - glowIntensity (0..2): qué tan "encendida" se ve. Default 0.8.
 *   - length (0.05..2): longitud del cilindro. Default 0.4.
 */
export const lamparaColgante: Concept = {
  id: 'lampara_colgante',
  category: 'object_geo',
  description: 'Lámpara colgante emisiva — luz cálida inline (sin contribución real a la escena, v0.1).',
  paramsSchema: z.object({
    glowIntensity: z.number().min(0).max(2),
    length: z.number().min(0.05).max(2),
  }),
  defaults: { glowIntensity: 0.8, length: 0.4 },
  wgsl: /* wgsl */ `
fn mat_lampara_colgante(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let glow = matParams.lampara_colgante_glowIntensity;
  let warm = vec3<f32>(1.0, 0.85, 0.55);
  // Factor (1 + glow) lleva el color por encima del rango lineal — el tonemapping
  // en shade() lo comprime y produce un look "encendido"/HDR.
  return warm * (1.0 + glow);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_lampara_colgante(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let length_ = matParams.lampara_colgante_length;
  let radius = s.x;
  let d = vec2<f32>(length(p.xz) - radius, abs(p.y) - length_);
  return min(max(d.x, d.y), 0.0) + length(max(d, vec2<f32>(0.0)));
}
`,
};
