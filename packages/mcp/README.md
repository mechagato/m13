# @m13/mcp — servidor MCP del motor m13

Convierte a **cualquier LLM** (Claude, ChatGPT, lo que venga) en front-end del motor m13:
el modelo genera, valida y comparte escenas `.m13`, y el humano recibe un link que abre
el **mundo 3D caminable** directo en su navegador (WASD + mouse, WebGPU).

La URL ES la escena — el YAML viaja en base64url dentro del hash. Cero backend, cero
assets, cero red en el render: la síntesis siempre corre local en el dispositivo del
que abre el link.

## Los 5 tools

| Tool | Qué hace |
|---|---|
| `generate_m13_scene` | Genera una escena con el generador paramétrico local (cero LLM, determinista por `seed`). Acepta `style` (`galeria` · `cocina` · `oficina` · `templo` · `minimalista` · `sorpresa`) o `prompt` libre. Devuelve YAML completo, bytes, seed, label y `share_url`. |
| `validate_m13_scene` | Valida un YAML `.m13` en dos niveles: schema (parser Zod) + compilador WGSL (conceptos reales). Si pasa: stats (objetos, conceptos usados, bytes, versión). Si falla: el mensaje de error exacto para que el LLM corrija y reintente. |
| `share_m13_scene` | Valida y devuelve el `share_url` (`https://m13.phi-core.com/#scene=<base64url>`) que abre el mundo caminable. |
| `list_m13_concepts` | Catálogo vivo de conceptos materiales/geométricos desde `@m13/synth` (id, categoría, descripción, params). Nunca driftea: se lee del registry real en cada llamada. |
| `get_m13_format_guide` | Guía de autoría completa del formato `.m13` (reglas, restricciones numéricas, catálogo, ejemplos) para que el LLM escriba escenas a mano. Adaptada del system prompt del editor (100% pass rate en el eval T-052/053). |

Flujo típico del LLM: `get_m13_format_guide` → escribe YAML → `validate_m13_scene`
hasta que pase → `share_m13_scene` → entrega el link al humano.

## Conectarlo a Claude Code

```bash
claude mcp add m13 -- pnpm --dir /home/isai1618/neonodos-core/NeoNodos_System/m13/packages/mcp exec tsx src/cli.ts
```

Y ya: en cualquier sesión de Claude Code aparecen los tools `mcp__m13__*`.

## Probarlo con el inspector oficial

```bash
npx @modelcontextprotocol/inspector pnpm --dir /home/isai1618/neonodos-core/NeoNodos_System/m13/packages/mcp exec tsx src/cli.ts
```

Abre la UI del inspector en el navegador, conecta, y ejercita cada tool a mano.

## Desarrollo

```bash
pnpm --filter @m13/mcp typecheck   # tsc --noEmit limpio
pnpm --filter @m13/mcp test        # vitest — lógica de los 5 tools
pnpm --filter @m13/mcp start       # server stdio (para clientes MCP)
```

La lógica de negocio vive en `src/tools.ts` como funciones puras (`runGenerateScene`,
`runValidateScene`, `runShareScene`, `runListConcepts`) — importables sin levantar el
protocolo. `src/server.ts` solo registra; `src/cli.ts` solo conecta el transporte stdio.

**Regla dura del transporte stdio:** JAMÁS escribir a stdout en este proceso — el
JSON-RPC vive ahí y cualquier byte extra lo corrompe. Logs solo a stderr.

## Constitution §3 — editor-time only

Este servidor cumple la Constitution de m13: **el LLM solo participa en editor-time**.
El MCP es exactamente eso — una herramienta de autoría. El runtime que renderiza las
escenas (`@m13/runtime`) jamás llama a un LLM ni a la red; quien abre un `share_url`
recibe síntesis 100% local en su GPU. Coherente con D-025-06: la IA crea recetas, el
render siempre es del cliente.
