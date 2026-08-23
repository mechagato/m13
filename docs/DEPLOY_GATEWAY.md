# Deploy notes — `@m13/gateway` (no landing)

Operational checklist for tokenized private publish. Marketing landings are **out of scope here**.

## Local

```bash
pnpm gateway
# portal config: http://127.0.0.1:8788/portal/
# player:        http://localhost:5173/?p=<id>&token=<token>
```

## Production (TLS)

1. Run `pnpm --filter @m13/gateway start` behind Caddy/nginx/Cloudflare with HTTPS.
2. Set env:
   - `M13_PUBLIC_BASE_URL=https://gw.example.com`
   - `M13_PLAYER_BASE_URL=https://m13.phi-core.com`
   - `M13_VAULT_DIR=/var/lib/m13-vault` (encrypted disk recommended)
   - `M13_CORS_ORIGINS=https://m13.phi-core.com`
3. Restrict vault volume permissions; enable disk encryption.
4. Point MCP hosts: `M13_GATEWAY_URL=https://gw.example.com`.
5. Do **not** log request bodies (YAML).

## ChatGPT App

Use `packages/mcp/chatgpt-app/openapi.yaml` against the TLS gateway. Register the App only after HTTPS is live.
