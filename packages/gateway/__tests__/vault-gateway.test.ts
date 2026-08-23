import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SceneVault } from '../src/vault.js';
import { createGatewayApp } from '../src/app.js';

const MIN_YAML = `
version: "0.1"
name: vault_test
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;

describe('SceneVault', () => {
  let dir: string;
  let vault: SceneVault;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'm13-vault-'));
    vault = new SceneVault(dir, 'http://player.test', 'http://gw.test');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('publish → resolve with token; wrong token denied', () => {
    const pub = vault.publish({ yaml: MIN_YAML, name: 'vault_test', classification: 'S2' });
    expect(pub.player_url).toContain('?p=');
    expect(pub.player_url).toContain('token=');
    const ok = vault.resolve(pub.id, pub.token);
    expect(ok?.yaml).toBe(MIN_YAML);
    expect(vault.resolve(pub.id, 'bad-token')).toBeNull();
  });

  it('revoke blocks resolve', () => {
    const pub = vault.publish({ yaml: MIN_YAML, name: 'vault_test', classification: 'S3' });
    expect(vault.revoke(pub.id, pub.token)).toBe(true);
    expect(vault.resolve(pub.id, pub.token)).toBeNull();
  });

  it('listMeta never includes yaml', () => {
    vault.publish({ yaml: MIN_YAML, name: 'vault_test', classification: 'S2', org_id: 'acme' });
    const meta = vault.listMeta('acme');
    expect(meta).toHaveLength(1);
    expect(JSON.stringify(meta)).not.toContain('pared_yeso');
  });
});

describe('gateway HTTP', () => {
  let dir: string;
  let app: ReturnType<typeof createGatewayApp>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'm13-gw-'));
    const vault = new SceneVault(dir, 'http://localhost:5173', 'http://127.0.0.1:8788');
    app = createGatewayApp({ vault, corsOrigins: ['*'] });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('POST /v1/publish then GET scene with token', async () => {
    const pubRes = await app.request('/v1/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Org-Id': 'acme' },
      body: JSON.stringify({ yaml: MIN_YAML, classification: 'S2' }),
    });
    expect(pubRes.status).toBe(200);
    const pub = (await pubRes.json()) as {
      id: string;
      token: string;
      player_url: string;
      mode: string;
    };
    expect(pub.mode).toBe('tokenized');
    expect(pub.player_url).toContain(pub.id);

    const getRes = await app.request(`/v1/scenes/${pub.id}?token=${pub.token}`);
    expect(getRes.status).toBe(200);
    const body = (await getRes.json()) as { yaml: string; name: string };
    expect(body.name).toBe('vault_test');
    expect(body.yaml).toContain('pared_yeso_blanco');

    const denied = await app.request(`/v1/scenes/${pub.id}?token=nope`);
    expect(denied.status).toBe(404);
  });

  it('rejects invalid scene without storing', async () => {
    const res = await app.request('/v1/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml: 'not: valid: m13', classification: 'S2' }),
    });
    expect(res.status).toBe(400);
  });

  it('serves portal html', async () => {
    const res = await app.request('/portal/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Publicar escena');
  });
});
