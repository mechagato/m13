/**
 * tools/gen-qr.ts — genera el QR del demo público en packages/examples/public/qr.png
 *
 * Uso: `pnpm gen:qr` o `pnpm gen:qr -- --url https://otra.url`
 *
 * El QR se commitea al repo (no se regenera en cada build). Si la URL pública
 * cambia, re-ejecutar este script + commit del PNG nuevo.
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_URL = 'https://motor13.neonodos.com';
const OUTPUT_PATH = resolve(__dirname, '..', 'packages', 'examples', 'public', 'qr.png');

function parseArgs(argv: string[]): { url: string } {
  let url = DEFAULT_URL;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]!;
    }
  }
  return { url };
}

async function main(): Promise<void> {
  const { url } = parseArgs(process.argv.slice(2));

  await QRCode.toFile(OUTPUT_PATH, url, {
    type: 'png',
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0e1014', // m13 HUD dark
      light: '#f5f1e8', // m13 HUD cream
    },
  });

  // eslint-disable-next-line no-console
  console.log(`[gen-qr] wrote ${OUTPUT_PATH} → ${url}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
