/**
 * pwa-offline-test — T-204: verifica que el demo abre OFFLINE tras primera carga.
 *
 * Sirve dist/ con vite preview, carga la página (el SW cachea), corta la red,
 * recarga y verifica que la app sigue viva. Requiere puppeteer (stack global:
 * NODE_PATH=$(npm root -g) node tools/pwa-offline-test.mjs).
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

const PORT = 4173;
const URL_ = `http://localhost:${PORT}/`;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: new URL('../packages/examples', import.meta.url).pathname,
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 2500));

let exit = 1;
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();

  // 1ª carga: registrar SW y poblar cache
  await page.goto(URL_, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await new Promise((r) => setTimeout(r, 1500)); // dar tiempo al runtime caching
  const swActive = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    return !!reg?.active;
  });
  console.log(swActive ? '✓ service worker activo' : '✗ SW no registrado');

  // Modo offline + reload
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  const title = await page.title();
  const hasApp = await page.evaluate(() => !!document.getElementById('appWindow'));
  console.log(hasApp ? `✓ OFFLINE OK — la app cargó sin red (title: "${title}")` : '✗ offline FALLÓ');

  exit = swActive && hasApp ? 0 : 1;
} finally {
  await browser.close();
  server.kill();
}
console.log(exit === 0 ? '\n✓ PWA OFFLINE TEST PASS' : '\n✗ PWA OFFLINE TEST FAIL');
process.exit(exit);
