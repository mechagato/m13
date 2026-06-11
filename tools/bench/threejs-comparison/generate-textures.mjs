// generate-textures.mjs — T-062
// Genera las texturas procedurales que Three.js necesita como ASSETS para
// replicar visualmente sala_galeria.m13 (yeso blanco, mármol con vetas, bronce).
//
// Método: ruido fractal value-noise en JS puro → buffer RGB raw → sharp → JPEG q80 512×512.
// Este es el punto central del benchmark: m13 describe estos materiales con ~30 bytes
// de YAML semántico ("concept: piso_marmol_blanco"); un motor tradicional necesita
// archivos de textura reales descargados por el cliente.
//
// Uso: node generate-textures.mjs   (escribe en ./textures/)

import sharp from 'sharp';
import { mkdirSync } from 'fs';

const SIZE = 512;

// ---- value noise determinista (sin deps) ----
function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function smooth(t) { return t * t * (3 - 2 * t); }
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, octaves = 5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2(x * freq, y * freq);
    amp *= 0.5; freq *= 2;
  }
  return val;
}

function makeTexture(name, pixelFn) {
  const buf = Buffer.alloc(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = pixelFn(x / SIZE, y / SIZE);
      const i = (y * SIZE + x) * 3;
      buf[i] = Math.max(0, Math.min(255, r * 255));
      buf[i + 1] = Math.max(0, Math.min(255, g * 255));
      buf[i + 2] = Math.max(0, Math.min(255, b * 255));
    }
  }
  return sharp(buf, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .jpeg({ quality: 80 })
    .toFile(`textures/${name}.jpg`)
    .then((info) => console.log(`textures/${name}.jpg — ${info.size} bytes`));
}

mkdirSync('textures', { recursive: true });

await Promise.all([
  // pared_yeso_blanco — yeso con grano sutil
  makeTexture('yeso_blanco', (u, v) => {
    const n = fbm(u * 24, v * 24, 5);
    const base = 0.92 + (n - 0.5) * 0.06;
    return [base, base, base * 1.005];
  }),

  // piso_marmol_blanco — mármol pulido, vetas suaves (veinIntensity 0.25)
  makeTexture('marmol_blanco', (u, v) => {
    const warp = fbm(u * 4, v * 4, 4);
    const vein = Math.abs(Math.sin((u + warp * 1.5) * 14 + v * 3));
    const veinMask = Math.pow(1 - vein, 8) * 0.25;
    const base = 0.94 - veinMask * 0.5 + (fbm(u * 40, v * 40, 3) - 0.5) * 0.02;
    return [base, base, base * 1.01];
  }),

  // marmol_blanco_vetas — vetas más marcadas (cubo derecho)
  makeTexture('marmol_vetas', (u, v) => {
    const warp = fbm(u * 5, v * 5, 4);
    const vein = Math.abs(Math.sin((u + warp * 2.2) * 10 + v * 5));
    const veinMask = Math.pow(1 - vein, 6) * 0.6;
    const base = 0.93 - veinMask * 0.55;
    return [base, base * 0.99, base];
  }),

  // metal_bronce_pulido — bronce con shimmer anisotrópico
  makeTexture('bronce', (u, v) => {
    const n = fbm(u * 60, v * 6, 4); // estiramiento horizontal = pulido
    const l = 0.55 + (n - 0.5) * 0.25;
    return [l * 1.0, l * 0.62, l * 0.32];
  }),
]);

console.log('Listo. Texturas en ./textures/');
