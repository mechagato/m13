---
name: contexto-proyecto
description: Qué es m13 y su stack — léela al arrancar.
metadata: {type: project}
---

# m13 — contexto

**Motor de síntesis de mundos local-first para WebGPU/WebXR.** Sintetiza mundos 3D desde archivos
**`.m13`** (YAML semántico) con **SDF raymarching** + conceptos materiales procedurales — sin assets
pesados, sin red en runtime. Open source, marca propia (NO ligar a dominio NeoNodos), npm `m13`.

- **Demo público LIVE:** `motor13.neonodos.com` (Cloudflare Pages: `motor13.pages.dev`).
- **Diferenciadores:** ~30× más ligero que Three.js equivalente; "la URL es el mundo" (escenas viajan
  como `#scene=` share links, cero backend); cualquier LLM es front-end vía `@m13/mcp` (genera `.m13`
  validado → link caminable; editor-time, el renderer nunca llama a la nube).
- **Stack:** monorepo **pnpm** (`packages/`), TypeScript, WebGPU, vitest. `m13-spec/` = el lenguaje.
  `live/` = demo. `tools/`. Docs y benchmark en `docs/`.

## Documentos maestros
`CLAUDE.md` (instrucciones), `constitution.md` (reglas/licencia §8.4 TBD), `BITACORA_MOTOR13.md`
(bitácora), `docs/papers/phase-1-benchmark.md`. Estado vivo → ficha [[estado-vivo]].
