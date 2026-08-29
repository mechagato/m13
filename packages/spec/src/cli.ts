/**
 * CLI overlay — valida módulos v0.3. Cero parser visual, renderer o GPU.
 *
 * Uso: pnpm --filter @m13/spec validate <escena.m13>
 * Para strip + parser visual: tools/validate-overlay.ts
 */
import { readFileSync } from 'node:fs';
import { parseOverlay } from './overlay.js';

const file = process.argv[2];
if (!file) {
  console.error('uso: pnpm --filter @m13/spec validate <escena.m13>');
  process.exit(1);
}

try {
  const yaml = readFileSync(file, 'utf8');
  const result = parseOverlay(yaml, { strict: true });
  console.log(
    `VALID · overlay v${result.overlay.version} · npc ${result.overlay.npc.length} · missions ${result.overlay.missions.length} · warnings ${result.warnings.length} · ${Buffer.byteLength(yaml)} bytes`,
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
