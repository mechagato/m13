#!/usr/bin/env tsx
/**
 * MCP Playground — local HTML to test one MCP at a time with DeepSeek tools.
 *
 *   pnpm playground
 *   open http://127.0.0.1:8790
 *
 * Env:
 *   DEEPSEEK_API_KEY
 *   DEEPSEEK_BASE_URL (optional)
 *   DEEPSEEK_MODEL (optional, default deepseek-chat)
 *   FLOWCAD_BACKEND_URL (default http://127.0.0.1:8787)
 *   COMP3D_API_URL (default http://127.0.0.1:8080)
 *   COMP3D_ROOT (default ../11-proy3-qro)
 *   M13_GATEWAY_URL (optional, for publish_m13_scene)
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCP_ORDER, openaiToolsFor, type McpId } from './providers.js';
import { executeTool, probeProviders } from './adapters.js';
import { runDeepseekChat, type ChatMessage } from './deepseek.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '../public');
const port = Number(process.env.M13_PLAYGROUND_PORT ?? 8790);

const app = new Hono();
app.use('*', cors());

function pub(name: string): string {
  const p = join(PUBLIC, name);
  if (!existsSync(p)) throw new Error(`missing ${name}`);
  return readFileSync(p, 'utf8');
}

app.get('/', (c) => c.html(pub('index.html')));
app.get('/app.js', (c) => c.body(pub('app.js'), 200, { 'Content-Type': 'application/javascript; charset=utf-8' }));
app.get('/style.css', (c) => c.body(pub('style.css'), 200, { 'Content-Type': 'text/css; charset=utf-8' }));

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'm13-playground',
    deepseek_key_present: Boolean(process.env.DEEPSEEK_API_KEY),
    order: MCP_ORDER,
  }),
);

app.get('/api/providers', async (c) => c.json({ providers: await probeProviders() }));

app.get('/api/tools', (c) => {
  const mcp = (c.req.query('mcp') ?? 'm13') as McpId;
  if (!MCP_ORDER.includes(mcp)) return c.json({ error: 'bad_mcp' }, 400);
  return c.json({ mcp, tools: openaiToolsFor(mcp) });
});

app.post('/api/tools/call', async (c) => {
  const body = await c.req.json();
  const mcp = body.mcp as McpId;
  const name = String(body.name ?? '');
  const args = (body.arguments ?? {}) as Record<string, unknown>;
  if (!MCP_ORDER.includes(mcp)) return c.json({ error: 'bad_mcp' }, 400);
  try {
    const result = await executeTool(mcp, name, args);
    return c.json({ ok: true, mcp, name, result });
  } catch (err) {
    return c.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      400,
    );
  }
});

app.post('/api/chat', async (c) => {
  const body = await c.req.json();
  const mcp = (body.mcp ?? 'm13') as McpId;
  if (!MCP_ORDER.includes(mcp)) return c.json({ error: 'bad_mcp' }, 400);
  const messages = (body.messages ?? []) as ChatMessage[];
  try {
    const out = await runDeepseekChat({
      mcp,
      messages,
      apiKey: body.api_key as string | undefined,
      baseUrl: body.base_url as string | undefined,
      model: body.model as string | undefined,
    });
    return c.json({ ok: true, ...out });
  } catch (err) {
    return c.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      400,
    );
  }
});

serve({ fetch: app.fetch, port }, (info) => {
  console.error(`[playground] http://127.0.0.1:${info.port}`);
  console.error(`[playground] MCP order: ${MCP_ORDER.join(' → ')}`);
  console.error(
    `[playground] DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? 'set' : 'MISSING — pega la key en la UI o exporta env'}`,
  );
});
