# 00 — Filosofía (no negociable)

Estas leyes vinieron de `constitution.md` del repo y de esta sesión. Si un diseño las viola, el diseño está mal.

## 1. Local-first

El mundo se ve y se juega **en el dispositivo**. Red es Fase 3. Save en disco (o IDB / File System Access). Un LLM en la nube puede **escribir** `.m13` en editor-time; nunca es requisito para un tick de juego ni para un frame.

## 2. WebGPU ya existe y es un plugin

`@m13/runtime` sintetiza la escena. El gameplay **no llama WebGPU**, no importa WGSL, no toca `compileScene`. El renderer **consume** una vista de escena (objetos con transform + concept). Si mañana el renderer se sustituyera por un stub headless, el tick de juego seguiría siendo testeable.

## 3. Escenas declarativas `.m13`

La fuente de verdad del **mundo autorado** es YAML semántico. No hay “prefabs binarios” ni `.unity`. Si la IA no puede emitirlo como YAML validable, no es parte del contrato de generación.

## 4. Generación semántica / IA = editor-time

Constitution §3.7: LLM fuera del runtime. El Survival Sandbox se *genera* (escena, loot tables, misiones) y luego se *juega* de forma determinista. Re-generar mid-run solo está permitido como **diff aplicado entre ticks**, validado, con seed explícita — nunca como “el modelo decide el daño este frame”.

## 5. Renderer desacoplado del gameplay

```
autoría (.m13) → parse → WorldState (gameplay)
                              ↓ snapshot de presentación
                         renderer plugin (intocable)
```

Animaciones visuales v0.1 (`bob` / `rotate` / `pulse`) y keyframes v0.2 viven en el **compilador visual**. El gameplay no las reimplementa. Si un NPC camina, el gameplay escribe `Position` / `Rotation`; el renderer solo ve el objeto actualizado en la escena efectiva.

## 6. Determinismo

`misma semilla + mismo .m13 + mismos inputs de jugador (muestreados en tick fijo) => mismo WorldState`.

- PRNG del mundo: `seed` en el bloque `game`.
- El compilador visual ya es determinista; no se ensucia.
- El LLM **no** es fuente de aleatoriedad de runtime.
- Reloj: tick fijo (`dt` lógico), no `requestAnimationFrame`.

## 7. Modularidad y plugins

Un tercero añade un sistema (hambre, bioma, facción) **sin** fork del renderer y **sin** editar el núcleo ECS. Contratos: componentes registrados, eventos, y campos `.m13` namespaced (`plugins.<id>`).

## 8. Compatibilidad hacia atrás

- `version: "0.1"` y `"0.2"` siguen parseando y renderizando.
- Claves nuevas de v0.3 son **opcionales**.
- Un documento v0.3 **sin** bloque `game` es una escena visual (el renderer no cambia).
- Un documento v0.1 con claves desconocidas en raíz ya produce *warning*, no crash — se mantiene esa política para metadata.
- Quizzes / education, si aparecen, son **datos passthrough** para host apps; el motor de survival no los ejecuta como combate.

## 9. Ancla de producto

No se diseña “soportar todos los géneros AAA”. Se diseña lo que el **AI Survival Sandbox** necesita. RPG, FPS, crafting profundo, co-op, gemelos digitales quedan *posibles* porque los contratos son datos + sistemas, no porque se implementen ahora.

## 10. Honestidad de alcance

Este SDD no afirma que el repo ya es un game engine. Afirma **cómo dejaría de no serlo** sin romper lo que sí es: un sintetizador local de mundos.
