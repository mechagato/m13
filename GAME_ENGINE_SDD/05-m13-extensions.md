# 05 — Extensiones `.m13` (v0.3 gameplay overlay)

Documento central del SDD. Fuente visual actual: `m13-spec/v0.1.md` + `packages/runtime/src/parser/schema.ts`.

| Versión | Qué es |
|---|---|
| `0.1` | Escena visual (objects, light, ambient, window, sky) |
| `0.2` | + timeline animate + `events: light_flash` (shader) |
| `0.3` propuesta | + claves **opcionales** de gameplay |

Renderer **no** entiende gameplay. Overlay parser extrae claves v0.3 y entrega un doc visual-safe al compiler. No reutilizar `events` v0.2 para triggers: esos son `light_flash`. Gameplay usa `zones[].on_enter`.

## Top-level nuevos (todos opcionales)

`game`, `items`, `loot_tables`, `npcs`, `zones`, `missions`, `spawners`, `portals`, `crafting`, `education` (passthrough), `quizzes` (passthrough), `plugins`.

Un v0.3 sin `game` es escena visual.

## `game`

```yaml
game:
  mode: survival          # survival | sandbox | spectator
  seed: 42                # u32 obligatorio si hay spawners/AI
  tick_hz: 20
  interact_range: 2.0
  player:
    spawn: [0, 0, -8]
    health: 100
    hunger: 100
    inventory_capacity: 16
    hotbar: 5
  bounds_policy: clamp    # clamp | kill | wrap
```

Sin API keys ni URLs.

## `items` / `loot_tables`

Items: id snake_case, name, stack, tags, hunger_restore?.
Loot: rolls + entries `{ item, count: [min,max], weight }` — PRNG del mundo, nunca `Math.random`.

## `npcs`

Metadata sobre un `objects[].id` existente (no nuevo `kind` del compiler).
`role`, `health`, `ai.profile: idle|wander|flee`, `loot`.

## `zones`

AABB o esfera. Ops MVP: set_flag, grant_item, start_mission, hurt, heal, teleport, open_save.

## `missions`

steps con `require: { item, count }` o `{ flag }`. reward = mismas ops.
`quizzes` se conservan para hosts educativos; survival no las corre.

## `crafting`

1 workbench + 5 recipes (hacha, antorcha, caldo, + 2 de contrato). Consumo atómico.

## Sidecar `.m13save` (NO es `.m13`)

```yaml
save_version: 1
scene_name: valle_semilla
scene_hash: "…"
tick: 1840
rng_state: 1042294
player: { position, rotation, hp, hunger, inventory, hotbar, flags, missions }
```

No entra a compileScene. No se comparte en `#scene=`.

## Qué no entra al YAML

JS, WGSL, expresiones, binarios, meshes, URLs, secrets, historial del LLM.

## Compat

Overlay lee 0.1/0.2 como “sin game”. Listas en plural (`npcs`, no `npc`).

## Criterio de hecho

`sala_galeria.m13` → game undefined. Fixture v0.3 valida Zod overlay. Strip produce doc aceptable por parseScene actual.
