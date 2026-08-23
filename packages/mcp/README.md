# @m13/mcp — servidor MCP del motor m13

Convierte a **cualquier LLM** (Claude, ChatGPT, Cursor) en canal de **entrega espacial**:
genera/valida/comparte escenas `.m13` y plantillas verticales (EHS). El humano recibe un
link caminable (S0/S1) o un paquete **privado** con hash (S2/S3 — sin YAML en la URL).

**Canon:** `docs/plans/plan-canonico-plataforma.md` (MCP + ChatGPT Apps primero).  
**ChatGPT App skeleton:** [`chatgpt-app/`](./chatgpt-app/).

Constitution §3: esto es **editor-time**. El runtime que renderiza jamás llama a un LLM.

## Tools (v0.2)

| Tool | Qué hace |
|---|---|
| `list_m13_templates` | Plantillas cobrables (p.ej. `ehs_pasillo`) + checklist + `ui_card` |
| `create_m13_from_template` | Instancia plantilla validada; EHS default **S2 → private share** |
| `generate_m13_scene` | Generador paramétrico local (`style` / `prompt`) |
| `compose_temporal_m13_scene` | Sabio Compositor → `.m13` v0.2 temporal |
| `validate_m13_scene` | Parser Zod + compile WGSL |
| `share_m13_scene` | `classification` + `visibility`; S2/S3 bloquean `#scene=` público |
| `publish_m13_scene` | **D2:** publica vía `M13_GATEWAY_URL` → link `?p=&token=` (sin YAML en URL) |
| `list_m13_concepts` | Catálogo vivo `@m13/synth` |
| `get_m13_format_guide` | Guía de autoría |

Flujo EHS típico: `list_m13_templates` → `create_m13_from_template` → `publish_m13_scene` (gateway) → player.

Flujo creativo S0: `generate_m13_scene` → `share_m13_scene` → abrir `share_url`.

## Seguridad (skeleton)

- **S0/S1:** URL pública `#scene=` permitida (demo / OSS).
- **S2/S3:** `private_local` — hash sha256 + instrucciones; **no** echo YAML en chat.
- `ui_card.security_banner` para hosts agentic / ChatGPT Apps.
- No claim “inhackeable”; sí confidencialidad por diseño.

## Conectarlo a Claude Code

```bash
claude mcp add m13 -- pnpm --dir <path-to-m13>/packages/mcp exec tsx src/cli.ts
```

## Inspector

```bash
npx @modelcontextprotocol/inspector pnpm --dir <path-to-m13>/packages/mcp exec tsx src/cli.ts
```

## Desarrollo

```bash
pnpm --filter @m13/mcp typecheck
pnpm --filter @m13/mcp test
pnpm --filter @m13/mcp start
```

Lógica pura en `src/tools.ts` (+ `security.ts`, `templates.ts`, `cards.ts`).  
`server.ts` solo registra; `cli.ts` solo stdio. **Nunca escribir a stdout** en el proceso MCP.
