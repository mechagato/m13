# Contributing to m13

Thanks for helping. m13 is a local-first WebGPU world synthesizer. Keep changes small, honest, and testable.

## Setup

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm dev
```

Needs Node.js 20+, pnpm 8+, and a WebGPU browser (Chrome/Edge 113+).

## Rules that matter

1. **Runtime stays local-first.** The renderer must not call the cloud. LLM/MCP tools are editor-time only.
2. **WebGPU only** in the core renderer. No WebGL/Three.js as a hard dependency of `@m13/runtime`.
3. **English in code identifiers**; Spanish is fine in docs/comments/commits for this project’s maintainers.
4. **Do not overclaim.** If a feature is emulated, frozen, or not built (neural, gaussian splat, real glass transmission, CSG in `.m13`), say so in the PR.
5. **Sonido 13** is cultural inspiration for continuous subdivision. The shipped technique is footprint-driven continuous fBm LOD — not Carrillo’s musical scale engine. Keep that distinction in public text.
6. Uniform layout changes must update WGSL (`shaders/common.ts`), `UNIFORM_BYTES`, and `writeUniforms` in the **same** commit.
7. Run `pnpm typecheck` and `pnpm test` before opening a PR.

## Packages

| Package | Role |
|---|---|
| `@m13/runtime` | Parser, compiler, WebGPU renderer, XR, replay |
| `@m13/spec` | Overlay Zod v0.3 modular (education kit + game). Headless. Strip-to-visual. |
| `@m13/synth` | Procedural material/geometry concepts |
| `@m13/generator` | Parametric / prompt → `.m13` (local) |
| `@m13/mcp` | MCP tools for editor-time scene authoring |
| `@m13/examples` | Public demo / PWA |
| `@m13/editor` | **Experimental** Next.js editor (needs external LLM gateway) |

## Pull requests

- One coherent change per PR.
- Update `BITACORA_MOTOR13.md` for non-trivial work.
- Prefer adding/adjusting tests over screenshots-only claims.
