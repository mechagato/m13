# @m13/runtime

> The m13 engine — local-first WebGPU world synthesis from `.m13` semantic descriptors.

**Version:** 0.1.0
**Status:** Research · Phase 1
**License:** TBD (see root `constitution.md`)
**Bundle size:** ~50 KB minified + gzipped (entire engine + Zod + yaml)

---

## What this package does

You give it a `.m13` YAML descriptor like this:

```yaml
version: "0.1"
name: gallery
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_marmol_blanco }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: sculpture
    kind: sphere
    position: [0, -1, 0]
    scale: 0.4
    material: metal_dorado_pulido
    audio_reactive: true
```

It synthesizes a renderable 3D world on the GPU at 60+ fps, with zero asset downloads. The room walls, floor, ceiling are signed distance fields (SDF) raymarched. The materials are procedural WGSL functions from the companion `@m13/synth` library.

No `.fbx`. No `.gltf`. No textures over the network. The whole scene above is ~500 bytes of YAML.

---

## Install

```bash
pnpm add @m13/runtime @m13/synth
```

Requires a WebGPU-capable browser (Chrome/Edge 113+, Quest 3 browser, Safari with WebGPU flag).

---

## Quick start

```typescript
import { M13Engine } from '@m13/runtime';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
const engine = new M13Engine(canvas);

await engine.loadScene('/scenes/gallery.m13');
engine.attachFlyCamera();
engine.start();
```

That's it. The engine handles WebGPU device acquisition, shader compilation, pipeline setup, frame loop, and pointer-lock fly camera.

---

## API reference

### `M13Engine`

Main orchestrator. Owns the WebGPU context, pipeline, and per-frame state.

#### `new M13Engine(canvas, opts?)`

| Argument | Type | Default | Notes |
|---|---|---|---|
| `canvas` | `HTMLCanvasElement` | required | Will be resized to match its CSS dimensions × pixelRatio |
| `opts.pixelRatio` | `number` | `min(devicePixelRatio, 2)` | Higher = sharper but slower |
| `opts.onFrame` | `(stats: FrameStats) => void` | — | Callback per rendered frame |

#### `engine.loadScene(yamlOrUrl)`

Parses and compiles a `.m13` scene, swaps the renderer pipeline (or reuses it if the WGSL is identical via [shader cache](#shader-cache)).

```typescript
const scene = await engine.loadScene(yamlText);
// or
const scene = await engine.loadScene('/scenes/sala.m13'); // fetched
```

Returns the parsed `M13Scene` object.

Throws with namespaced errors: `[m13/parser] ...` for invalid YAML/schema, `[m13/compiler] ...` for unknown concepts or invalid params.

#### `engine.attachFlyCamera(opts?)`

WASD + mouse pointer-lock camera, bounded to the room walls.

```typescript
engine.attachFlyCamera({
  speed: 2.5,      // m/s
  sensitivity: 0.0025,
});
```

Returns the `FlyCamera` instance for direct manipulation.

#### `engine.attachAudioInput()`

Microphone capture for audio-reactive materials (the `audioAmp` uniform).

```typescript
const audio = engine.attachAudioInput();
await audio.start();  // user gesture required (browser permission)
```

#### `engine.start()` / `engine.stop()`

Begin / end the requestAnimationFrame loop.

#### `engine.getWgslHash()` / `engine.getLastLoadInfo()`

Diagnostics:

```typescript
await engine.loadScene(yaml);
console.log(engine.getLastLoadInfo());
// { wgslHash: '247dd359...', reusedPipeline: false }
```

`reusedPipeline === true` means the shader cache hit and the GPU pipeline was reused (only the matParams buffer was rewritten, if applicable).

---

### `parseScene(yamlText, opts?)` → `M13Scene`

Parse + validate a `.m13` document. Pure function, no side effects beyond optional `console.warn` for unknown root fields.

```typescript
import { parseScene } from '@m13/runtime';

const scene = parseScene(yamlText, { silent: true });
// silent: true → suppresses warnings for unknown root fields
```

Throws `Error` with a prefixed message:
- `[m13/parser] YAML inválido: ...` — malformed YAML
- `[m13/parser] m13 v0.2 no soportado...` — wrong version
- `[m13/parser] Escena .m13 inválida:` — Zod validation failed (per-field paths included)

---

### `compileScene(scene)` → `CompiledScene`

Convert a parsed scene into a WGSL shader module + uniform layout. Deterministic (same input → same WGSL byte-for-byte).

```typescript
import { compileScene } from '@m13/runtime';

const compiled = compileScene(scene);
console.log(compiled.wgsl);            // string — the assembled WGSL
console.log(compiled.conceptsUsed);    // ['marmol_blanco_vetas', 'pared_yeso_blanco', ...]
console.log(compiled.matParams);       // { totalFloats, slots, byKey, values: Float32Array }
```

Benchmark: ~21 ms p95 for 50 objects on a modern laptop (i7-12700K).

---

### `hashWgsl(wgsl)` → `Promise<string>`

SHA-256 of the WGSL string. Used internally as the shader cache key.

```typescript
const hash = await hashWgsl(compiled.wgsl);
// '247dd359...' (64 hex chars)
```

Cross-platform: uses Web Crypto API, works in browser + Node 15+ + Deno + Bun + Cloudflare Workers.

---

### `FlyCamera`

Pointer-lock first-person camera. Auto-attaches click/mouse/keyboard listeners.

```typescript
import { FlyCamera } from '@m13/runtime';

const cam = new FlyCamera(canvas, {
  initialPos: [0, 0, -3.5],
  bounds: [4.5, 2.7, 4.5],
  speed: 2.5,
  sensitivity: 0.0025,
});

// In your frame loop:
const vectors = cam.update(deltaSeconds);
// { pos, forward, right, up }
```

Controls:
- Click canvas → request pointer lock
- WASD → move
- Space / Shift → up / down
- Mouse → look
- Esc → release lock

---

### `MicAudioInput`

Microphone amplitude capture for the `audioAmp` uniform.

```typescript
import { MicAudioInput } from '@m13/runtime';

const audio = new MicAudioInput();
await audio.toggle(); // start; second call stops

const amp = audio.sample(); // 0..1 smoothed
```

Smoothing factor 0.15 (15% lerp per call). Returns 0 when inactive.

---

### `writeMatParams(state, values)`

Live-update of material parameters without re-creating the pipeline. Useful for editor scrub-bars.

```typescript
import { writeMatParams } from '@m13/runtime';

// values must match compiled.matParams.values layout (same length)
writeMatParams(engine['renderer'], newValues);
```

No-op if the current scene has no params.

---

## Shader cache

`M13Engine` caches the GPU shader pipeline by SHA-256 hash of the compiled WGSL. Two consecutive `loadScene()` calls with the same scene structure → no pipeline rebuild (only the matParams buffer is updated if values changed).

This means:
- Editing material params in a live editor is fast (no shader recompile, just `writeBuffer`).
- Hot-reloading the same scene is effectively a no-op.
- Different scenes always get fresh pipelines.

Single-entry cache (only the last shader is retained). For multi-scene LRU, you'd build it on top.

---

## Determinism

`compileScene` is deterministic byte-for-byte:
- Concepts referenced are sorted lexicographically before injection.
- All numeric literals are formatted with `.toFixed(6)`.
- Object order in the scene is preserved (matters for `obj0..objN` index assignment).
- Same `.m13` input → same WGSL → same SHA-256 hash.

Test verified by 100-run hash collision tests across 4 demo scenes.

---

## Architecture

```
.m13 (YAML text)
  ↓
parseScene + Zod validation
  ↓
M13Scene (typed AST)
  ↓
compileScene
  ├─ collectConceptIds (sorted)
  ├─ buildMatParamsLayout (validates user params against concept paramsSchema)
  ├─ generateMapFunction (room SDF + objects SDFs + window cut)
  ├─ generateMaterialFunction (position-based dispatch to mat_<id>())
  └─ assemble: COMMON + MatParams struct + concepts material WGSL +
                concepts SDF WGSL + map() + material() + RAYMARCH
  ↓
CompiledScene { wgsl, scene, conceptsUsed, matParams }
  ↓
initRenderer (WebGPU pipeline creation, conditional MAT_PARAMS buffer)
  ↓
renderFrame loop (writeUniforms per-frame, setBindGroup, draw(3))
```

The renderer draws ONE fullscreen triangle per frame; the fragment shader does all the raymarching.

---

## What this engine does NOT do (yet)

- Polygon meshes — `.obj`, `.fbx`, `.gltf` are not loaded. We're SDF + procedural only.
- Multiplayer — local-first by design (see `constitution.md` §3.1).
- Physics — out of scope for v0.1.
- Gaussian splats — planned Phase 4.
- WebXR — planned Phase 5.

See the root `docs/spec/` for the phase roadmap.

---

## Related packages

- [`@m13/synth`](../synth/README.md) — material + geometric concept library.
- [`@m13/examples`](../examples/) — Vite demo app with 4 scenes (sala, galería, loft, templo).
- Root `m13-spec/v0.1.md` — formal specification of the `.m13` format.

---

## License

Internal NeoNodos research. Open licensing TBD (post-Phase 3 per `constitution.md` §8.4).
