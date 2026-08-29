# 05 — Extensiones `.m13` (v0.3 modular)

Documento central. Un solo `version: "0.3"`. Dos perfiles de producto. Cero forks de formato.

## 0. Regla de versión

```
v0.1 / v0.2  = escena visual (SDF). Intocable.
v0.3         = escena visual + MÓDULOS OPCIONALES.
```

No hay v0.4 para el survival. No hay un v0.3-solo-game que reemplace al kit.

| Módulo raíz | Vertical | Quién lo ejecuta | Estado |
|---|---|---|---|
| *(ninguno)* | — | solo renderer | documento visual |
| `education:` | 1 — lección / capacitación | studio + AI Authoring Kit | **ya shipped** |
| `game:` | 2 — AI Survival Sandbox | host gameplay futuro | **este SDD** |
| ambos | lección + sandbox | cada host lee su bloque | permitido |

El renderer no interpreta ninguno de los dos. Pipeline: parse YAML → extraer módulos → **strip-to-visual** → `parseScene` / `compileScene`.

`events` v0.2 (`kind: light_flash`) son temporales de shader. Triggers de lección o juego viven en `zones[]` / `missions[]`.

## 1. Lo shipped

**Visual** (`mechagato/m13` runtime): v0.1 objects/light/ambient; v0.2 timeline + `light_flash`.

**Vertical 1** (hecho, no hipótesis): `education`, `npc`, `missions` con `objective.talk | interact | quiz | enter_zone`, `quizzes`, `zones`, events educativos, `player`, `ui.hud: education`. English Lab / supermercado / residuos / aula son v0.3 válidos hoy.

**Vertical 2** (este SDD): bloque `game` + `items`, `loot_tables`, `spawners`, `portals`, `crafting` solo si existe `game`.

## 2. Tabla de módulos

| Clave | Módulo | Canónica | Notas |
|---|---|---|---|
| `education` | V1 | sí | Kit existente. Survival no la ejecuta como combate. |
| `game` | V2 | sí | Semilla, tick, hambre, inventario. |
| `npc` | compartida | **sí** | Una sola colección de personajes. |
| `npcs` | alias | **deprecado** | `npcs` → `npc`. No dos canónicas. |
| `zones` | compartida | sí | Misma lista. |
| `missions` | compartida | sí | Un array. `kind`/`profile`/`objective`. |
| `quizzes` | V1 | sí | Host educativo las corre. |
| `player` | compartida | sí | V2 puede especializar `game.player`. |
| `ui` | V1 | sí | `ui.hud: education` ya existe. |
| `events` | visual v0.2 | sí | Solo `light_flash` en runtime visual. |
| `items` `loot_tables` `spawners` `portals` `crafting` | V2 | sí | Solo si hay `game`. |
| `plugins` | extra | sí | No reemplaza education/game. |

## 3. `npc` y alias

```yaml
npc:
  - id: ana
    object: ana_visual
    role: tutor
    dialog: "Hi. Touch the apple."
    ai: { profile: idle }
```

Personaje = metadata sobre un objeto visual. `npcs` sin `npc` → se normaliza y se depreca. Ambas pobladas y distintas → error.

## 4. `missions` — un array, dos perfiles

Discriminante: `kind: lesson | survival` o `profile` o presencia de `objective` (V1) vs `steps`/`require` (V2).

```yaml
missions:
  - id: saluda_a_ana
    kind: lesson
    objective: { type: talk, npc: ana }   # talk | interact | quiz | enter_zone
  - id: primera_comida
    kind: survival
    steps:
      - { id: come, require: { flag: ate_once } }
```

Host V1 ignora `kind: survival`. Host V2 ignora `kind: lesson` salvo flags compartidos.

## 5. `zones` compartidas

Ops: `set_flag`, `start_mission`, `grant_item`, `hurt`, `heal`, `teleport`, `open_save`. Sin scripts. Sin reusar `events` v0.2.

## 6–7. Bloques raíz

```yaml
education:
  locale: en
  lesson: english_lab_aisle_01
ui:
  hud: education

game:
  mode: survival
  seed: 42
  tick_hz: 20
  interact_range: 2.0
  player:
    health: 100
    hunger: 100
    inventory_capacity: 16
    hotbar: 5
  bounds_policy: clamp
```

Sin `game:` no hay catálogos V2 (warning de módulo ausente).

## 8. Catálogos solo-game

`items`, `loot_tables` (count `[min,max]` + PRNG de `game.seed`), `spawners`, `portals`, `crafting` (1 banco, 5 recetas). Ver copia local completa para el YAML largo.

## 9. Sidecar `.m13save`

Solo corridas `game`. No entra a compileScene ni a `#scene=`. Progreso V1 = studio, namespace distinto.

## 10. Prohibido en YAML

JS, WGSL, binarios, URLs de runtime, secrets, historial LLM.

## 11. Ejemplos mínimos

### A — Solo education (válido hoy)

```yaml
version: "0.3"
name: english_lab_aisle_01
floor: { concept: piso_concreto_industrial }
walls: { concept: pared_yeso_blanco }
ceiling: { concept: pared_yeso_blanco }
education:
  locale: en
  lesson: supermarket_aisle
ui: { hud: education }
player: { role: learner }
objects:
  - id: ana_visual
    kind: sphere
    position: [1.2, -1.2, 0]
    scale: 0.5
    material: cuero_vintage
npc:
  - id: ana
    object: ana_visual
    role: tutor
    dialog: "Find the apple."
zones:
  - id: produce
    shape: aabb
    min: [0, -3, -1]
    max: [3, 2, 2]
    tags: [lesson]
missions:
  - id: find_apple
    kind: lesson
    objective: { type: enter_zone, zone: produce }
quizzes:
  - id: word_apple
    prompt: "What is this?"
    choices: ["apple", "bread", "milk"]
    answer: 0
```

### B — Solo game (`valle_minimo`)

```yaml
version: "0.3"
name: valle_minimo
floor: { concept: piso_madera_envejecida }
game:
  mode: survival
  seed: 42
  tick_hz: 20
  player: { health: 100, hunger: 100, inventory_capacity: 16, hotbar: 5 }
objects:
  - id: jabali_0
    kind: sphere
    position: [8, -2, 6]
    scale: 0.6
    material: cuero_vintage
npc:
  - id: jabali_0
    object: jabali_0
    role: enemy
    health: 30
    ai: { profile: wander, radius: 6 }
items:
  - { id: fibra, stack: 16, tags: [resource] }
  - { id: caldo, stack: 4, tags: [food], hunger_restore: 25 }
missions:
  - id: primera_comida
    kind: survival
    steps:
      - { id: come, require: { flag: ate_once } }
```

### C — Ambos

```yaml
version: "0.3"
name: lab_y_claro
education: { locale: en, lesson: camp_vocab }
ui: { hud: education }
game: { mode: survival, seed: 7, tick_hz: 20 }
npc:
  - { id: ana, object: ana_visual, role: tutor, dialog: "Gather fiber." }
  - { id: jabali_0, object: jabali_0, role: enemy, health: 30 }
missions:
  - { id: vocab_cook, kind: lesson, objective: { type: talk, npc: ana } }
  - { id: primera_comida, kind: survival, steps: [{ id: come, require: { flag: ate_once } }] }
zones:
  - { id: camp, shape: aabb, min: [-5, -8, -5], max: [5, 2, 5], tags: [lesson, biome.clearing] }
```

## 12. Validación futura (no ahora)

English Lab v0.3 OK. `game` + spawners exige seed. `npc`+`npcs` distintos = error. Strip-to-visual no rompe examples v0.1.
