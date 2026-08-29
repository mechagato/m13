# Diagrama — dependencias de módulos

```mermaid
flowchart LR
  Schema["m13-spec v0.3 overlay"]
  ECS["ECS core"]
  GP["Gameplay framework"]
  Inv["Inventory"]
  Trig["Triggers / zones"]
  Persist["Persistencia local"]
  AIStub["AI component stub"]
  Plug["Plugin SDK"]
  Surv["Survival contracts"]
  Phys["Physics Fase 2"]
  Combat["Combat Fase 2"]
  Rend["@m13/runtime renderer"]

  Schema --> ECS
  Schema --> GP
  ECS --> GP
  GP --> Inv
  GP --> Trig
  GP --> Persist
  GP --> AIStub
  Plug --> ECS
  Surv --> GP
  Surv --> Inv
  Phys -.-> GP
  Combat -.-> GP
  GP -.->|"solo snapshot"| Rend
```

Líneas punteadas = no existen en MVP o no son dependencia de compilación.

## Orden legal de implementación (post-SDD)

1. Schema overlay + fixtures YAML  
2. ECS + tick headless  
3. Framework (player, item, zone, spawner, portal, save)  
4. Survival contracts encima  
5. Plugin SDK  
6. Integración de transforms con runtime (único PR que toca compiler, y con permiso explícito)

## Ciclos prohibidos

- `renderer → gameplay`
- `compiler → plugin de juego`
- `AI authoring → World.step`
