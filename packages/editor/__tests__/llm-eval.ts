/**
 * llm-eval.ts — Suite de evaluación LLM del editor m13 (T-052/T-053, criterio SC-4).
 *
 * Por cada prompt de prompts.json:
 *   1. Llama al phi-llm-gateway (localhost:9095) con el system prompt del editor
 *   2. Extrae el YAML de la respuesta (fence ```yaml o texto crudo)
 *   3. Valida: parseScene (YAML + schema Zod) → compileScene (WGSL sin throw)
 *
 * Un prompt PASA solo si pasa los 3 pasos. Target SC-4: ≥70% en 3 corridas consecutivas.
 *
 * Uso: pnpm --filter @m13/editor test:llm
 *      (o: npx tsx packages/editor/__tests__/llm-eval.ts)
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseScene } from '../../runtime/src/parser/index.js';
import { compileScene } from '../../runtime/src/compiler/index.js';
import { SYSTEM_PROMPT, FEW_SHOT_MESSAGES } from '../lib/system-prompt.js';

const GATEWAY_URL = process.env.M13_LLM_GATEWAY ?? 'http://localhost:9095/llm/chat';
const GATEWAY_TOKEN = process.env.M13_LLM_TOKEN ?? 'phi-dev-local';
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.3;

interface EvalPrompt {
  id: string;
  category: string;
  prompt: string;
}

interface EvalResult {
  id: string;
  category: string;
  pass: boolean;
  failStep?: 'gateway' | 'yaml-schema' | 'compile';
  reason?: string;
}

interface GatewayResponse {
  content: Array<{ type: string; text?: string }>;
  model?: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const prompts: EvalPrompt[] = JSON.parse(readFileSync(join(here, 'prompts.json'), 'utf8'));

async function callGateway(userPrompt: string): Promise<string> {
  const body = JSON.stringify({
    model: 'auto',
    system: SYSTEM_PROMPT,
    messages: [...FEW_SHOT_MESSAGES, { role: 'user', content: userPrompt }],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    cache: false, // crítico: sin cache para que las 3 corridas sean independientes
  });

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
    try {
      const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GATEWAY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      if (res.status >= 500) {
        lastErr = new Error(`gateway HTTP ${res.status}`);
        continue; // backoff y reintento
      }
      if (!res.ok) {
        throw new Error(`gateway HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as GatewayResponse;
      const text = data.content
        ?.filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('');
      if (!text) throw new Error('respuesta sin bloque de texto');
      return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`gateway agotó reintentos: ${String(lastErr)}`);
}

/** Extrae YAML de la respuesta: fence ```yaml ... ``` o el texto completo. */
function extractYaml(text: string): string {
  const fence = text.match(/```(?:yaml|yml)?\s*\n([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  return text.trim();
}

function shortError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/\s+/g, ' ').slice(0, 140);
}

async function evalPrompt(p: EvalPrompt): Promise<EvalResult> {
  let raw: string;
  try {
    raw = await callGateway(p.prompt);
  } catch (err) {
    return { id: p.id, category: p.category, pass: false, failStep: 'gateway', reason: shortError(err) };
  }

  const yamlText = extractYaml(raw);

  // PASO 1 + 2: YAML parseable + schema Zod (parseScene hace ambos)
  let scene;
  try {
    scene = parseScene(yamlText, { silent: true });
  } catch (err) {
    return { id: p.id, category: p.category, pass: false, failStep: 'yaml-schema', reason: shortError(err) };
  }

  // PASO 3: compila a WGSL sin throw
  try {
    compileScene(scene);
  } catch (err) {
    return { id: p.id, category: p.category, pass: false, failStep: 'compile', reason: shortError(err) };
  }

  return { id: p.id, category: p.category, pass: true };
}

async function main(): Promise<void> {
  console.log(`m13 LLM eval — ${prompts.length} prompts → ${GATEWAY_URL}\n`);
  const results: EvalResult[] = [];

  for (const p of prompts) {
    const r = await evalPrompt(p);
    results.push(r);
    const mark = r.pass ? 'PASS' : `FAIL [${r.failStep}]`;
    console.log(`  ${r.id.padEnd(14)} ${r.category.padEnd(14)} ${mark}${r.reason ? ` — ${r.reason}` : ''}`);
  }

  const passed = results.filter((r) => r.pass).length;
  const rate = (100 * passed) / results.length;

  console.log('\nPor categoría:');
  const cats = [...new Set(results.map((r) => r.category))];
  for (const c of cats) {
    const sub = results.filter((r) => r.category === c);
    const ok = sub.filter((r) => r.pass).length;
    console.log(`  ${c.padEnd(14)} ${ok}/${sub.length}`);
  }

  console.log(`\nTOTAL: ${passed}/${results.length} → ${rate.toFixed(1)}% ${rate >= 70 ? '✅ (≥70%)' : '❌ (<70%)'}`);
  process.exitCode = rate >= 70 ? 0 : 1;
}

main().catch((err) => {
  console.error('eval fatal:', err);
  process.exitCode = 2;
});
