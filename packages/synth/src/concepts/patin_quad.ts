import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * Patín quad clásico (concepto geométrico SDF original).
 * Classic quad roller skate (original SDF geometric concept).
 *
 * Silueta: bota + placa + 4 ruedas + toe stop. Cero mesh, cero topología copiada.
 * Silhouette: boot + plate + 4 wheels + toe stop. Zero mesh, zero copied topology.
 *
 * El tamaño global viene del `scale` del object en `.m13`.
 * Global size comes from the object `scale` in `.m13`.
 *
 * Uso / Usage:
 *   - id: patin_vitrina
 *     kind: concept
 *     concept: patin_quad
 *     position: [0, -1.95, 0]
 *     scale: [0.22, 0.18, 0.32]
 *
 * Params:
 *   - bootHeight (0.15..0.7): altura de la caña. Default 0.38.
 *   - wheelScale (0.5..1.8): escala de las 4 ruedas. Default 1.0.
 *   - plateSpread (0.12..0.4): separación lateral de ruedas. Default 0.22.
 */
export const patinQuad: Concept = {
  id: 'patin_quad',
  category: 'object_geo',
  description: 'Patín quad clásico: bota de cuero, placa, 4 ruedas y toe stop — silueta SDF original.',
  // FR-2.2 — cuero dominante vec3(0.36,0.20,0.11); metal placa/ruedas vec3(0.58,0.60,0.64) por normal.
  // Roughness alta de cuero. Sin audioAmp. Seed 1019 (no renumerar 1001-1018).
  signature: {
    baseColor: [0.36, 0.2, 0.11],
    roughness: 0.78,
    normalVariation: 0.4,
    audioReactivity: 0,
  },
  seed: 1019,
  paramsSchema: z.object({
    bootHeight: z.number().min(0.15).max(0.7),
    wheelScale: z.number().min(0.5).max(1.8),
    plateSpread: z.number().min(0.12).max(0.4),
  }),
  defaults: { bootHeight: 0.38, wheelScale: 1.0, plateSpread: 0.22 },
  wgsl: /* wgsl */ `
fn mat_patin_quad(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let pore = noise3(p * 36.0);
  let grain = fbm(p * 8.0, 4);
  let leather = vec3<f32>(0.36, 0.20, 0.11) + vec3<f32>(pore * 0.07) + vec3<f32>(grain * 0.04);
  let metal = vec3<f32>(0.58, 0.60, 0.64) * (0.85 + noise3(p * 22.0) * 0.12);
  let underside = smoothstep(0.25, -0.45, n.y);
  let wheelSide = smoothstep(0.55, 0.85, abs(n.x)) * 0.7;
  let metalMask = clamp(underside + wheelSide, 0.0, 1.0);
  return mix(leather, metal, metalMask);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_patin_quad(p: vec3<f32>, s: vec3<f32>) -> f32 {
  let bootH = matParams.patin_quad_bootHeight;
  let ws = matParams.patin_quad_wheelScale;
  let spread = matParams.patin_quad_plateSpread;

  // Bota / boot: cuerpo redondeado + puntera. bootHeight escala la caña.
  let bh = bootH / 0.38;
  let bootBody = sdRoundBox(
    p - vec3<f32>(0.0, s.y * 0.22 * bh, -s.z * 0.06),
    vec3<f32>(s.x * 0.40, s.y * 0.50 * bh, s.z * 0.46),
    min(s.x, s.y) * 0.14
  );
  let bootToe = sdSphere(
    p - vec3<f32>(0.0, s.y * 0.02, s.z * 0.40),
    min(s.x, s.z) * 0.36
  );
  let boot = opSmoothUnion(bootBody, bootToe, min(s.x, s.y) * 0.10);

  // Placa / plate (chassis)
  let plate = sdBox(
    p - vec3<f32>(0.0, -s.y * 0.34, 0.0),
    vec3<f32>(s.x * 0.26, s.y * 0.07, s.z * 0.88)
  );

  // 4 ruedas / wheels: cilindros con eje en X. plateSpread = vía.
  let wr = min(s.y, s.z) * 0.20 * ws;
  let wh = s.x * 0.11;
  let wx = s.x * spread * 1.82;
  let wy = -s.y * 0.58;
  let wz = s.z * 0.54;

  let w1 = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z - wz), wh, wr);
  let w2 = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z - wz), wh, wr);
  let w3 = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z + wz), wh, wr);
  let w4 = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z + wz), wh, wr);
  let wheels = opUnion(opUnion(w1, w2), opUnion(w3, w4));

  // Toe stop / freno delantero.
  let stop = sdSphere(p - vec3<f32>(0.0, -s.y * 0.42, s.z * 0.92), min(s.x, s.y) * 0.16);

  return opUnion(opUnion(opUnion(boot, plate), wheels), stop);
}
`,
};