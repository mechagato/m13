#!/usr/bin/env tsx
/**
 * m13-gateway CLI — HTTP server for tokenized private publish + portal.
 *
 * Env:
 *   M13_GATEWAY_PORT     default 8788
 *   M13_VAULT_DIR        default ./.m13-vault
 *   M13_PLAYER_BASE_URL  default http://localhost:5173
 *   M13_PUBLIC_BASE_URL  default http://127.0.0.1:$PORT
 *   M13_CORS_ORIGINS     comma list or *
 */

import { serve } from '@hono/node-server';
import { resolve } from 'node:path';
import { SceneVault } from './vault.js';
import { createGatewayApp } from './app.js';

const port = Number(process.env.M13_GATEWAY_PORT ?? 8788);
const vaultDir = resolve(process.env.M13_VAULT_DIR ?? './.m13-vault');
const playerBase = process.env.M13_PLAYER_BASE_URL ?? 'http://localhost:5173';
const publicBase = process.env.M13_PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`;
const corsOrigins = (process.env.M13_CORS_ORIGINS ?? 'http://localhost:5173,*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const vault = new SceneVault(vaultDir, playerBase, publicBase);
const app = createGatewayApp({ vault, corsOrigins });

serve({ fetch: app.fetch, port }, (info) => {
  // stderr only — keep stdout clean for future piping
  console.error(`[m13-gateway] listening on http://127.0.0.1:${info.port}`);
  console.error(`[m13-gateway] portal  http://127.0.0.1:${info.port}/portal/`);
  console.error(`[m13-gateway] vault   ${vaultDir}`);
  console.error(`[m13-gateway] player  ${playerBase}`);
});
