# m13

> Local-first world synthesis for WebGPU and WebXR.

**Status:** Research. Phases 1 and 2 are complete. Phase 5 WebXR is implemented in code but remains pending validation on a physical Quest headset. Phase 3 neural work is frozen. Phase 6 source work has not started; deployed artifacts with temporal features are being reconciled to a verifiable source revision before implementation resumes.

**Live demo:** https://m13.phi-core.com

**Platform:** WebGPU only. **License:** TBD; see `constitution.md`.

## What Is m13?

m13 describes worlds as compact `.m13` YAML descriptors and synthesizes their SDF geometry and procedural materials locally in the browser. Rendering does not call a cloud service. LLM and MCP integrations are editor-time tools only.

## Verified Evidence

- **30.8x smaller scene assets** in one reproducible textured-room comparison: 2,014 B `.m13` versus 62,115 B of Three.js HTML, JS, and textures.
- Including engine bundles, measured first load is approximately **2.5x smaller**. This is not an FPS benchmark.
- Existing v0.1 scenes have deterministic WGSL hash regression tests.
- The public demo supports local scene generation, procedural materials, continuous detail, share links, and WebXR entry when the browser supports the WebGPU/WebXR interop.

See `docs/papers/phase-1-benchmark.md` for methodology and limitations. Quest stereo rendering, FPS, and locomotion remain hardware gates, not verified claims.

## Architecture

```
.m13 YAML descriptor
  -> parser and schema validation
  -> deterministic WGSL compiler
  -> local WebGPU SDF renderer
```

Current runtime capabilities are SDF raymarching, procedural materials, continuous detail, audio-reactive inputs, and WebXR code paths. Local neural synthesis, Gaussian Splatting, and foveation are future research, not current runtime features.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | SDF proof of principle | Done |
| 1 | `.m13` language and concepts | Done |
| 2 | Continuous detail | Done |
| 3 | Local neural synthesis | Frozen by product decision |
| 4 | Gaussian Splatting | Planned after Phase 6 |
| 5 | WebXR and voice authoring | Implemented; Quest gate pending |
| 6 | Temporal editing and composer | Drafted; production/source provenance audit open |

## Development

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

The full continuation record lives in `BITACORA_MOTOR13.md`; the current hardware protocol is in `docs/DEPLOY.md`.

## Principles

- Local-first runtime: no cloud dependency to render a scene.
- WebGPU only: no WebGL or Three.js in the renderer core.
- Deterministic scene compilation.
- LLM use is editor-time only.

"El motor no descarga graficos. Descarga significado."
