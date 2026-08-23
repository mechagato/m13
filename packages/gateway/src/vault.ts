/**
 * File-backed scene vault for confidential (S2/S3) publish.
 * Tokens are stored as sha256 hashes; YAML never written to logs.
 */

import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type DataClass = 'S0' | 'S1' | 'S2' | 'S3';

export interface PublishRecord {
  id: string;
  org_id: string;
  classification: DataClass;
  scene_hash: string;
  yaml: string;
  created_at: string;
  expires_at: string;
  token_hash: string;
  revoked: boolean;
  /** Optional label for portal lists (never the full YAML in UI lists) */
  name: string;
  bytes: number;
}

export interface PublishResult {
  id: string;
  token: string;
  scene_hash: string;
  classification: DataClass;
  expires_at: string;
  bytes: number;
  name: string;
  /** Player URL with query token (not cleartext YAML) */
  player_url: string;
  /** Gateway JSON fetch URL */
  fetch_url: string;
}

const TTL_HOURS: Record<DataClass, number> = {
  S0: 168,
  S1: 168,
  S2: 24,
  S3: 1,
};

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function newId(): string {
  return randomBytes(12).toString('base64url');
}

function newToken(): string {
  return randomBytes(24).toString('base64url');
}

export class SceneVault {
  constructor(
    private readonly dir: string,
    private readonly playerBaseUrl: string,
    private readonly publicBaseUrl: string,
  ) {
    mkdirSync(this.dir, { recursive: true });
  }

  private pathFor(id: string): string {
    return join(this.dir, `${id}.json`);
  }

  sweepExpired(now = Date.now()): number {
    let removed = 0;
    if (!existsSync(this.dir)) return 0;
    for (const f of readdirSync(this.dir)) {
      if (!f.endsWith('.json')) continue;
      try {
        const rec = JSON.parse(readFileSync(join(this.dir, f), 'utf8')) as PublishRecord;
        if (rec.revoked || Date.parse(rec.expires_at) <= now) {
          unlinkSync(join(this.dir, f));
          removed += 1;
        }
      } catch {
        /* ignore corrupt */
      }
    }
    return removed;
  }

  publish(input: {
    yaml: string;
    name: string;
    classification: DataClass;
    org_id?: string;
    ttl_hours?: number;
  }): PublishResult {
    this.sweepExpired();
    const id = newId();
    const token = newToken();
    const hours = input.ttl_hours ?? TTL_HOURS[input.classification];
    const created = new Date();
    const expires = new Date(created.getTime() + hours * 3600_000);
    const record: PublishRecord = {
      id,
      org_id: input.org_id ?? 'default',
      classification: input.classification,
      scene_hash: sha256(input.yaml),
      yaml: input.yaml,
      created_at: created.toISOString(),
      expires_at: expires.toISOString(),
      token_hash: sha256(token),
      revoked: false,
      name: input.name,
      bytes: Buffer.byteLength(input.yaml, 'utf8'),
    };
    writeFileSync(this.pathFor(id), JSON.stringify(record), 'utf8');

    const player_url = `${this.playerBaseUrl.replace(/\/$/, '')}/?p=${id}&token=${token}`;
    const fetch_url = `${this.publicBaseUrl.replace(/\/$/, '')}/v1/scenes/${id}?token=${token}`;
    return {
      id,
      token,
      scene_hash: record.scene_hash,
      classification: record.classification,
      expires_at: record.expires_at,
      bytes: record.bytes,
      name: record.name,
      player_url,
      fetch_url,
    };
  }

  /**
   * Resolve YAML if token matches and not expired.
   * Returns null on miss/deny (do not distinguish for callers that might leak existence).
   */
  resolve(id: string, token: string, now = Date.now()): PublishRecord | null {
    const file = this.pathFor(id);
    if (!existsSync(file)) return null;
    let rec: PublishRecord;
    try {
      rec = JSON.parse(readFileSync(file, 'utf8')) as PublishRecord;
    } catch {
      return null;
    }
    if (rec.revoked) return null;
    if (Date.parse(rec.expires_at) <= now) {
      try {
        unlinkSync(file);
      } catch {
        /* noop */
      }
      return null;
    }
    if (rec.token_hash !== sha256(token)) return null;
    return rec;
  }

  revoke(id: string, token: string): boolean {
    const rec = this.resolve(id, token);
    if (!rec) return false;
    rec.revoked = true;
    writeFileSync(this.pathFor(id), JSON.stringify(rec), 'utf8');
    return true;
  }

  /** Metadata-only list for an org (no YAML). */
  listMeta(org_id = 'default'): Array<{
    id: string;
    name: string;
    classification: DataClass;
    scene_hash: string;
    created_at: string;
    expires_at: string;
    bytes: number;
    revoked: boolean;
  }> {
    this.sweepExpired();
    const out: ReturnType<SceneVault['listMeta']> = [];
    if (!existsSync(this.dir)) return out;
    for (const f of readdirSync(this.dir)) {
      if (!f.endsWith('.json')) continue;
      try {
        const rec = JSON.parse(readFileSync(join(this.dir, f), 'utf8')) as PublishRecord;
        if (rec.org_id !== org_id) continue;
        out.push({
          id: rec.id,
          name: rec.name,
          classification: rec.classification,
          scene_hash: rec.scene_hash,
          created_at: rec.created_at,
          expires_at: rec.expires_at,
          bytes: rec.bytes,
          revoked: rec.revoked,
        });
      } catch {
        /* skip */
      }
    }
    return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export { sha256 as hashSceneYaml };
