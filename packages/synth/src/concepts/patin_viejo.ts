import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * Patín viejo desgastado (concepto geométrico SDF original).
 * Worn vintage skate (original SDF geometric concept).
 *
 * Silueta más baja y chica: bota baja, ruedas desiguales (desgaste), toe stop gastado.
 * Lower, smaller profile: short boot, uneven worn wheels, stubby toe stop.
 *
 * Uso / Usage:
 *   - id: patin_viejo_vitrina
 *     kind: concept
 *     concept: patin_viejo
 *     position: [0, -1.6, 0]
 *     scale: [0.28, 0.28, 0.28]
 *
 * Params:
 *   - bootHeight (0.15..0.7): caña baja. Default 0.26.
 *   - wheelScale (0.5..1.8): ruedas chicas. Default 0.82.
 *   - plateSpread (0.12..0.4): vía estrecha. Default 0.18.
 */
export const patinViejo: Concept = {
  id: 'patin_viejo',
  category: 'object_geo',
  description: 'Patín viejo de perfil bajo, desgastado — silueta SDF original, metal oxidado y cuero.',
  // FR-2.2 — mix(cuero(0.32,0.18,0.10), metal_oxidado≈(0.58,0.44,0.34), 0.65) → ≈ (0.49,0.35,0.26).
  // fbm rust mask + speckle. Sin audioAmp.
  signature: {
    baseColor: [0.49, 0.35, 0.26],
    roughness: 0.8,
    normalVariation: 0.6,
    audioReactivity: 0,
  },
  seed: 1022,
  paramsSchema: z.object({
    bootHeight: z.number().min(0.15).max(0.7),
    wheelScale: z.number().min(0.5).max(1.8),
    plateSpread: z.number().min(0.12).max(0.4),
  }),
  defaults: { bootHeight: 0.26, wheelScale: 0.82, plateSpread: 0.18 },
  wgsl: /* wgsl */ `
fn mat_patin_viejo(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let rust = smoothstep(0.4, 0.7, fbm(p * 6.0, 4));
  let metal = vec3<f32>(0.55, 0.55, 0.55);
  let rustColor = vec3<f32>(0.62, 0.30, 0.13);
  let speckle = noise3(p * 70.0) * 0.05;
  let leather = vec3<f32>(0.32, 0.18, 0.10);
  let worn = mix(metal, rustColor, rust * 0.5) - vec3<f32>(speckle);
  return mix(leather, worn, 0.65);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_patin_viejo(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let bootH = matParams.patin_viejo_bootHeight;
  let wS = matParams.patin_viejo_wheelScale;
  let spread = matParams.patin_viejo_plateSpread;
  let sx = s.x;
  let sy = s.y;
  let sz = s.z;
  // Perfil bajo y chico / low small profile — bota hundida, menos caña.
  let boot = sdRoundBox(
    p - vec3<f32>(0.02 * sx, sy * bootH * 0.48, sz * 0.02),
    vec3<f32>(sx * 0.17, sy * bootH * 0.48, sz * 0.30),
    sx * 0.035
  );
  let toe = sdRoundBox(
    p - vec3<f32>(0.01 * sx, sy * bootH * 0.16, sz * 0.28),
    vec3<f32>(sx * 0.13, sy * bootH * 0.16, sz * 0.12),
    sx * 0.03
  );
  let plate = sdRoundBox(
    p - vec3<f32>(0.0, -sy * 0.015, 0.0),
    vec3<f32>(sx * 0.15, sy * 0.025, sz * 0.34),
    sx * 0.008
  );
  // Ruedas desiguales (desgaste) / uneven worn wheels.
  let wrF = sy * 0.07 * wS;
  let wrB = sy * 0.09 * wS;
  let wh = sx * 0.055;
  let wz = sz * 0.20;
  let wx = sx * spread;
  let wyF = -sy * 0.03 - wrF;
  let wyB = -sy * 0.03 - wrB;
  let wFL = sdCylinder(vec3<f32>(p.y - wyF, p.x - wx, p.z - wz), wh, wrF);
  let wFR = sdCylinder(vec3<f32>(p.y - wyF, p.x + wx * 0.92, p.z - wz), wh, wrF * 0.9);
  let wBL = sdCylinder(vec3<f32>(p.y - wyB, p.x - wx, p.z + wz), wh, wrB);
  let wBR = sdCylinder(vec3<f32>(p.y - wyB, p.x + wx, p.z + wz), wh, wrB * 0.95);
  // Toe stop gastado / stubby worn stop.
  let stop = sdSphere(p - vec3<f32>(0.0, -sy * 0.02, sz * 0.38), sy * 0.045);
  var d = opUnion(boot, toe);
  d = opUnion(d, plate);
  d = opUnion(d, wFL);
  d = opUnion(d, wFR);
  d = opUnion(d, wBL);
  d = opUnion(d, wBR);
  d = opUnion(d, stop);
  return d;
}
`,
};