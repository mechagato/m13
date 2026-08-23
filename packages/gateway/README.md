# @m13/gateway — publish privado con token + portal config (D2)

HTTPS-ready gateway for **S2/S3** scene delivery:

- `POST /v1/publish` → stores YAML in a local vault, returns **tokenized** `player_url` (no cleartext `#scene=`).
- `GET /v1/scenes/:id?token=` → player fetches YAML with bearer token.
- `/portal/` → minimal config UI (publish + org metadata list).

Render stays **local-first** in the browser; the gateway only distributes the `.m13` descriptor.

## Quick start

```bash
pnpm --filter @m13/gateway start
# portal: http://127.0.0.1:8788/portal/
# health: http://127.0.0.1:8788/health
```

Env:

| Variable | Default |
|---|---|
| `M13_GATEWAY_PORT` | `8788` |
| `M13_VAULT_DIR` | `./.m13-vault` |
| `M13_PLAYER_BASE_URL` | `http://localhost:5173` |
| `M13_PUBLIC_BASE_URL` | `http://127.0.0.1:$PORT` |
| `M13_CORS_ORIGINS` | `http://localhost:5173,*` |

## Player

Open `http://localhost:5173/?p=<id>&token=<token>` (examples app). It calls the gateway fetch URL and loads the scene.

## MCP

With `M13_GATEWAY_URL=http://127.0.0.1:8788`, tool `publish_m13_scene` posts here and returns the authenticated link.

## Security notes

- Token stored as sha256 at rest; raw token only returned once at publish.
- TTL by classification (S2=24h, S3=1h default).
- Org scene list is metadata-only (no YAML).
- Not a claim of “unhackable” — confidentiality-by-design for D2.
