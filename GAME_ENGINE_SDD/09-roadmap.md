# 09 — Roadmap

Estimaciones **relativas** (S / M / L). Sin calendarios. No reescribe `docs/plans/` del renderer.

## Cierre de esta sesión

**Prohibido abrir PRs de código hasta que este SDD (draft docs) esté aprobado.**  
Este archivo solo ordena trabajo *posterior*. Cero schema, cero fixtures de engine, cero merge a `main` desde aquí.

## Leyenda

- **S** — un PR coherente, tests headless.
- **M** — varios PRs.
- **L** — cruza paquetes o toca runtime visual.

## Cuando el SDD se apruebe — primer PR de código

No es “v0.3 solo-survival”. Es:

**`feat(spec): v0.3 modular overlay — education existente + game nuevo + strip-to-visual`**

Debe:

1. Aceptar documentos Vertical 1 **ya existentes** (`education`, `npc`, `missions.objective`, `quizzes`, `zones`, `player`, `ui.hud: education`).
2. Aceptar el bloque `game` + catálogos V2 (`items`, `loot_tables`, `spawners`, `portals`, `crafting`).
3. Tratar `npcs` como alias deprecado de `npc`.
4. Strip-to-visual para `@m13/runtime` (v0.1/v0.2 intactos).
5. No implementar ECS, Survival jugable, ni shaders.

Tamaño: **S**. Sin ECS en ese PR.

## MVP Vertical 2 (después del schema)

| Ítem | Tamaño | Notas |
|---|---|---|
| Zod overlay education+game + validate CLI | **S** | primer PR, post-aprobación |
| ECS + tick + PRNG + save delta | **M** | solo módulo `game` |
| Framework: player, item, zone, spawner, portal, loot | **M** | `npc` compartida |
| Inventario pickup/drop/stack/hotbar | **S** | |
| Survival (hambre, 5 recetas, 1 enemy overlap) | **M** | |
| MCP format-guide: sección `game` **sin borrar** gía V1 | **S** | |
| Plugin registry local | **S** | |
| Host CLI headless `game` | **S** | no sustituye el studio |
| Transforms buffer en runtime | **L** | único toque al compiler; permiso aparte |

El studio / English Lab **no** se reescribe como survival.

## Fase 2 — interfaces

Physics, combat, crafting/building, NPC AI rica, animation/audio 3D, UI HUD de juego (`ui.hud` ≠ `education`).

## Fase 3 — nombrar

Vehículos, procedural world, economía, multiplayer+rollback, voice commands, mod marketplace.

## Fuera

- Neural ONNX / Gaussian Splatting (roadmap visual).
- Convertir demos EHS / templos / English Lab en sandbox.
- v0.4 como escape del conflicto de claves.
