import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * Patín triciclo / foot-cycle 1897 (concepto geométrico SDF original).
 * Tricycle foot-cycle skate, 1897-inspired (original SDF geometric concept).
 *
 * Silueta: 3 ruedas — 1 grande adelante, 2 chicas atrás — horquilla y cuadro propios.
 * Silhouette: 3 wheels — 1 large front, 2 small rear — original fork and frame. Not a mesh copy.
 *
 * Uso / Usage:
 *   - id: patin_triciclo_vitrina
 *     kind: concept
 *     concept: patin_triciclo
 *     position: [0, -1.5, 0]
 *     scale: [0.34, 0.34, 0.40]
 *
 * Params:
 *   - bootHeight (0.15..0.7): caña. Default 0.32.
 *   - wheelScale (0.5..1.8): rueda delantera grande. Default 1.25.
 *   - plateSpread (0.12..0.4): vía trasera. Default 0.28.
 */
export const patinTriciclo: Concept = {
  id: 'patin_triciclo',
  category: 'object_geo',
  description: 'Patín triciclo estilo foot-cycle 1897: 3 ruedas, horquilla propia — silueta SDF original.',
  // FR-2.2 — cuero_vintage dominante vec3(0.32,0.18,0.10) + rust*0.35 hacia (0.62,0.30,0.13)
  // → típico ≈ (0.35, 0.20, 0.11). Poros + rust fbm. Sin audioAmp.
  signature: {
    baseColor: [0.35, 0.2, 0.11],
    roughness: 0.78,
    normalVariation: 0.5,
    audioReactivity: 0,
  },
  seed: 1024,
  paramsSchema: z.object({
    bootHeight: z.number().min(0.15).max(0.7),
    wheelScale: z.number().min(0.5).max(1.8),
    plateSpread: z.number().min(0.12).max(0.4),
  }),
  defaults: { bootHeight: 0.32, wheelScale: 1.25, plateSpread: 0.28 },
  wgsl: /* wgsl */ `
fn mat_patin_triciclo(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let pore = noise3(p * 40.0);
  let rust = smoothstep(0.45, 0.75, fbm(p * 5.0, 4));
  let leather = vec3<f32>(0.32, 0.18, 0.10) + vec3<f32>(pore * 0.08);
  let rustColor = vec3<f32>(0.62, 0.30, 0.13);
  return mix(leather, rustColor, rust * 0.35);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_patin_triciclo(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let bootH = matParams.patin_triciclo_bootHeight;
  let wS = matParams.patin_triciclo_wheelScale;
  let spread = matParams.patin_triciclo_plateSpread;
  let sx = s.x;
  let sy = s.y;
  let sz = s.z;
  let boot = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 0.55, -sz * 0.06),
    vec3<f32>(sx * 0.18, sy * bootH * 0.55, sz * 0.28),
    sx * 0.04
  );
  let cuff = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 1.02, -sz * 0.14),
    vec3<f32>(sx * 0.16, sy * bootH * 0.14, sz * 0.18),
    sx * 0.03
  );
  // Cuadro / frame — barra larga hacia adelante.
  let frame = sdRoundBox(
    p - vec3<f32>(0.0, sy * 0.04, sz * 0.12),
    vec3<f32>(sx * 0.05, sy * 0.03, sz * 0.42),
    sx * 0.012
  );
  // Horquilla delantera / front fork.
  let forkL = sdRoundBox(
    p - vec3<f32>(-sx * 0.08, -sy * 0.06, sz * 0.46),
    vec3<f32>(sx * 0.02, sy * 0.16, sz * 0.03),
    sx * 0.008
  );
  let forkR = sdRoundBox(
    p - vec3<f32>(sx * 0.08, -sy * 0.06, sz * 0.46),
    vec3<f32>(sx * 0.02, sy * 0.16, sz * 0.03),
    sx * 0.008
  );
  // Rueda delantera grande / large front wheel (eje X).
  let wrF = sy * 0.16 * wS;
  let wrR = sy * 0.08 * wS;
  let wFront = sdCylinder(
    vec3<f32>(p.y + wrF * 0.15, p.x, p.z - sz * 0.50),
    sx * 0.04,
    wrF
  );
  // Dos ruedas traseras / two small rear wheels.
  let wx = sx * spread;
  let wyR = -sy * 0.04 - wrR;
  let wBL = sdCylinder(vec3<f32>(p.y - wyR, p.x - wx, p.z + sz * 0.22), sx * 0.055, wrR);
  let wBR = sdCylinder(vec3<f32>(p.y - wyR, p.x + wx, p.z + sz * 0.22), sx * 0.055, wrR);
  // Eje trasero / rear axle.
  let axle = sdCylinder(
    vec3<f32>(p.z + sz * 0.22, p.y - wyR, p.x),
    sx * spread,
    sy * 0.018
  );
  var d = opUnion(boot, cuff);
  d = opUnion(d, frame);
  d = opUnion(d, forkL);
  d = opUnion(d, forkR);
  d = opUnion(d, wFront);
  d = opUnion(d, wBL);
  d = opUnion(d, wBR);
  d = opUnion(d, axle);
  return d;
}
`,
};