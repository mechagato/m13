import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScene } from '../../parser/index.js';
import { compileScene, hashWgsl } from '../index.js';

/**
 * T-227 — regresión de hash WGSL por escena.
 *
 * Recompila cada escena del demo y compara su SHA-256 contra el baseline congelado en
 * `m13-spec/scene-hashes.json`. Si un cambio del compiler altera el WGSL de una escena
 * sin actualizar el baseline (`pnpm gen:hashes`), este test falla → no-regresión blindada.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = resolve(__dirname, '../../../../examples/public/scenes');
const BASELINE = resolve(__dirname, '../../../../../m13-spec/scene-hashes.json');

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<string, string>;
const files = readdirSync(SCENES_DIR)
  .filter((f) => f.endsWith('.m13'))
  .sort();

describe('compiler — regresión de hash por escena (T-227)', () => {
  it('el baseline cubre exactamente las escenas del demo', () => {
    expect(Object.keys(baseline).sort()).toEqual(files);
  });

  for (const f of files) {
    it(`${f} mantiene su hash WGSL congelado`, async () => {
      const compiled = compileScene(parseScene(readFileSync(resolve(SCENES_DIR, f), 'utf8'), { silent: true }));
      expect(await hashWgsl(compiled.wgsl)).toBe(baseline[f]);
    });
  }
});
