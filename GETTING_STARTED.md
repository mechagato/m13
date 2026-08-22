# Getting Started · m13

Run the monorepo locally and open the WebGPU demo.

## Requirements

- **Node.js 20+**
- **pnpm 8+** — `npm i -g pnpm` if needed
- **Chrome / Edge 113+** (WebGPU). Quest: Meta Quest Browser with WebGPU + WebXR interop for VR

## 1. Clone and install

```bash
git clone https://github.com/mechagato/m13.git
cd m13
pnpm install --frozen-lockfile
```

## 2. Dev server

```bash
pnpm dev
```

Opens http://localhost:5173 (`@m13/examples`).

## 3. Controls (desktop)

- Click canvas / use on-screen hints for look + move
- Drag: right = look, left = joystick-style move (pointer lock is optional)
- Scene list in the UI: Chichén, amanecer temporal, galería, cocina, oficina, templo, showcase, FlowCAD samples, …
- **M** — microphone (audio-reactive materials where enabled)
- **Entrar en VR** — only if the browser reports `immersive-vr` + WebGPU XR binding

### Useful URLs

| URL | Effect |
|---|---|
| `/?s13=on` | Continuous detail on (Sonido 13 A/B) |
| `/?s13=off` | Fixed-octave detail (legacy look) |
| `/#scene=<base64url>` | Load a shared scene from the hash |
| `/#scene=...&replay=...` | Shared scene + bounded replay |

Live production demo: https://m13.phi-core.com

## 4. Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

Production static output: `packages/examples/dist/` (Cloudflare Pages / any static host).

## 5. Optional packages

### MCP (editor-time, local)

See `packages/mcp/README.md`. Tools generate/validate `.m13` and share links; they do **not** render in the cloud.

### Experimental editor

`packages/editor` is a Next.js shell that talks to an **external** LLM gateway. It is not required for the demo and is not a hosted SaaS.

```bash
pnpm --filter @m13/editor dev
```

## Project layout

```
m13/
├── LICENSE / README / GETTING_STARTED
├── constitution.md
├── packages/runtime   # engine
├── packages/synth     # materials & geo concepts
├── packages/generator # local .m13 generation
├── packages/mcp       # MCP tools
├── packages/examples  # demo PWA
└── packages/editor    # experimental
```

## Quest 3 (short)

1. Open https://m13.phi-core.com in Meta Quest Browser.
2. Load **Chichén Itzá** (or another scene).
3. Tap **Entrar en VR** if shown; accept the immersive session.
4. Full protocol: `docs/DEPLOY.md`.

## Honest limits

- Needs WebGPU. No WebGL fallback in core.
- Frosted glass is an **emulated** look (no real refraction).
- Neural materials and Gaussian Splatting are **not** in this MVP.
- CSG booleans are not authorable in `.m13` yet.
