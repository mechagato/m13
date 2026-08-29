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
autoría (.m13) → parse → WorldState (módulo education y/o game)
                              ↓ snapshot de presentación
                         renderer plugin (intocable)
```

Animaciones visuales v0.1 (`bob` / `rotate` / `pulse`) y keyframes v0.2 viven en el **compilador visual**. Ni el host educativo ni el de survival las reimplementan. Si un NPC camina, el módulo activo escribe `Position` / `Rotation`; el renderer solo ve el objeto actualizado.

## 6. Determinismo

`misma semilla + mismo .m13 + mismos inputs de jugador (muestreados en tick fijo) => mismo WorldState` — aplica al módulo `game`. Vertical 1 puede tener su propio reloj de lección; no se rediseña aquí.

- PRNG del mundo survival: `game.seed`.
- El compilador visual ya es determinista; no se ensucia.
- El LLM **no** es fuente de aleatoriedad de runtime.
- Reloj de `game`: tick fijo, no `requestAnimationFrame`.

## 7. Modularidad y plugins

Un tercero añade un sistema **sin** fork del renderer. En el YAML, primero se usan los módulos de primera clase (`education`, `game`); lo experimental va a `plugins.<id>`.

## 8. Compatibilidad hacia atrás (v0.3 modular)

- `version: "0.1"` y `"0.2"` no cambian: escena visual. Siguen abriendo en el renderer.
- `version: "0.3"` es **un** contrato con **módulos opcionales**, no dos formatos.
  - `education:` — Vertical 1, **ya shipped** en studio / AI Authoring Kit (English Lab y lecciones hermanas). Colecciones que ese kit ya usa: `npc`, `missions` con `objective.talk | interact | quiz | enter_zone`, `quizzes`, `zones`, events educativos, `player`, `ui.hud: education`.
  - `game:` — Vertical 2, este SDD. Colecciones extra: `items`, `loot_tables`, `spawners`, `portals`, `crafting`, stats de survival.
  - Ambos bloques pueden coexistir en el mismo archivo.
  - Ninguno de los dos: v0.3 puramente visual (strip-to-visual = v0.2 efectivo).
- El renderer **sigue sin entender** `education` ni `game`. Strip-to-visual es la ley.
- Un English Lab v0.3 **actual** debe seguir siendo documento v0.3 válido. Este SDD no lo migra, no lo renombra, no lo degrada a “metadata ignorada por todos”.
- El host **educativo** ejecuta `education` / `quizzes` / `objective.*`. El host **survival** no los ejecuta como combate ni como daño.
- `npc` es la lista canónica de personajes. `npcs` es alias deprecado → `npc`.
- `events` v0.2 (`light_flash`) se queda visual. Triggers de lección o de juego no reutilizan esa clave para combate.

## 9. Ancla de producto (Vertical 2)

Los sistemas **nuevos** se diseñan porque el **AI Survival Sandbox** los necesita. Vertical 1 no se reabre como GDD. RPG, FPS, crafting profundo, co-op, gemelos digitales quedan *posibles* a largo plazo; no se diseñan al mismo detalle.

## 10. Honestidad de alcance

Este SDD no afirma que `@m13/runtime` ya sea un game engine. Afirma cómo añadir el módulo `game` **sin romper** el sintetizador visual **ni** el v0.3 educativo que ya vive en el kit.
