import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const FIXTURES_DIR = resolve(here, '../../fixtures');
export const EXAMPLES_SCENES_DIR = resolve(here, '../../../../packages/examples/public/scenes');

export function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), 'utf8');
}

export function listExampleScenes(): string[] {
  return readdirSync(EXAMPLES_SCENES_DIR)
    .filter((file) => file.endsWith('.m13'))
    .map((file) => resolve(EXAMPLES_SCENES_DIR, file));
}
