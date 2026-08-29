# START HERE — M13 Game Engine SDD

**Documento:** diseño solamente  
**Repo ancla:** [mechagato/m13](https://github.com/mechagato/m13)  
**Fecha:** 2026-08-28 (rev. unificación v0.3)  
**Estado:** draft para aprobación  
**Código de motor en esta entrega:** cero

## Qué es esto

Diseño de cómo m13 gana **gameplay** sin tocar el renderer WebGPU, el compilador WGSL ni el runtime de raymarch.

El juego que justifica los módulos **nuevos** de este SDD:

> **AI Survival Sandbox** — local-first, generado por IA, archivos `.m13`.

No se diseña Unity. Se diseñan contratos sobre **un solo** `.m13` v0.3 modular.

## Regla de versión (obligatoria)

| Versión | Qué es |
|---|---|
| **v0.1 / v0.2** | Escena **visual** (SDF). Intocable. `events` v0.2 = `light_flash` de shader. |
| **v0.3** | Escena visual **+ módulos opcionales**. Un solo número. |

v0.3 no es “el formato del survival”. v0.3 es el formato **modular** con dos perfiles de producto:

| Módulo | Perfil | Estado |
|---|---|---|
| `education:` | Vertical 1 — capacitación / lección guiada | **Ya existe** en el studio educativo (visor + AI Authoring Kit). English Lab, supermercado, residuos, aula. |
| `game:` | Vertical 2 — AI Survival Sandbox | **Lo que este SDD aporta.** No shipped como loop de juego. |

Un archivo `version: "0.3"` puede traer `education`, `game`, **ambos**, o **ninguno**. Sin ninguno es solo visual (equivalente funcional a v0.2 para el renderer).

El renderer **no entiende** `education` ni `game`. Ambos se *stripean* antes de `compileScene`.

## Qué hay hoy (hechos)

| Capa | Hecho |
|---|---|
| `@m13/runtime` en `mechagato/m13` | Parser visual v0.1/v0.2 + WebGPU SDF. **No** ejecuta lecciones ni survival. |
| Studio / AI Authoring Kit (Vertical 1) | **Ya emite y consume** `.m13` v0.3 con `education`, `npc` (singular), `missions` (`objective.talk | interact | quiz | enter_zone`), `quizzes`, `zones`, events educativos, `player`, `ui.hud: education`. Eso **no es hipotético**. |
| Vertical 2 (`game`) | Diseñado aquí. No implementado. |

Este SDD **no** rebautiza Vertical 1 como “passthrough inventado”. El host educativo **sí** ejecuta `education` / `quizzes` / `objective.*`. El host survival **no** los trata como combate. Comparten documento, no loop.

## Cómo leer

1. `00-philosophy.md` — leyes (§8 = compat modular).
2. `05-m13-extensions.md` — **contrato de datos unificado**.
3. `01-architecture.md` + `diagrams/`.
4. `02`–`03` + `08` — ECS y contratos **del módulo `game`**.
5. `06`–`07`, `04`, `09`–`10`.

## Qué queda fuera de esta sesión

- Código, schema Zod, fixtures de engine, ECS, Survival implementado.
- PRs de código. Merge a `main`.
- Tocar renderer / WGSL / runtime.
- Un segundo número de versión (v0.4) para evadir el conflicto.
- Reescribir el visor educativo.

## Criterio de aprobación

1. v0.3 es un número, dos módulos.
2. English Lab v0.3 actual sigue siendo v0.3 válido.
3. `npc` es la colección canónica; `npcs` solo alias deprecado.
4. El primer PR de código, **cuando se apruebe este draft**, acepta `education` ya existente **y** `game` nuevo — no un v0.3 solo-survival.
