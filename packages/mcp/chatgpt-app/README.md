# m13 ChatGPT App adapter (D1 skeleton)

This folder is the **ChatGPT Apps / Actions** shell around the same domain tools
implemented in `@m13/mcp` (`src/tools.ts`).

## Principle (canon)

- **One domain layer** (`run*` functions) → MCP stdio **and** HTTPS OpenAPI for ChatGPT.
- **UI cards** (`ui_card` on tool results) are meant to render as embedded conversation widgets.
- **S2/S3 scenes never ship cleartext `#scene=` URLs.** ChatGPT must not hold brand CAD vaults.

## Files

| File | Role |
|---|---|
| `openapi.yaml` | HTTP mirror of domain tools (host this behind TLS + auth in D2) |
| `ai-plugin.json` | Legacy plugin manifest pointer (useful while Apps review matures) |

## Local MCP today (works now)

```bash
pnpm --filter @m13/mcp start
# or: claude mcp add m13 -- pnpm --dir <repo>/packages/mcp exec tsx src/cli.ts
```

## ChatGPT App (next hosting step — D2)

1. Deploy a thin HTTPS gateway that calls `runCreateFromTemplate` / `runShareScene` / etc.
2. Register the App with `openapi.yaml`.
3. Map tool JSON → widget using `ui_card`.
4. For confidential jobs: chat only receives hash + CTA; vault stays on customer portal/desktop.

## Security banner for hosts

If `ui_card.security_banner` is set, show it prominently and **do not** echo `yaml` into the thread.
