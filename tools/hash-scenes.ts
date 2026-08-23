/**
 * hash-scenes.ts (T-227) — baseline de hashes WGSL por escena.
 *
 * Para cada escena de `packages/examples/public/scenes/*.m13`: parse → compile →
 * SHA-256 del WGSL ensamblado. Escribe el baseline a `m13-spec/scene-hashes.json`.
 *
 * En CI corre como drift-guard (mismo patrón que gen:schema / export-concepts): si un
 * cambio del compiler altera el WGSL de una escena sin actualizar el baseline, el
 * `git diff --exit-code` del JSON falla → regresión visual atrapada antes de mergear.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScene } from '../packages/runtime/src/parser/index.js';
import { compileScene, hashWgsl } from '../packages/runtime/src/compiler/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = resolve(__dirname, '../packages/examples/public/scenes');
const OUT = resolve(__dirname, '../m13-spec/scene-hashes.json');

// Solo v0.1 — el baseline T-227 congela el contrato pre-temporal (ver hash-regression.test.ts).
const files = readdirSync(SCENES_DIR)
  .filter((f) => f.endsWith('.m13'))
  .filter((f) => {
    const yaml = readFileSync(resolve(SCENES_DIR, f), 'utf8');
    return parseScene(yaml, { silent: true }).version === '0.1';
  })
  .sort();

const hashes: Record<string, string> = {};
for (const f of files) {
  const yaml = readFileSync(resolve(SCENES_DIR, f), 'utf8');
  const compiled = compileScene(parseScene(yaml, { silent: true }));
  hashes[f] = await hashWgsl(compiled.wgsl);
}

writeFileSync(OUT, JSON.stringify(hashes, null, 2) + '\n');
console.log(`[hash-scenes] ${OUT} · ${files.length} escenas`);
