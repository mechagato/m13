# 02 — ECS mínimo

## Propósito

Mundo de entidades con componentes planos, sistemas en orden fijo. Suficiente para Survival Sandbox. No es EnTT/Bevy/Flecs.

## Modelo

- `EntityId`: `u32` monotónico. `0` inválido.
- `World`: mapas `ComponentType → Map<EntityId, Data>`.
- Sin arquetipos en MVP. < 2k entidades.
- spawn/despawn al inicio o fin de tick (cola de comandos).

## Componentes MVP

| Componente | Campos | Fuente `.m13` | Notas |
|---|---|---|---|
| `Position` | `x,y,z: f32` | objects/npcs | metros |
| `Rotation` | `x,y,z: f32` | rotation grados Euler XYZ | igual v0.1 |
| `Scale` | `x,y,z: f32` | scale | |
| `Velocity` | `x,y,z: f32` | default 0 | euler; física = F2 |
| `Health` | `hp, max, alive` | health | |
| `Inventory` | `slots[], capacity` | player | |
| `Quest` | `id, state, progress` | missions | locked\|active\|done\|failed |
| `AI` | `profile, target?, cooldown` | npcs.ai | stub idle/wander |
| `Animation` | `clip, t` | — | stub |
| `Audio` | `event?, gain` | — | stub |
| `VisualRef` | `objectId` | objects.id | |
| `Tags` | `string[]` | tags | |

No hay Mesh/Material en el ECS.

## Sistemas (orden fijo)

1. CommandFlush 2. InputApply 3. AIStub 4. IntegrateVelocity 5. TriggerZones 6. Interact 7. Needs 8. Quest 9. PresentationSync

Fase 2: Physics entre 4-5, Combat entre 6-7.

## API pública

```
World.create / bootstrap / step / get / query / emit / on / presentation / toSave
InputFrame: tick, axes {-1|0|1}, lookYaw centideg, actions[]
```

## Qué NO hace

Colisiones, pathfinding, pipelines GPU, eval de mods.

## Criterio de hecho

1000 steps misma semilla + mismos inputs ⇒ save idéntico. Sin renderer.
