# @m13/synth

> Procedural material and geometric concept library for the m13 engine.

**Version:** 0.1.0
**Bootstrap concepts:** 8
**Target catalog (v0.1):** 14

---

## What is a "concept"?

A **concept** is a reusable unit of procedural synthesis. Each concept exports:

- A material WGSL function: `fn mat_<id>(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32>`
- Optionally a geometric SDF: `fn sdf_<id>(p: vec3<f32>, scale: vec3<f32>) -> f32` (for `kind: 'concept'`)
- Optionally a Zod params schema with editable knobs
- Optionally a `defaults` object

Concepts are pure data + WGSL strings. The `@m13/runtime` compiler stitches them into the assembled shader.

---

## Bootstrap catalog (v0.1 — 8 concepts)

| ID | Category | Description |
|---|---|---|
| `pared_yeso_blanco` | wall | Neutral white plaster with micro-texture |
| `pared_ladrillo_viejo` | wall | Old red brick with procedural mortar (audio-reactive) |
| `piso_madera_envejecida` | floor | Aged hardwood with sinusoidal grain |
| `piso_concreto_industrial` | floor | Polished industrial concrete with speckle |
| `marmol_blanco_vetas` | universal | White marble with procedural veins |
| `piedra_volcanica` | universal | Dark volcanic stone (Aztec/temple aesthetic) |
| `metal_dorado_pulido` | object | Polished matte gold (audio-reactive shimmer) |
| `cuero_vintage` | object | Aged leather with pores and crackling |

---

## Categories

| Category | Where it's valid | Notes |
|---|---|---|
| `wall` | scene `walls`, ceiling overrides | Often shared with universal |
| `floor` | scene `floor` | |
| `ceiling` | scene `ceiling` | |
| `object` | `objects[].material` | Object-only materials |
| `universal` | any surface | Cross-cuts wall/floor/ceiling/object |
| `object_geo` | `objects[]` with `kind: concept` | Declares its own SDF + material |

---

## Adding a new material concept (≤ 30 minutes)

### 1. Create the file

`packages/synth/src/concepts/<your_id>.ts`. Naming: `snake_case`, Spanish identifiers for materials (domain-specific).

```typescript
import type { Concept } from '../index.js';

export const azulejoTalavera: Concept = {
  id: 'azulejo_talavera',
  category: 'wall',
  description: 'Talavera tile with hand-painted-like blue patterns (Puebla, México).',
  wgsl: /* wgsl */ `
fn mat_azulejo_talavera(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let tile = fract(p.xy * 6.0);
  let dist = length(tile - vec2<f32>(0.5));
  let pattern = step(0.2, dist);
  let baseBlue = vec3<f32>(0.18, 0.32, 0.62);
  let cream = vec3<f32>(0.96, 0.94, 0.85);
  return mix(baseBlue, cream, pattern);
}
`,
};
```

**Rules of the WGSL function:**
- Signature MUST be `fn mat_<id>(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32>`.
- `p` is the world-space surface point.
- `n` is the surface normal (already normalized).
- `audioAmp` is microphone amplitude 0..1 (smoothed). Use it freely for reactive effects.
- The function must be **pure** — no side effects, no global state. Same `p` → same color always.
- Return color in linear RGB 0..1. The post-process applies tonemapping + gamma + vignette.

### 2. Register it

In `packages/synth/src/index.ts`, add the import and registry entry:

```typescript
import { azulejoTalavera } from './concepts/azulejo_talavera.js';

const RAW_CONCEPTS: Concept[] = [
  // ...existing...
  azulejoTalavera,
];
```

### 3. Use it in a scene

```yaml
version: "0.1"
name: bano_mexicano
walls:
  concept: azulejo_talavera
floor: { concept: piso_marmol_blanco }
ceiling: { concept: pared_yeso_blanco }
```

Open the editor or examples app — your concept renders.

### 4. (Optional) Make it parametrizable

Add a `paramsSchema` and `defaults`:

```typescript
import { z } from 'zod';
import type { Concept } from '../index.js';

export const azulejoTalavera: Concept = {
  id: 'azulejo_talavera',
  category: 'wall',
  description: 'Talavera tile (Puebla, México).',
  paramsSchema: z.object({
    blueIntensity: z.number().min(0).max(1),
    tileScale: z.number().min(1).max(20),
  }),
  defaults: { blueIntensity: 0.7, tileScale: 6.0 },
  wgsl: /* wgsl */ `
fn mat_azulejo_talavera(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let scale = matParams.azulejo_talavera_tileScale;
  let intensity = matParams.azulejo_talavera_blueIntensity;
  let tile = fract(p.xy * scale);
  let dist = length(tile - vec2<f32>(0.5));
  let pattern = step(0.2, dist);
  let baseBlue = vec3<f32>(0.18 * intensity, 0.32 * intensity, 0.62 * intensity);
  let cream = vec3<f32>(0.96, 0.94, 0.85);
  return mix(baseBlue, cream, pattern);
}
`,
};
```

Now scenes can override:

```yaml
walls:
  concept: azulejo_talavera
  params:
    blueIntensity: 0.9
    tileScale: 8
```

The runtime validates these params against the Zod schema and injects them as uniforms accessible via `matParams.<id>_<paramName>`.

**Param restrictions in v0.1:**
- Only `z.number()` (f32). Other types (boolean, enum, vec3) come in v0.2.
- Max 64 floats total across all concepts in a scene (256-byte buffer budget).

---

## Adding a geometric concept (with custom SDF)

For things like `pedestal_marmol`, `lampara_colgante`, `esfera_decorativa`, `cubo_basico` — concepts that declare both a shape AND a material.

```typescript
import type { Concept } from '../index.js';

export const pedestalMarmol: Concept = {
  id: 'pedestal_marmol',
  category: 'object_geo',
  description: 'Marble pedestal with adjustable proportions.',
  wgsl: /* wgsl */ `
fn mat_pedestal_marmol(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  // Marble look — could reuse marmol_blanco_vetas internally
  let veins = fbm(p * 3.0, 4);
  return vec3<f32>(0.95 - veins * 0.1, 0.93 - veins * 0.12, 0.88);
}
`,
  wgslSdf: /* wgsl */ `
fn sdf_pedestal_marmol(p: vec3<f32>, s: vec3<f32>) -> f32 {
  // Rounded box with chamfered top
  let q = abs(p) - s;
  return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.02;
}
`,
};
```

**Rules of the SDF function:**
- Signature MUST be `fn sdf_<id>(p: vec3<f32>, scale: vec3<f32>) -> f32`.
- `p` is the local-space point (the compiler already subtracts object position + animation offset).
- `scale` is the object's scale from the `.m13`.
- Return signed distance (negative inside, positive outside).
- Combine SDFs with `min`/`max` for unions/intersections, see `runtime/src/shaders/common.ts` for primitives.

Usage in a scene:

```yaml
objects:
  - id: pedestal
    kind: concept                  # ← key change
    concept: pedestal_marmol       # ← which geo concept
    position: [0, -2.5, 0]
    scale: [0.5, 0.4, 0.5]
    # NO material field needed — the concept supplies its own
```

---

## The `manifest()` API

Each registered concept gets a `manifest()` method attached by the registry (you don't write it). It returns JSON-serializable metadata:

```typescript
import { listManifests } from '@m13/synth';

const manifests = listManifests();
// [
//   { id: 'pared_yeso_blanco', category: 'wall', description: '...',
//     hasGeometricSDF: false, hasParams: false },
//   { id: 'azulejo_talavera', category: 'wall', description: '...',
//     hasGeometricSDF: false, hasParams: true, defaults: {...},
//     paramsJsonSchema: {/* JSON Schema draft-07 */} },
//   ...
// ]
```

This feeds:
- The editor UI (D-4) to dynamically render param sliders.
- The LLM editor-time prompt (T-051) — manifests become part of the system context so the LLM knows which concepts exist and what params they accept.
- Bundle exports (T-055) — included with `.m13` so the bundle is self-describing.
- Telemetry (T-056) — anonymously track which concepts get used.

---

## Best practices for WGSL concept code

1. **Use the noise helpers** from `runtime/src/shaders/common.ts`: `hash3`, `noise3`, `fbm`. They're already in scope.
2. **Avoid expensive operations** at the per-fragment level — every concept WGSL runs per pixel per frame. Keep `fbm` octave count ≤ 4 unless visually justified.
3. **Test in multiple scenes** — a concept that looks great as a wall might be terrible on a floor (different normals + lighting angles).
4. **Document the visual intent** in `description` — it appears in catalogs and helps the LLM editor.
5. **Don't hardcode lighting** — the engine's `shade()` already does diffuse + spec + AO + soft shadows on top of your color. Just return the **albedo color**.
6. **Audio reactivity is optional but cheap** — `audioAmp` is already a uniform. Use it for subtle effects (intensity oscillation, color shift). Don't make the room flash like a strobe.

---

## Catalog roadmap (Phase 1)

After the current 8, we'll add 6 more materials and 4 geometric concepts:

- **Materials:** `pared_concreto_pulido`, `pared_madera_oscura`, `piso_marmol_blanco`, `metal_oxidado`, `metal_bronce_pulido`, `vidrio_esmerilado`
- **Geo:** `pedestal_marmol`, `lampara_colgante`, `esfera_decorativa`, `cubo_basico`

See `docs/tasks/phase-1-tasks.md` (T-025..T-034) for individual task breakdowns.

---

## License

Internal NeoNodos research. See root `constitution.md`.
