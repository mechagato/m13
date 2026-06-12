/**
 * validate-scene — valida un archivo .m13 contra el parser + compiler reales.
 *
 * Uso: npx tsx tools/validate-scene.ts <ruta/escena.m13>
 * Exit 0 si la escena parsea y compila; exit 1 con el error exacto si no.
 * Lo consume m13-live/kinect-bridge (depth2m13.py) y cualquier pipeline externo.
 */
import { readFileSync } from 'node:fs';
import { parseScene, compileScene } from '../packages/runtime/src/index.js';

const file = process.argv[2];
if (!file) {
  console.error('uso: npx tsx tools/validate-scene.ts <escena.m13>');
  process.exit(1);
}

try {
  const yaml = readFileSync(file, 'utf8');
  const scene = parseScene(yaml);
  compileScene(scene);
  console.log(`VALID · ${scene.objects?.length ?? 0} objetos · ${Buffer.byteLength(yaml)} bytes`);
} catch (err) {
  console.error((err as Error).message ?? String(err));
  process.exit(1);
}
