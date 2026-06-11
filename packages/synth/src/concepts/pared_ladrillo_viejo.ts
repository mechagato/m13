import type { Concept } from '../index.js';

export const paredLadrilloViejo: Concept = {
  id: 'pared_ladrillo_viejo',
  category: 'wall',
  description: 'Ladrillo rojizo con mortero procedural. Industrial mexicano. Audio-reactivo.',
  // FR-2.2 — ladrillo dominante ≈ (0.48,0.26,0.19) (mix 0.55..0.42 rojizo) + mortero gris.
  // audioAmp modula brickScale (4.0 + audioAmp*3.0) → reactividad moderada en el patrón.
  // Seed reservado para variación per-instancia en Fase 2 (WGSL aún no lo consume).
  signature: {
    baseColor: [0.48, 0.26, 0.19],
    roughness: 0.9,
    normalVariation: 0.7,
    audioReactivity: 0.4,
  },
  seed: 1010,
  wgsl: /* wgsl */ `
fn mat_pared_ladrillo_viejo(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let brickScale = 4.0 + audioAmp * 3.0;
  let brick = fbm(p * brickScale, 4);
  let mortarH = fract(p.y * 3.0);
  let mortarV = fract(p.x * 1.5 + step(0.5, mortarH) * 0.5);
  let mortar = clamp(step(0.92, mortarH) + step(0.95, mortarV), 0.0, 1.0);
  let brickColor = mix(vec3<f32>(0.55, 0.30, 0.22), vec3<f32>(0.42, 0.22, 0.16), brick);
  let mortarColor = vec3<f32>(0.35, 0.32, 0.28);
  return mix(brickColor, mortarColor, mortar);
}
`,
};
