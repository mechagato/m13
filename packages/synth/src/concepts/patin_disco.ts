import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * Patín disco 70s/80s (concepto geométrico SDF original).
 * 70s/80s disco quad skate (original SDF geometric concept).
 *
 * Silueta: bota alta y chunky, plataforma gruesa, caña ancha. Más volumen que el quad clásico.
 * Silhouette: tall chunky boot, thick platform, wide cuff. More volume than the classic quad.
 *
 * Uso / Usage:
 *   - id: patin_disco_vitrina
 *     kind: concept
 *     concept: patin_disco
 *     position: [0, -1.5, 0]
 *     scale: [0.34, 0.34, 0.34]
 *
 * Params:
 *   - bootHeight (0.15..0.7): altura de la caña alta. Default 0.55.
 *   - wheelScale (0.5..1.8): escala de ruedas. Default 1.05.
 *   - plateSpread (0.12..0.4): separación. Default 0.26.
 */
export const patinDisco: Concept = {
  id: 'patin_disco',
  category: 'object_geo',
  description: 'Patín disco 70s/80s: bota alta chunky y plataforma — silueta SDF original, look dorado.',
  // FR-2.2 — metal_dorado_pulido: base vec3(0.82,0.65,0.18), shimmer fbm 0.3, pulse = audioAmp*0.45.
  signature: {
    baseColor: [0.82, 0.65, 0.18],
    roughness: 0.35,
    normalVariation: 0.35,
    audioReactivity: 0.45,
  },
  seed: 1020,
  paramsSchema: z.object({
    bootHeight: z.number().min(0.15).max(0.7),
    wheelScale: z.number().min(0.5).max(1.8),
    plateSpread: z.number().min(0.12).max(0.4),
  }),
  defaults: { bootHeight: 0.55, wheelScale: 1.05, plateSpread: 0.26 },
  wgsl: /* wgsl */ `
fn mat_patin_disco(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let pulse = audioAmp * 0.45;
  let shimmer = fbm(p * 8.0 + vec3<f32>(u.time * 0.3, 0.0, 0.0), 4);
  let base = vec3<f32>(0.82, 0.65, 0.18);
  return base * (0.7 + shimmer * 0.3 + pulse);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_patin_disco(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let bootH = matParams.patin_disco_bootHeight;
  let wS = matParams.patin_disco_wheelScale;
  let spread = matParams.patin_disco_plateSpread;
  let sx = s.x;
  let sy = s.y;
  let sz = s.z;
  // Bota alta / tall chunky boot — más ancha y con flare en la caña.
  let boot = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 0.50, sz * 0.02),
    vec3<f32>(sx * 0.26, sy * bootH * 0.50, sz * 0.38),
    sx * 0.06
  );
  let flare = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 1.05, -sz * 0.06),
    vec3<f32>(sx * 0.32, sy * bootH * 0.22, sz * 0.24),
    sx * 0.05
  );
  let toe = sdRoundBox(
    p - vec3<f32>(0.0, sy * bootH * 0.18, sz * 0.36),
    vec3<f32>(sx * 0.22, sy * bootH * 0.18, sz * 0.16),
    sx * 0.05
  );
  // Plataforma gruesa / thick disco platform.
  let platform = sdRoundBox(
    p - vec3<f32>(0.0, sy * 0.02, sz * 0.04),
    vec3<f32>(sx * 0.24, sy * 0.08, sz * 0.46),
    sx * 0.02
  );
  let wr = sy * 0.10 * wS;
  let wh = sx * 0.08;
  let wz = sz * 0.24;
  let wx = sx * spread;
  let wy = -sy * 0.06 - wr * 0.15;
  let wFL = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z - wz), wh, wr);
  let wFR = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z - wz), wh, wr);
  let wBL = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z + wz), wh, wr);
  let wBR = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z + wz), wh, wr);
  let stop = sdSphere(p - vec3<f32>(0.0, -sy * 0.02, sz * 0.52), sy * 0.08);
  var d = opUnion(boot, flare);
  d = opUnion(d, toe);
  d = opUnion(d, platform);
  d = opUnion(d, wFL);
  d = opUnion(d, wFR);
  d = opUnion(d, wBL);
  d = opUnion(d, wBR);
  d = opUnion(d, stop);
  return d;
}
`,
};