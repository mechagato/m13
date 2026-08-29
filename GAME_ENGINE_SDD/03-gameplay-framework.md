# 03 — Gameplay framework

## Propósito

Entidades de diseño que el Survival Sandbox instancia desde YAML.

## Catálogo MVP

| Kind | Tags | Componentes | Rol |
|---|---|---|---|
| `Player` | `player` | Position, Rotation, Velocity, Health, Inventory, QuestLog | 1 jugador local |
| `Npc` | `npc` + roles | Position, Rotation, Health?, AI, VisualRef | fauna / enemigo stub |
| `Item` | `item` | ItemDef | catálogo |
| `Spawner` | `spawner` | Spawner | presupuesto + tabla |
| `Checkpoint` | `checkpoint` | Zone | respawn |
| `Portal` | `portal` | Portal | intra-escena u otro `.m13` |
| `Loot` | `loot` | LootPile | stacks en suelo |
| `SavePoint` | `savepoint` | Zone | escribe `.m13save` |
| `Mission` | dato | Quest | progreso |
| `Workbench` | `workbench` | Crafter | 1 estación |

## Inventario

Ops MVP: pickup, drop, stack, hotbar_select. No trading ni subastas.

## Zones

Volúmenes AABB/esfera. Ops: grant_item, start_mission, set_flag, hurt/heal, teleport, open_save. Sin scripts. Sin run_shader.

`quizzes` y `dialog` se exponen al host; survival no los ejecuta como combate.

## Persistencia

Sidecar `.m13save`: save_version, scene_hash, tick, rng_state, player, world_entities delta.
Hash distinto ⇒ load falla explícito.

## Criterio de hecho

Pickup 3 → drop 1; zona activa quest; portal mueve en un tick. Tests sin WebGPU.
