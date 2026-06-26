import type { Concept } from '../index.js';

/**
 * piedra_volcanica_s13 — PROTOTIPO de Fase 2 (T-221, gate Sonido 13).
 *
 * Clon de `piedra_volcanica` con el MISMO look, pero el detalle es una función
 * CONTINUA del footprint del pixel (fbm_continuous) en vez de fbm de 5 octavas fijas.
 * Sirve para el A/B `?s13=on|off`: Gato ve si el detalle continuo "se nota y gusta".
 * NO migra al original (eso es T-224 si el gate pasa). No usar en producción aún.
 */
export const piedraVolcanicaS13: Concept = {
  id: 'piedra_volcanica_s13',
  category: 'universal',
  description:
    'EXPERIMENTAL (T-221, gate Sonido 13): piedra_volcanica con detalle CONTINUO ' +
    '(fbm_continuous por footprint). Prototipo del A/B — no usar en producción hasta T-224.',
  signature: {
    baseColor: [0.38, 0.3, 0.22],
    roughness: 0.95,
    normalVariation: 0.7,
    audioReactivity: 0,
  },
  // Seed nuevo (1019): los 1001..1018 están congelados (B11) y nunca se renumeran.
  seed: 1019,
  wgsl: /* wgsl */ `
fn mat_piedra_volcanica_s13(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  // Footprint del pixel ≈ proyección angular de un pixel a la distancia del punto.
  // pixelAngle = 2/resY absorbe el fov del raymarcher (prototipo; T-222 lo formaliza).
  let dist = length(p - u.camPos);
  let footWorld = dist * (2.0 / max(u.resolution.y, 1.0));
  let cap = max(u.quality.w, 8.0); // prototipo: permite más detalle de cerca que el fijo-5
  // Mismo look que piedra_volcanica; el detalle de la piedra y los glifos escala con la distancia.
  let stone = fbm_continuous(p * 3.5, footWorld * 3.5, 2.0, cap);
  let glyph = step(0.65, fbm_continuous(p * vec3<f32>(2.0, 4.0, 2.0), footWorld * 3.0, 1.5, cap));
  let base = mix(vec3<f32>(0.32, 0.25, 0.19), vec3<f32>(0.45, 0.36, 0.26), stone);
  return base - glyph * vec3<f32>(0.1, 0.08, 0.06);
}
`,
};
