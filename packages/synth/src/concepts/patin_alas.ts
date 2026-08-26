import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * Patín con alas en la caña (concepto geométrico SDF original).
 * Quad skate with cuff wings (original SDF geometric concept).
 *
 * Silueta distinta: dos alas volumétricas en la caña, barridas atrás — no es un flag plano.
 * Distinct silhouette: two volumetric wings on the cuff, swept back — not a flat flag.
 *
 * Uso / Usage:
 *   - id: patin_alas_vitrina
 *     kind: concept
 *     concept: patin_alas
 *     position: [0, -1.55, 0]
 *     scale: [0.33, 0.33, 0.33]
 *
 * Params:
 *   - bootHeight (0.15..0.7): altura de caña. Default 0.42.
 *   - wheelScale (0.5..1.8): escala de ruedas. Default 1.0.
 *   - plateSpread (0.12..0.4): separación. Default 0.22.
 */
export const patinAlas: Concept = {
  id: 'patin_alas',
  category: 'object_geo',
  description: 'Patín quad con alas volumétricas en la caña — silueta SDF original, bronce pulido.',
  // FR-2.2 — metal_bronce_pulido: base vec3(0.74,0.46,0.22), glint noise 0.18; sin audioAmp.
  signature: {
    baseColor: [0.74, 0.46, 0.22],
    roughness: 0.25,
    normalVariation: 0.2,
    audioReactivity: 0,
  },
  seed: 1021,
  paramsSchema: z.object({
    bootHeight: z.number().min(0.15).max(0.7),
    wheelScale: z.number().min(0.5).max(1.8),
    plateSpread: z.number().min(0.12).max(0.4),
  }),
  defaults: { bootHeight: 0.42, wheelScale: 1.0, plateSpread: 0.22 },
  wgsl: /* wgsl */ `
fn mat_patin_alas(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let glint = noise3(p * 18.0 + vec3<f32>(u.time * 0.15, 0.0, 0.0)) * 0.18;
  let base = vec3<f32>(0.74, 0.46, 0.22);
  return base + vec3<f32>(glint, glint * 0.85, glint * 0.6);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_patin_alas(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let bootH = matParams.patin_alas_bootHeight;
  let wS = matParams.patin_alas_wheelScale;
  let spread = matParams.patin_alas_plateSpread;
  let sx = s.x;
  let sy = s.y;
  let sz = s.z;
  let boot = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 0.52, sz * 0.03),
    vec3<f32>(sx * 0.19, sy * bootH * 0.52, sz * 0.34),
    sx * 0.04
  );
  let toe = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 0.20, sz * 0.32),
    vec3<f32>(sx * 0.15, sy * bootH * 0.20, sz * 0.14),
    sx * 0.035
  );
  let cuff = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 1.02, -sz * 0.08),
    vec3<f32>(sx * 0.17, sy * bootH * 0.16, sz * 0.20),
    sx * 0.03
  );
  // Alas volumétricas / volumetric wings — shear en Z, salen en X y atrás, no planas.
  let wingL_p = vec3<f32>(
    p.x + sx * 0.28,
    p.y - sy * bootH * 0.92,
    p.z + sz * 0.18 + (p.x + sx * 0.28) * 0.55
  );
  let wingR_p = vec3<f32>(
    p.x - sx * 0.28,
    p.y - sy * bootH * 0.92,
    p.z + sz * 0.18 - (p.x - sx * 0.28) * 0.55
  );
  let wingL = sdRoundBox(wingL_p, vec3<f32>(sx * 0.22, sy * 0.035, sz * 0.16), sx * 0.02);
  let wingR = sdRoundBox(wingR_p, vec3<f32>(sx * 0.22, sy * 0.035, sz * 0.16), sx * 0.02);
  // Segunda pluma / second feather — más alta, más corta, da volumen de ala.
  let tipL = sdRoundBox(
    p - vec3<f32>(-sx * 0.42, sy * bootH * 1.12, -sz * 0.28),
    vec3<f32>(sx * 0.12, sy * 0.028, sz * 0.14),
    sx * 0.015
  );
  let tipR = sdRoundBox(
    p - vec3<f32>(sx * 0.42, sy * bootH * 1.12, -sz * 0.28),
    vec3<f32>(sx * 0.12, sy * 0.028, sz * 0.14),
    sx * 0.015
  );
  let plate = sdRoundBox(
    p - vec3<f32>(0.0, -sy * 0.02, sz * 0.02),
    vec3<f32>(sx * 0.17, sy * 0.032, sz * 0.40),
    sx * 0.01
  );
  let wr = sy * 0.09 * wS;
  let wh = sx * 0.065;
  let wz = sz * 0.25;
  let wx = sx * spread;
  let wy = -sy * 0.02 - wr;
  let wFL = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z - wz), wh, wr);
  let wFR = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z - wz), wh, wr);
  let wBL = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z + wz), wh, wr);
  let wBR = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z + wz), wh, wr);
  let stop = sdSphere(p - vec3<f32>(0.0, -sy * 0.03, sz * 0.46), sy * 0.065);
  var d = opUnion(boot, toe);
  d = opUnion(d, cuff);
  d = opUnion(d, wingL);
  d = opUnion(d, wingR);
  d = opUnion(d, tipL);
  d = opUnion(d, tipR);
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