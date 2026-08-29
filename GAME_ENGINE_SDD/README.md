# GAME_ENGINE_SDD

Software Design Document — capa de gameplay de m13.

| | |
|---|---|
| Repo | https://github.com/mechagato/m13 |
| Alcance | Solo diseño. Cero código de engine. |
| Ancla | AI Survival Sandbox (local-first, `.m13`) |
| Renderer | `@m13/runtime` — fuera de alcance de modificación |
| Formato base | `.m13` v0.1 / v0.2 existentes; extensiones propuestas v0.3 |

Empieza en [`START_HERE.md`](./START_HERE.md).

## Índice

| Archivo | Contenido |
|---|---|
| [START_HERE.md](./START_HERE.md) | Cómo leer y qué es verdad hoy |
| [00-philosophy.md](./00-philosophy.md) | Leyes |
| [01-architecture.md](./01-architecture.md) | Capas, paquetes futuros, flujo |
| [02-ecs.md](./02-ecs.md) | ECS mínimo MVP |
| [03-gameplay-framework.md](./03-gameplay-framework.md) | Player, NPC, items, triggers, save |
| [04-physics.md](./04-physics.md) | Fase 2 — interfaces vacías |
| [05-m13-extensions.md](./05-m13-extensions.md) | Extensiones YAML v0.3 |
| [06-plugin-sdk.md](./06-plugin-sdk.md) | Cómo un tercero añade un sistema |
| [07-ai-integration.md](./07-ai-integration.md) | LLM emite `.m13` / diffs |
| [08-survival-sandbox-contracts.md](./08-survival-sandbox-contracts.md) | Contratos del juego ancla |
| [09-roadmap.md](./09-roadmap.md) | MVP → Beta → 1.0 (S/M/L) |
| [10-testing-and-risks.md](./10-testing-and-risks.md) | Tests y riesgos honestos |
| [diagrams/architecture.md](./diagrams/architecture.md) | Diagrama de capas |
| [diagrams/module-deps.md](./diagrams/module-deps.md) | Dependencias |

## Paquetes futuros (nombres reservados, no creados aquí)

- `@m13/gameplay` — ECS + sim + persistencia
- `@m13/m13-game-schema` — Zod v0.3 overlay (puede vivir primero en `m13-spec/`)
- `@m13/game-plugins` — SDK de plugins
- Host app (no este repo demo educativo) — input + HUD + carga de saves

El renderer permanece en `@m13/runtime`.
