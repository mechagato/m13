# 04 — Physics (Fase 2 — interfaces vacías)

Este capítulo **no** diseña un motor de física. Reserva contratos.

## Por qué no es MVP

El ancla se simula con movimiento XZ, `bounds`, zonas AABB e interact por distancia. Colisión real no desbloquea pickup, hambre, 5 recetas ni 1 enemigo stub.

## Interfaces reservadas

```
PhysicsWorld.step / raycast / overlaps
CharacterMotor.move
Collider { shape: aabb|sphere|capsule, layers }
```

Ningún sistema MVP las llama.

## Relación con WebGPU / SDF

Mundo visual = SDF GPU. Mundo lógico = AABB CPU. No raymarch de colisión en el shader. Aproximación: bounds de objeto + plano de suelo.

## Qué NO se hace ahora

Rapier/cannon, character controller, gravity obligatoria, destructibles.

## Criterio de hecho (Fase 2)

Swap de integración por PhysicsWorld sin cambiar YAML v0.3.
