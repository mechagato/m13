# m13

> A local-first world synthesis engine for WebXR and the modern web.
> Built on semantic representation, signed distance fields, and continuous detail.

**Status:** Research · Phase 0 (proof of principle)
**License:** TBD (pending — see `constitution.md` §8.4)
**Platform:** WebGPU only

---

## What is m13?

`m13` is an experimental graphics engine that **does not store worlds as polygon meshes**. Instead, it describes scenes as compact semantic descriptors (`.m13` files) and synthesizes geometry, materials, and detail locally on the user's device — entirely in the browser, with zero cloud runtime dependency.

The name honors **Julián Carrillo's Sonido 13**, a Mexican music theory built on subdividing the discrete intervals of the traditional scale into a continuum of microtones. `m13` applies the same principle to 3D detail: rather than choosing between fixed levels of geometric detail, the engine evaluates continuous mathematical functions that scale infinitely between scales.

---

## Why?

Modern game engines like Unity and Unreal are extraordinary, but they suffer from a problem that gets worse every year: **asset weight**. A typical AAA game ships with tens of gigabytes of textures, meshes, and baked data. Mobile and XR hardware can't easily handle this. Iteration cycles are slow. Memory bandwidth — not compute — is the real bottleneck.

`m13` flips the equation. By representing a scene as **what it is** instead of **how it looks pixel by pixel**, a complete habitable room can be described in kilobytes of YAML and synthesized at runtime using GPU compute shaders + optional local neural inference. The result: lighter projects, faster iteration, and a path to high-fidelity XR experiences on commodity hardware.

This is **not** a Unity/Unreal killer. It's a different category, targeting:

- WebXR experiences (Meta Quest 3, Vision Pro, mobile XR)
- Real-time architectural and product visualization
- Configurators and procedural product showcases
- Open research into semantic and continuous-detail rendering

---

## Architecture (TL;DR)

```
┌─────────────────────────────────────────────────────────┐
│  .m13 descriptor (YAML, kilobytes)                      │
│   ▼                                                      │
│  Parser → Scene IR → Shader Compiler                    │
│   ▼                                                      │
│  WebGPU runtime:                                         │
│    • SDF raymarching (architecture)                     │
│    • Procedural synthesis (materials)                   │
│    • Neural inference via ONNX (advanced materials)     │
│    • Gaussian Splatting (captured objects)              │
│   ▼                                                      │
│  90 fps, foveated, locally rendered                     │
└─────────────────────────────────────────────────────────┘
```

Workload distribution (target):

- **GPU compute shaders:** 55–65% (raymarching, procedural eval)
- **NPU / Neural Engine:** 15–20% (material synthesis when available)
- **CPU:** 10–15% (parser, scheduler, basic physics)
- **RAM:** aggressive caching of synthesized results

---

## Roadmap

| Phase | Codename                              | Status      |
|-------|---------------------------------------|-------------|
| 0     | Proof of principle (SDF raymarching)  | ✅ Done     |
| 1     | `.m13` language + concept library     | 🚧 Drafted  |
| 2     | Continuous detail (Sonido 13 visual)  | 📋 Planned  |
| 3     | Local neural material synthesis       | 📋 Planned  |
| 4     | Hybrid composition + Gaussian Splatting | 📋 Planned |
| 5     | WebXR + Quest 3 + voice editing       | 📋 Planned  |
| 6     | Temporal editing + composer agent     | 📋 Future   |

See `docs/spec/` for detailed specifications of each phase.

---

## Run the Phase 0 demo

The Phase 0 demo is a single self-contained HTML file. No build step required.

```bash
# Option A: open directly
open m13-phase0.html

# Option B: serve locally (recommended for pointer lock)
python3 -m http.server 8000
# then visit http://localhost:8000/m13-phase0.html
```

**Requirements:**

- Chrome / Edge 113+ (desktop or Android)
- Safari Technology Preview with WebGPU flag
- Quest 3 browser (Chromium-based)

**Controls:**

- Click — capture cursor
- WASD — move
- Space / Shift — fly up/down
- M — toggle microphone (audio modulates wall detail and the gold sphere)
- Esc — release cursor

The demo renders a closed room (10×6×10 m) entirely with raymarched SDFs. **Zero polygons, zero pre-loaded textures.** The entire file weighs ~25 KB.

---

## Project documents

- [`constitution.md`](./constitution.md) — non-negotiable architectural principles
- [`BITACORA_MOTOR13.md`](./BITACORA_MOTOR13.md) — development session log (Spanish)
- [`docs/spec/phase-1-spec.md`](./docs/spec/phase-1-spec.md) — Phase 1 specification

---

## Contributing

The project is in research phase and not yet open to external contributions. Once a public license is finalized (post-Phase 3), contribution guidelines will be published here.

For research collaborations or commercial inquiries, contact NeoNodos.

---

## Credits and influences

- **Julián Carrillo** — Sonido 13 (microtonalism, 1895 onward)
- **Iñigo Quílez** — pioneering SDF and raymarching techniques on Shadertoy
- **3D Gaussian Splatting** — Kerbl et al., SIGGRAPH 2023
- **NeRF and neural scene representations** — Mildenhall et al., 2020

Built in Monterrey, México by NeoNodos.

---

*"El motor no descarga gráficos. Descarga significado."*
