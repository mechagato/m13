import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * Patín racing (concepto geométrico SDF original).
 * Racing low-cut skate (original SDF geometric concept).
 *
 * Silueta: bota baja, placa larga, ruedas más grandes. Perfil de velocidad.
 * Silhouette: low boot, long plate, larger wheels. Speed profile.
 *
 * Uso / Usage:
 *   - id: patin_racing_vitrina
 *     kind: concept
 *     concept: patin_racing
 *     position: [0, -1.52, 0]
 *     scale: [0.34, 0.30, 0.42]
 *
 * Params:
 *   - bootHeight (0.15..0.7): caña baja. Default 0.22.
 *   - wheelScale (0.5..1.8): ruedas grandes. Default 1.4.
 *   - plateSpread (0.12..0.4): vía. Default 0.18.
 */
export const patinRacing: Concept = {
  id: 'patin_racing',
  category: 'object_geo',
  description: 'Patín racing: bota baja, placa larga, ruedas grandes — silueta SDF original, vidrio esmerilado.',
  // FR-2.2 — vidrio_esmerilado: mix frost(0.92,0.94,0.96)→clear(0.78,0.84,0.88) clarity 0.5 → ≈ (0.85,0.89,0.92).
  // Frost noise 0.18 + micro fbm 0.08. Sin audioAmp.
  signature: {
    baseColor: [0.85, 0.89, 0.92],
    roughness: 0.35,
    normalVariation: 0.35,
    audioReactivity: 0,
  },
  seed: 1023,
  paramsSchema: z.object({
    bootHeight: z.number().min(0.15).max(0.7),
    wheelScale: z.number().min(0.5).max(1.8),
    plateSpread: z.number().min(0.12).max(0.4),
  }),
  defaults: { bootHeight: 0.22, wheelScale: 1.4, plateSpread: 0.18 },
  wgsl: /* wgsl */ `
fn mat_patin_racing(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let frost = noise3(p * 35.0) * 0.18;
  let micro = fbm(p * 80.0, 2) * 0.08;
  let baseClear = vec3<f32>(0.78, 0.84, 0.88);
  let baseFrost = vec3<f32>(0.92, 0.94, 0.96);
  let albedo = mix(baseFrost, baseClear, 0.5);
  return albedo + vec3<f32>(frost - micro);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_patin_racing(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let bootH = matParams.patin_racing_bootHeight;
  let wS = matParams.patin_racing_wheelScale;
  let spread = matParams.patin_racing_plateSpread;
  let sx = s.x;
  let sy = s.y;
  let sz = s.z;
  // Bota baja / low-cut racing boot.
  let boot = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 0.55, sz * 0.02),
    vec3<f32>(sx * 0.17, sy * bootH * 0.55, sz * 0.32),
    sx * 0.04
  );
  let toe = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 0.28, sz * 0.30),
    vec3<f32>(sx * 0.14, sy * bootH * 0.22, sz * 0.16),
    sx * 0.03
  );
  // Placa larga / long racing plate — se alarga en Z.
  let plate = sdRoundBox(
    p - vec3<f32>(0.0, -sy * 0.01, sz * 0.04),
    vec3<f32>(sx * 0.15, sy * 0.028, sz * 0.58),
    sx * 0.01
  );
  // Ruedas grandes / larger wheels, wheelbase largo.
  let wr = sy * 0.12 * wS;
  let wh = sx * 0.06;
  let wz = sz * 0.38;
  let wx = sx * spread;
  let wy = -sy * 0.01 - wr * 0.35;
  let wFL = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z - wz), wh, wr);
  let wFR = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z - wz), wh, wr);
  let wBL = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z + wz), wh, wr);
  let wBR = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z + wz), wh, wr);
  var d = opUnion(boot, toe);
  d = opUnion(d, plate);
  d = opUnion(d, wFL);
  d = opUnion(d, wFR);
  d = opUnion(d, wBL);
  d = opUnion(d, wBR);
  return d;
}
`,
};