/**
 * Hono HTTPS-ready app: publish / fetch / portal / health.
 * YAML bodies are never logged.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { parseScene, compileScene } from '@m13/runtime';
import { SceneVault, type DataClass } from './vault.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

export interface GatewayEnv {
  vault: SceneVault;
  corsOrigins: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '../public');

function isDataClass(v: unknown): v is DataClass {
  return v === 'S0' || v === 'S1' || v === 'S2' || v === 'S3';
}

function portalFile(name: string): string | null {
  const p = join(PUBLIC_DIR, name);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

export function createGatewayApp(env: GatewayEnv): Hono {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return env.corsOrigins[0] ?? '*';
        if (env.corsOrigins.includes('*')) return origin;
        return env.corsOrigins.includes(origin) ? origin : env.corsOrigins[0] ?? '';
      },
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Org-Id'],
    }),
  );

  app.get('/health', (c) => c.json({ ok: true, service: 'm13-gateway', version: '0.1.0' }));

  app.get('/v1/readiness', (c) => {
    env.vault.sweepExpired();
    return c.json({ ok: true, vault: true });
  });

  /** Publish a validated scene; returns tokenized player URL (no YAML in URL). */
  app.post('/v1/publish', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_json' }, 400);
    }
    const yaml = typeof (body as { yaml?: unknown }).yaml === 'string' ? (body as { yaml: string }).yaml : '';
    const classificationRaw = (body as { classification?: unknown }).classification ?? 'S2';
    const org_id =
      c.req.header('x-org-id') ??
      (typeof (body as { org_id?: unknown }).org_id === 'string'
        ? (body as { org_id: string }).org_id
        : 'default');

    if (!yaml.trim()) return c.json({ error: 'yaml_required' }, 400);
    if (!isDataClass(classificationRaw)) return c.json({ error: 'bad_classification' }, 400);

    let name = 'scene';
    try {
      const scene = parseScene(yaml, { silent: true });
      compileScene(scene);
      name = scene.name;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: 'invalid_scene', message }, 400);
    }

    const published = env.vault.publish({
      yaml,
      name,
      classification: classificationRaw,
      org_id,
    });

    return c.json({
      mode: 'tokenized',
      id: published.id,
      scene_hash: published.scene_hash,
      classification: published.classification,
      expires_at: published.expires_at,
      bytes: published.bytes,
      name: published.name,
      player_url: published.player_url,
      fetch_url: published.fetch_url,
      token: published.token,
      ui_card: {
        kind: 'private_share',
        title: name,
        subtitle: 'Link autenticado (sin YAML en la URL)',
        metrics: [
          { label: 'clase', value: published.classification },
          { label: 'expira', value: published.expires_at },
        ],
        cta: { label: 'Abrir inducción', url: published.player_url },
        security_banner: 'Token en la URL actúa como bearer — no reenvíes en canales públicos.',
      },
    });
  });

  /** Fetch YAML with bearer token (query). Used by the player. */
  app.get('/v1/scenes/:id', (c) => {
    const id = c.req.param('id');
    const token = c.req.query('token') ?? '';
    if (!token) return c.json({ error: 'token_required' }, 401);
    const rec = env.vault.resolve(id, token);
    if (!rec) return c.json({ error: 'not_found_or_denied' }, 404);
    return c.json({
      id: rec.id,
      name: rec.name,
      classification: rec.classification,
      scene_hash: rec.scene_hash,
      expires_at: rec.expires_at,
      yaml: rec.yaml,
    });
  });

  app.delete('/v1/scenes/:id', async (c) => {
    const id = c.req.param('id');
    let token = c.req.query('token') ?? '';
    if (!token) {
      try {
        const body = await c.req.json();
        if (typeof (body as { token?: unknown }).token === 'string') {
          token = (body as { token: string }).token;
        }
      } catch {
        /* noop */
      }
    }
    if (!token) return c.json({ error: 'token_required' }, 401);
    const ok = env.vault.revoke(id, token);
    if (!ok) return c.json({ error: 'not_found_or_denied' }, 404);
    return c.json({ ok: true, revoked: true, id });
  });

  app.get('/v1/org/scenes', (c) => {
    const org = c.req.header('x-org-id') ?? c.req.query('org_id') ?? 'default';
    return c.json({ org_id: org, scenes: env.vault.listMeta(org) });
  });

  app.get('/v1/templates/ehs_pasillo', (c) => {
    const file = join(__dirname, '../templates/ehs_pasillo.m13');
    if (!existsSync(file)) return c.json({ error: 'template_missing' }, 404);
    const yaml = readFileSync(file, 'utf8');
    return c.json({
      id: 'ehs_pasillo',
      default_classification: 'S2',
      checklist: [
        'Identificar zona de cruce peatonal / riesgo de atropello',
        'Respetar área restringida señalizada',
        'Confirmar uso de EPP en el punto marcado',
      ],
      yaml,
    });
  });

  // Minimal config portal
  app.get('/', (c) => c.redirect('/portal/'));
  app.get('/portal', (c) => c.redirect('/portal/'));
  app.get('/portal/', (c) => {
    const html = portalFile('index.html');
    if (!html) return c.text('portal missing', 500);
    return c.html(html);
  });
  app.get('/portal/portal.css', (c) => {
    const css = portalFile('portal.css');
    if (!css) return c.text('missing', 404);
    return c.body(css, 200, { 'Content-Type': 'text/css; charset=utf-8' });
  });
  app.get('/portal/portal.js', (c) => {
    const js = portalFile('portal.js');
    if (!js) return c.text('missing', 404);
    return c.body(js, 200, { 'Content-Type': 'application/javascript; charset=utf-8' });
  });

  return app;
}
