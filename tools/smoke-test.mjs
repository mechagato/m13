#!/usr/bin/env node
/**
 * smoke-test.mjs — Smoke test post-deploy del demo público de m13 (T-077).
 *
 * Corre contra el sitio vivo y verifica:
 *   1. GET / responde 200, es HTML y trae los markers 'm13' y 'canvas'.
 *   2. Todos los assets /assets/*.js y /assets/*.css referenciados en el HTML responden 200.
 *   3. Cada escena .m13 responde 200 y pesa < 50KB (criterio SC-2 de Fase 1).
 *
 * Uso:
 *   node tools/smoke-test.mjs              # target por defecto: https://motor13.neonodos.com
 *   node tools/smoke-test.mjs <url-base>   # override del target
 *
 * Node 20 puro (fetch global), cero dependencias. Exit code 0 solo si TODO pasa.
 */

const DEFAULT_TARGET = 'https://motor13.neonodos.com';
const REQUEST_TIMEOUT_MS = 15_000;
const SCENE_MAX_BYTES = 50 * 1024; // criterio SC-2: cada escena < 50KB

// Lista de escenas copiada del campo `file` de cada entrada de SCENES en
// packages/examples/src/scenes.ts — si agregas/quitas escenas ahí, actualiza aquí.
const SCENE_FILES = [
  '/scenes/chichen_itza.m13',
  '/scenes/sala_galeria.m13',
  '/scenes/cocina_industrial.m13',
  '/scenes/oficina_neonodos.m13',
  '/scenes/templo_mexica.m13',
  '/scenes/_concepts_showcase.m13',
  '/scenes/flowcad_asm_lineal.m13',
  '/scenes/flowcad_asm_con_isla.m13',
  '/scenes/flowcad_asm_en_l.m13',
  '/scenes/flowcad_asm_en_u.m13',
  '/scenes/flowcad_asm_escuadra.m13',
];

const baseUrl = (process.argv[2] ?? DEFAULT_TARGET).replace(/\/+$/, '');

/** Resultados acumulados para la tabla final: { name, pass, detail } */
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const mark = pass ? '✓' : '✗';
  console.log(`  ${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  return pass;
}

/**
 * GET con timeout de 15s vía AbortController.
 * Regresa { ok, status, contentType, body } — body como ArrayBuffer.
 * Si truena (red/timeout) regresa { ok: false, error }.
 */
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const body = await res.arrayBuffer();
    return {
      ok: true,
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      body,
    };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? `timeout ${REQUEST_TIMEOUT_MS}ms` : (err?.message ?? String(err));
    return { ok: false, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

/** Check 1: el index responde, es HTML y trae los markers esperados. Regresa el HTML o null. */
async function checkIndex() {
  console.log('\n[1/3] Index /');
  const res = await fetchWithTimeout(`${baseUrl}/`);

  if (!res.ok) {
    record('GET /', false, res.error);
    return null;
  }

  const statusOk = res.status === 200;
  const isHtml = res.contentType.includes('text/html');
  const html = new TextDecoder().decode(res.body);
  const hasM13 = html.includes('m13');
  const hasCanvas = html.includes('canvas');

  record('GET / → 200', statusOk, `status ${res.status}`);
  record('content-type html', isHtml, res.contentType || '(sin content-type)');
  record("marker 'm13' en HTML", hasM13);
  record("marker 'canvas' en HTML", hasCanvas);

  return statusOk && isHtml ? html : null;
}

/** Check 2: cada asset /assets/*.js y /assets/*.css del HTML responde 200. */
async function checkAssets(html) {
  console.log('\n[2/3] Assets /assets/*.js + /assets/*.css');

  if (html === null) {
    record('assets', false, 'sin HTML del index — no se pueden extraer assets');
    return;
  }

  // Extrae paths tipo /assets/index-XXXX.js o /assets/index-XXXX.css de src=/href=
  const assetPaths = [...new Set(
    [...html.matchAll(/\/assets\/[A-Za-z0-9._/-]+\.(?:js|css)\b/g)].map((m) => m[0]),
  )];

  if (assetPaths.length === 0) {
    record('assets referenciados', false, 'el HTML no referencia ningún /assets/*.js ni /assets/*.css');
    return;
  }

  for (const path of assetPaths) {
    const res = await fetchWithTimeout(`${baseUrl}${path}`);
    if (!res.ok) {
      record(`GET ${path}`, false, res.error);
    } else {
      record(`GET ${path}`, res.status === 200, `status ${res.status} · ${formatKB(res.body.byteLength)}`);
    }
  }
}

/** Check 3: cada escena .m13 responde 200 y pesa < 50KB (SC-2). */
async function checkScenes() {
  console.log(`\n[3/3] Escenas .m13 (${SCENE_FILES.length}) — cada una 200 y < ${formatKB(SCENE_MAX_BYTES)}`);

  for (const path of SCENE_FILES) {
    const res = await fetchWithTimeout(`${baseUrl}${path}`);
    if (!res.ok) {
      record(`GET ${path}`, false, res.error);
      continue;
    }
    const statusOk = res.status === 200;
    const sizeOk = res.body.byteLength < SCENE_MAX_BYTES;
    // Guard contra el SPA fallback de Cloudflare Pages: una escena inexistente
    // regresa index.html con 200 — eso NO cuenta como escena válida.
    const isHtmlFallback = res.contentType.includes('text/html');
    const detail = [
      `status ${res.status}`,
      formatKB(res.body.byteLength),
      ...(sizeOk ? [] : ['≥ 50KB, viola SC-2']),
      ...(isHtmlFallback ? ['content-type html — SPA fallback, la escena no existe'] : []),
    ].join(' · ');
    record(`GET ${path}`, statusOk && sizeOk && !isHtmlFallback, detail);
  }
}

function printSummary() {
  const nameWidth = Math.max(...results.map((r) => r.name.length), 'CHECK'.length);
  const line = '─'.repeat(nameWidth + 12);

  console.log(`\n${line}`);
  console.log(`${'CHECK'.padEnd(nameWidth)}  RESULTADO`);
  console.log(line);
  for (const r of results) {
    console.log(`${r.name.padEnd(nameWidth)}  ${r.pass ? 'PASS ✓' : 'FAIL ✗'}`);
  }
  console.log(line);

  const failed = results.filter((r) => !r.pass).length;
  const total = results.length;
  if (failed === 0) {
    console.log(`\n✓ SMOKE TEST PASS — ${total}/${total} checks OK contra ${baseUrl}`);
  } else {
    console.log(`\n✗ SMOKE TEST FAIL — ${failed}/${total} checks fallaron contra ${baseUrl}`);
  }
  return failed === 0;
}

// PWA (T-204): manifest y service worker servidos correctamente
async function checkPwa() {
  console.log('\n[4/4] PWA — manifest + service worker');
  for (const path of ['/manifest.webmanifest', '/sw.js', '/icons/icon-192.png']) {
    const res = await fetchWithTimeout(baseUrl + path);
    if (!res.ok) {
      record(`GET ${path}`, false, res.error);
      continue;
    }
    // El SPA fallback de Pages regresa index.html con 200 — eso es FAIL aquí
    const isHtmlFallback = res.contentType.includes('text/html');
    record(`GET ${path}`, res.status === 200 && !isHtmlFallback, `${res.status} ${res.contentType}`);
  }
}

async function main() {
  console.log(`m13 smoke test post-deploy · target: ${baseUrl}`);

  const html = await checkIndex();
  await checkAssets(html);
  await checkScenes();
  await checkPwa();

  const allPass = printSummary();
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error('✗ Error inesperado en el smoke test:', err);
  process.exit(1);
});
