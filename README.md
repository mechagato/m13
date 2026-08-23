# m13

> Local-first world synthesis for WebGPU and WebXR.

**License:** [MIT](./LICENSE) · **Live demo:** https://m13.phi-core.com  
**Status:** Research MVP you can run today. Not a Unity/Unreal replacement.

**Canonical plan (SSOT):** [`docs/plans/plan-canonico-plataforma.md`](./docs/plans/plan-canonico-plataforma.md) — agentic-first launch (MCP + ChatGPT Apps + config portals + landings), suite role vs FlowCAD/Comp3D, and industrial confidentiality controls. Security skeleton: [`docs/security/threat-model-v1.md`](./docs/security/threat-model-v1.md).

m13 describes worlds as compact `.m13` YAML and synthesizes SDF geometry + procedural materials **on the user’s device**. The renderer never calls a cloud service. LLM and MCP tools exist only at **editor-time**.

## Inspiration: Sonido 13 (honest framing)

m13 is named after **Julián Carrillo’s Sonido 13** — the Mexican microtonal idea that you can subdivide beyond a fixed 12-note grid.

In the runtime that inspiration becomes **continuous visual detail**: near the camera, materials reveal finer procedural structure; farther away, high frequencies drop off smoothly (`fbm_continuous` + `pixelFootprint` in WGSL).

That is a **graphics LOD technique** (footprint-driven continuous fBm), with tests in `packages/runtime/src/shaders/__tests__/fbm-continuous-math.test.ts`. It is **not** Carrillo’s musical scale engine, and we do not claim a novel musical algorithm. The cultural metaphor is intentional; the shipped math is measurable and ordinary in computer graphics.

## Quick start

```bash
git clone https://github.com/mechagato/m13.git
cd m13
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:5173 (Chrome/Edge with WebGPU). See [GETTING_STARTED.md](./GETTING_STARTED.md).

```bash
pnpm typecheck
pnpm test
pnpm build
```

## What works today

| Capability | Notes |
|---|---|
| `.m13` → WebGPU SDF raymarch | Local, deterministic compile |
| 18 procedural concepts (`@m13/synth`) | Walls, floors, stone, metals, geo concepts |
| Continuous detail (S13 toggle) | `?s13=on\|off` A/B in the demo |
| Share links | `#scene=` — the URL is the world |
| Temporal scenes + replay | `.m13` v0.2 keyframes, `light_flash`, `.m13replay` |
| WebXR (Quest 3) | Enter VR when the browser exposes WebGPU↔WebXR; **validated on Quest** (2026-08-22) |
| MCP tools (`@m13/mcp`) | Generate / validate / share / compose temporal — local stdio |
| PWA | Installable demo, offline cache after first load |

## What you can build today (honest verticals)

- **Walkable web worlds** — interiors, temples, galleries, Chichén Itzá demos.
- **Shareable experiences** — send a link; no backend scene server required.
- **Quest VR previews** — immersive walkthroughs in Meta Quest Browser when interop is present.
- **LLM-assisted authoring** — MCP or local generator writes `.m13`; rendering stays on-device.
- **Lightweight spatial prototypes** — semantic rooms/objects for product or architecture previews (**not** a manufacturing CAD kernel; CSG booleans are not exposed in `.m13` yet).

## What is not built (do not overclaim)

| Topic | Status |
|---|---|
| Local neural / ONNX materials (Phase 3) | **Frozen** — not in runtime |
| Gaussian Splatting hybrid (Phase 4) | **Spec only** — not implemented |
| Real refractive glass | Emulated look only |
| CSG (`opSub` etc.) in scene files | WGSL helpers exist; **not in schema** |
| Multiplayer / “m13-platform” | Out of scope (separate future project) |
| Public LLM editor SaaS | `packages/editor` is **experimental** (needs your own gateway) |

## Verified evidence

- **30.8× smaller scene assets** in one textured-room comparison (2,014 B `.m13` vs 62,115 B Three.js HTML/JS/textures). That is **asset weight**, not FPS. Without textures the ratio is ~2.83×; first load including engine ~2.5×. Methodology: `docs/papers/phase-1-benchmark.md`.
- Deterministic WGSL hash regression for existing v0.1 scenes.
- Quest 3: immersive VR entry + Chichén walkthrough validated by the maintainer (2026-08-22). Stereo FPS telemetry paper remains optional follow-up.

## Architecture

```
.m13 YAML
  → Zod parser (v0.1 / v0.2)
  → deterministic WGSL compiler
  → local WebGPU SDF renderer (+ optional WebXR stereo)
```

## Roadmap (truthful)

| Phase | Scope | Status |
|---|---|---|
| 0 | SDF proof | Done |
| 1 | `.m13` + concepts | Done |
| 2 | Continuous detail | Done |
| 5 | WebXR + voice authoring | Done in code; **Quest validated** |
| 6 | Temporal + compositor + replay | Code complete; closing public evidence/docs |
| 3 | Neural ONNX | Frozen |
| 4 | Gaussian Splatting | Not built |

## Packages

| Package | License | Role |
|---|---|---|
| `@m13/runtime` | MIT | Engine |
| `@m13/synth` | MIT | Concept library |
| `@m13/generator` | MIT | Local scene generation |
| `@m13/mcp` | MIT | MCP server |
| `@m13/examples` | MIT | Demo / PWA |
| `@m13/editor` | MIT (experimental) | Next editor — optional |

## Principles

- Local-first runtime — no cloud to draw a frame.
- WebGPU only in the core.
- Deterministic scene compilation.
- LLM use is editor-time only.

“El motor no descarga gráficos. Descarga significado.”

## Docs

- [docs/plans/plan-canonico-plataforma.md](./docs/plans/plan-canonico-plataforma.md) — **canonical roadmap**
- [docs/security/threat-model-v1.md](./docs/security/threat-model-v1.md)
- [docs/commercial/onepager-industria-ehs.md](./docs/commercial/onepager-industria-ehs.md)
- [GETTING_STARTED.md](./GETTING_STARTED.md)
- [constitution.md](./constitution.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)
- [docs/DEPLOY.md](./docs/DEPLOY.md)
- [packages/mcp/README.md](./packages/mcp/README.md)
- [packages/gateway/README.md](./packages/gateway/README.md) — private token publish + config portal (D2)

## Maintainers

Genaro Isaí García Torres · open source under MIT.
