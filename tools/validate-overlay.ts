/**
 * validate-overlay — overlay v0.3 + parser visual v0.1/v0.2. Sin compileScene, sin GPU.
 *
 * Uso: npx tsx tools/validate-overlay.ts <ruta/escena.m13>
 * Exit 0 si el overlay valida y el doc stripeado pasa parseScene/validateScene.
 * Hermano de tools/validate-scene.ts (ése sí compila WGSL).
 */
import { readFileSync } from 'node:fs';
import { parseOverlay } from '../packages/spec/src/index.js';
import { validateScene } from '../packages/runtime/src/parser/index.js';

const file = process.argv[2];
if (!file) {
  console.error('uso: npx tsx tools/validate-overlay.ts <escena.m13>');
  process.exit(1);
}

try {
  const yaml = readFileSync(file, 'utf8');
  const result = parseOverlay(yaml, { strict: true });
  validateScene(result.visual, { strict: true, silent: true });
  console.log(
    `VALID · overlay v${result.overlay.version} → visual v${String(result.visual.version)} · npc ${result.overlay.npc.length} · missions ${result.overlay.missions.length} · ${Buffer.byteLength(yaml)} bytes`,
  );
} catch (err) {
  console.error((err as Error).message ?? String(err));
  process.exit(1);
}
