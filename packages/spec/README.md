# @m13/spec

Headless Zod overlay for `.m13` **v0.3 modular**.

- Visual scene remains v0.1 / v0.2 in `@m13/runtime` (untouched).
- Vertical 1 `education` accepts the **existing kit/studio** fields (English Lab, supermercado).
- Vertical 2 `game` plus catalogs (`items`, `loot_tables`, `spawners`, `portals`, `crafting`).
- `npc` is canonical; `npcs` is a deprecated alias.
- `stripToVisual()` drops module keys so `parseScene` v0.1/v0.2 still accepts the document.

This package does **not** import the renderer, compiler, WebGPU or `compileScene`.

```ts
import { parseOverlay, stripToVisual } from '@m13/spec';

const { overlay, visual, warnings } = parseOverlay(yaml);
// visual → parseScene / validateScene from @m13/runtime parser
```

CLI (parser only, no GPU):

```
npx tsx tools/validate-overlay.ts path/to/scene.m13
```
