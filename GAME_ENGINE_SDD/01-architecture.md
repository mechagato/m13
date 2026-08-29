# 01 — Arquitectura

## 1. Propósito

Separar **tres relojes** que hoy están mezclados en la cabeza de cualquiera que mire el repo:

| Reloj | Dueño | Frecuencia | Puede fallar |
|---|---|---|---|
| Frame (GPU) | `@m13/runtime` | rAF / XR | sí, se dropea |
| Tick (juego) | `@m13/gameplay` (futuro) | fijo, p.ej. 20 Hz | no — se simula catch-up |
| Autoría (IA) | MCP / generator / editor | humana o batch | sí — se valida o se descarta |

## 2. Capas

```
Host (app, demo survival, NO el visor educativo)
  input · HUD · file picker · save slots
        |
        +--> @m13/gameplay     +--> AI Authoring Kit
        |    World · ECS · systems    MCP + format-guide +
        |    save/load · plugins      schema v0.3 + diffs
        |           | snapshot                 | escribe .m13
        v           v                          v
        .m13 YAML  +  .m13save sidecar
                    |
                    v parse visual (existente)
        @m13/runtime  (PLUGIN DE PRESENTACIÓN — INTOCABLE)
        parseScene v0.1/v0.2 · compileScene · WebGPU · XR
```

Regla: las flechas **nunca** van de gameplay hacia `GPUDevice`, `WGSL` o `initRenderer`.

## 3. Dos documentos, un mundo

| Archivo | Quién lo escribe | Qué contiene | Determinista |
|---|---|---|---|
| `*.m13` | humano / LLM / generator | mundo autorado + tablas | sí, con `game.seed` |
| `*.m13save` | runtime de gameplay | progreso: inventario, tick, HP, quest flags | sí, dado el `.m13` + log de inputs |

**Por qué sidecar y no inflar el `.m13`:** el descriptor autorado debe poder regenerarse / compartirse (URL `#scene=` ya existe para visual). El save es sucio, por jugador, y no debe romper el hash de escena ni el compilador WGSL.

Justificación del sidecar:

- El renderer y `compileScene` no deben ver HP ni stacks.
- Un save no es semántica de mundo; es estado de corrida.
- Versionado independiente: `save_version: 1` vs `version: "0.3"`.

## 4. Flujo de una sesión

1. Host carga `forest_seed42.m13`.
2. Parser **visual** (`parseScene`) produce `M13Scene`. Campos v0.3: overlay los extrae **antes** de pasar un documento *stripped* al compiler.
3. Parser **gameplay** extrae `game`, `npcs`, `zones`, `missions`, `items`, `loot_tables`, `spawners`, `portals`.
4. `World.bootstrap(scene, save?)` crea entidades.
5. Loop: InputFrame → `World.step` → presentation snapshot. `loadScene` solo si hay cambio estructural.
6. Save → `.m13save`.

## 5. Problema real del renderer actual

Hoy `objects[*].position` está **horneado en el WGSL**. Mover un NPC cada tick no puede hacerse recompilando el shader.

**Opción A (preferida, post-SDD):** buffer de transforms escrito por CPU. Toca compiler/renderer — no se implementa aquí.

**Opción B (MVP headless):** simular sin pintar movimiento. Gameplay no espera a WebGPU para existir.

## 6. Política “cuándo se recompila”

| Cambio | ¿Recompile WGSL? |
|---|---|
| HP, inventario, quest flag | no |
| Position / Rotation / Scale de entidad existente | no (A) / n/a (B) |
| Nuevo concept / structure | sí |

`PresentationDirty = { transforms | visibility | structure }`.

## 7. Frontera de imports

```
@m13/gameplay  --x-->  @m13/runtime/renderer
@m13/gameplay  --x-->  WGSL / GPUDevice
host           --✓-->  ambos paquetes
@m13/runtime   --x-->  @m13/gameplay
```

## 8. Reloj

- `TICK_HZ = 20`. `maxCatchUp = 5`. Inputs al inicio del tick.

## 9. Qué NO hace

- Segundo renderer, Three.js como scene graph, netcode, quizzes como combate, LLM en `World.step`.

## 10. Criterio de hecho

- `World` desde `.m13` v0.3 en Node, sin canvas.
- Escenas v0.1 de examples siguen compilando.
- Tests de tick no importan renderer/compiler.
