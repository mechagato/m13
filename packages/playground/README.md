# @m13/playground — probar MCPs en local (antes de más UI)

Chat HTML + **DeepSeek** (tool calling OpenAI-compatible) + **un MCP activo por turno**.

Orden sugerido: **m13 → flowcad → comp3d**.

## Por qué DeepSeek

Si el tool-calling funciona con DeepSeek, el mismo esquema de tools sirve para Claude/OpenAI/ChatGPT Apps. No hace falta otra UI todavía.

## Arranque

```bash
# en m13/
pnpm install
# opcional:
set DEEPSEEK_API_KEY=sk-...
pnpm playground
```

Abre http://127.0.0.1:8790

También puedes pegar la API key en la UI (no se guarda en disco).

## Dependencias por MCP

| MCP | Qué necesita |
|---|---|
| **m13** | Nada extra (in-process). Gateway `:8788` solo si pruebas `publish_m13_scene` |
| **flowcad** | Backend FastAPI (`FLOWCAD_BACKEND_URL`, default `:8787`) |
| **comp3d** | Python + repo `11-proy3-qro` **o** API HTTP (`COMP3D_API_URL`, default `:8080`) |

## Modos de prueba

1. **Tool directo** — sin LLM, valida el adapter.
2. **Chat DeepSeek** — el modelo elige tools del MCP activo.

## Seguridad

No pegues planos S3/YAML confidenciales en el chat. Usa publish privado / zero_retention.
