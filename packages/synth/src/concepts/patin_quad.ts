import { z } from 'zod';
import type { Concept } from '../index.js';

/**
 * Patín quad (concepto geométrico / geometric concept).
 *
 * SDF union: bota (round_box + puntera) + placa + 4 ruedas (cilindros).
 * Boot + plate + 4 wheels. Size comes from the object's `scale` in `.m13`.
 * `wheelScale` agranda o reduce las ruedas respecto al resto del patín.
 *
 * Uso:
 *   - id: patin_vitrina
 *     kind: concept
 *     concept: patin_quad
 *     position: [0, -1.95, 0]
 *     scale: [0.22, 0.18, 0.32]
 *
 * Params:
 *   - wheelScale (0.5..1.8): escala de las 4 ruedas. Default 1.0.
 */
export const patinQuad: Concept = {
  id: 'patin_quad',
  category: 'object_geo',
  description: 'Patín quad — bota de cuero, placa y 4 ruedas metálicas (SDF union).',
  // FR-2.2 — cuero dominante vec3(0.36,0.20,0.11), metal vec3(0.58,0.60,0.64) en cara inferior/lados.
  // Roughness alta de cuero. Sin audioAmp. Seed 1019 (siguiente libre; no renumerar 1001-1018).
  signature: {
    baseColor: [0.36, 0.2, 0.11],
    roughness: 0.78,
    normalVariation: 0.4,
    audioReactivity: 0,
  },
  seed: 1019,
  paramsSchema: z.object({
    wheelScale: z.number().min(0.5).max(1.8),
  }),
  defaults: { wheelScale: 1.0 },
  wgsl: /* wgsl */ `
fn mat_patin_quad(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  // Leather boot (brown, high grain) vs metal plate/wheels (cooler, underside + sides).
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
  let ws = matParams.patin_quad_wheelScale;

  // Bota / boot: cuerpo redondeado + puntera
  let bootBody = sdRoundBox(
    p - vec3<f32>(0.0, s.y * 0.22, -s.z * 0.06),
    vec3<f32>(s.x * 0.40, s.y * 0.50, s.z * 0.46),
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

  // 4 ruedas / wheels: cilindros con eje en X
  let wr = min(s.y, s.z) * 0.20 * ws;
  let wh = s.x * 0.11;
  let wx = s.x * 0.40;
  let wy = -s.y * 0.58;
  let wz = s.z * 0.54;

  let w1 = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z - wz), wh, wr);
  let w2 = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z - wz), wh, wr);
  let w3 = sdCylinder(vec3<f32>(p.y - wy, p.x - wx, p.z + wz), wh, wr);
  let w4 = sdCylinder(vec3<f32>(p.y - wy, p.x + wx, p.z + wz), wh, wr);
  let wheels = opUnion(opUnion(w1, w2), opUnion(w3, w4));

  return opUnion(opUnion(boot, plate), wheels);
}
`,
};
