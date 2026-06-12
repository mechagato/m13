/**
 * gen-icons — genera los PNG del manifest PWA desde un SVG del logo m13 (T-201).
 *
 * Uso: npx tsx tools/gen-icons.ts
 * Salida: packages/examples/public/icons/icon-{192,512}.png + favicon-32.png
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Logo m13: cuadro oscuro redondeado, "m" + superíndice "13" en verde neón.
// Texto con monospace genérico (librsvg cae a DejaVu Sans Mono en Ubuntu).
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#050807"/>
  <rect x="8" y="8" width="496" height="496" rx="90" fill="none" stroke="#1c2a21" stroke-width="6"/>
  <text x="96" y="340" font-family="monospace" font-size="240" font-weight="bold" fill="#cfe8d8">m</text>
  <text x="280" y="250" font-family="monospace" font-size="150" font-weight="bold" fill="#2dd476">13</text>
  <rect x="96" y="380" width="320" height="14" rx="7" fill="#2dd476" opacity="0.85"/>
</svg>`;

const outDir = join(import.meta.dirname, '../packages/examples/public/icons');
mkdirSync(outDir, { recursive: true });

const src = sharp(Buffer.from(SVG));
await Promise.all([
  src.clone().resize(512, 512).png().toFile(join(outDir, 'icon-512.png')),
  src.clone().resize(192, 192).png().toFile(join(outDir, 'icon-192.png')),
  src.clone().resize(32, 32).png().toFile(join(outDir, 'favicon-32.png')),
]);
console.log('icons generados en', outDir);
