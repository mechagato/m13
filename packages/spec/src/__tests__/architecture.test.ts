import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(here, '..');

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return listTs(full);
    }
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

const FORBIDDEN_IMPORT =
  /(?:from|import)\s*\(?\s*['"][^'"]*(?:\/renderer(?:\/|['"])|\/compiler(?:\/|['"])|@m13\/runtime['"])/;

describe('arquitectura — cero renderer/compiler', () => {
  it('src de @m13/spec no importa renderer, compiler ni el barrel @m13/runtime', () => {
    const files = listTs(SRC_DIR);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(FORBIDDEN_IMPORT);
      expect(src, file).not.toMatch(/\bcompileScene\b/);
    }
  });

  it('package.json no depende de @m13/runtime', () => {
    const pkg = JSON.parse(readFileSync(resolve(SRC_DIR, '../package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['@m13/runtime']).toBeUndefined();
    expect(pkg.devDependencies?.['@m13/runtime']).toBeUndefined();
  });
});
