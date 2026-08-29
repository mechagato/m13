# GAME_ENGINE_SDD

Software Design Document — capa de gameplay de m13.

| | |
|---|---|
| Repo | https://github.com/mechagato/m13 |
| Alcance | Solo diseño. Cero código de engine. |
| Ancla | AI Survival Sandbox (módulo `game`, Vertical 2) |
| Renderer | `@m13/runtime` — fuera de alcance de modificación |
| Formato | `.m13` v0.1 / v0.2 visual; **v0.3 modular** (`education` V1 shipped + `game` V2 este SDD) |

Empieza en [`START_HERE.md`](./START_HERE.md).

## Índice

| Archivo | Contenido |
|---|---|
| [START_HERE.md](./START_HERE.md) | Cómo leer y regla de versión |
| [00-philosophy.md](./00-philosophy.md) | Leyes (§8 compat modular) |
| [01-architecture.md](./01-architecture.md) | Capas |
| [02-ecs.md](./02-ecs.md) | ECS mínimo (módulo game) |
| [03-gameplay-framework.md](./03-gameplay-framework.md) | Framework game |
| [04-physics.md](./04-physics.md) | Fase 2 — interfaces vacías |
| [05-m13-extensions.md](./05-m13-extensions.md) | Contrato YAML v0.3 unificado |
| [06-plugin-sdk.md](./06-plugin-sdk.md) | Plugin SDK |
| [07-ai-integration.md](./07-ai-integration.md) | IA editor-time |
| [08-survival-sandbox-contracts.md](./08-survival-sandbox-contracts.md) | Contratos Vertical 2 |
| [09-roadmap.md](./09-roadmap.md) | MVP → Beta → 1.0 |
| [10-testing-and-risks.md](./10-testing-and-risks.md) | Tests y riesgos |
| [diagrams/architecture.md](./diagrams/architecture.md) | Capas |
| [diagrams/module-deps.md](./diagrams/module-deps.md) | Dependencias |

El renderer permanece en `@m13/runtime`. El studio V1 no se toca.
