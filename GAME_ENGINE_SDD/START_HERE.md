# START HERE — M13 Game Engine SDD

**Documento:** diseño solamente  
**Repo ancla:** [mechagato/m13](https://github.com/mechagato/m13) @ `main` (`b4711e10`)  
**Fecha:** 2026-08-28  
**Estado:** draft para aprobación  
**Código de motor en esta entrega:** cero

## Qué es esto

Diseño de cómo **m13 deja de ser solo un sintetizador de mundos** y se convierte en **motor de gameplay**, sin tocar el renderer WebGPU, el compilador WGSL ni el runtime de raymarch.

El juego que justifica cada módulo:

> **AI Survival Sandbox** — local-first, generado por IA, persistido en `.m13` + sidecar de save.

No se está diseñando Unity. Se están diseñando **contratos sobre el formato `.m13`**.

## Qué hay hoy en el repo (hechos, no deseos)

El runtime real **no** tiene NPC, misiones, quizzes, zonas de gameplay ni inventario.

| Capa | Estado en `mechagato/m13` |
|---|---|
| Formato `.m13` | v0.1 (escena visual) + v0.2 (keyframes + `events: light_flash`) |
| Parser | Zod en `packages/runtime/src/parser/schema.ts` |
| Renderer | WebGPU SDF raymarch, **intocable** |
| Autoría IA | MCP `get_m13_format_guide` + `@m13/generator` + editor experimental — **editor-time only** |
| Determinismo visual | `compileScene` byte-a-byte + hash WGSL |
| Gameplay / ECS | **no existe** |
| Visor educativo (English Lab, supermercado, residuos, aula) | **fuera de este SDD** — no mezclar |

Cuando el prompt de esta sesión habla de “`.m13` v0.3 con objects, npc, missions, quizzes, zones, events, education”, se interpreta así:

- `objects` + `events` **ya existen** (visual / temporal).
- `npc`, `missions`, `quizzes`, `zones`, `education` son **extensiones propuestas de v0.3 gameplay**, no código shipped.
- Un `.m13` educativo v0.3 hipotético o un v0.1 actual **debe seguir abriendo** en el renderer: las claves de gameplay se ignoran al compilar WGSL.

## Cómo leer este SDD

1. `00-philosophy.md` — leyes.
2. `01-architecture.md` + `diagrams/` — capas y dependencias.
3. `05-m13-extensions.md` — **el documento más importante** (el contrato de datos).
4. `02-ecs.md` + `03-gameplay-framework.md` — sistemas MVP.
5. `08-survival-sandbox-contracts.md` — el juego ancla, aún no el juego.
6. `06-plugin-sdk.md` + `07-ai-integration.md` — cómo crece sin romper el núcleo.
7. `04-physics.md` — Fase 2, interfaces vacías.
8. `09-roadmap.md` + `10-testing-and-risks.md`.

## Qué queda fuera (ley de esta sesión)

- Código de producción, ECS implementado, física, red.
- Reescribir renderer / WGSL / compiler.
- Motor paralelo en React / Three.js.
- Implementar Survival Sandbox.
- GDD de 40 sistemas al mismo nivel de detalle.
- Mezclar el visor educativo con el gameplay loop.

## Criterio de aprobación

Apruebas este SDD si:

1. La frontera renderer ↔ gameplay es clara.
2. v0.1 / v0.2 siguen siendo documentos válidos.
3. Todo estado generable por IA cabe en `.m13` v0.3 o en un sidecar justificado.
4. El Survival Sandbox tiene contratos suficientes para un primer PR de **schema + sim headless**, no de shaders.
