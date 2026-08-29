# m13 specification — writable surface of a `.m13` file

**Kit version:** 0.3.0  
**Geometry contract:** matches engine parser v0.1 + v0.2  
**Education contract:** kit v0.3 (this document)

A `.m13` file is UTF-8 YAML. Comments (`#`) are allowed. No tabs. Indent with two spaces.

---

## 0. Document root

| Property | Type | Required | Default | Constraints | Example | Common errors |
|---|---|---|---|---|---|---|
| `version` | string | yes | `"0.1"` | `"0.1"` \| `"0.2"` \| `"0.3"` (quoted) | `"0.3"` | `0.3` unquoted becomes a float; `"0.4"` rejected |
| `name` | string | yes | — | snake_case slug | `sistema_solar` | spaces, accents |
| `title` | string | no (0.3) | — | display title | `Sistema Solar` | using `name` as title |
| `description` | string | no | — | human text | `"Lección STEM"` | YAML `: ` in unquoted strings |
| `bounds` | vec3 | no | `[5,3,5]` | each **> 0** (half-extents, meters) | `[40,8,24]` | `0` or negatives |
| `spawn` | vec3 | no | `[0,0,-3.5]` | camera / player eye | `[0,-6.4,-14]` | y below floor (`y < -bounds.y`) |
| `ambient` | object | no | see §3 | | | hex colors |
| `light` | object | no | see §3 | one point light | | `intencity` typo |
| `walls` | surface | interior yes | — | `{concept, params?}` | | missing in interior |
| `floor` | surface | **yes** | — | | | unknown concept |
| `ceiling` | surface | interior yes | — | omit with `walls` for exterior | | only one of walls/ceiling |
| `sky` | object | exterior no | — | `{horizon: rgb, zenith: rgb}` | | used in interior (harmless) |
| `cameraSpeed` | number | no | engine 2.5 | **> 0** m/s | `6` | `0` |
| `window` | object | no | — | `{position: vec3, size: vec3>0}` | | `window: [..]` array |
| `objects` | array | no | `[]` | max 256 | | duplicate ids |
| `events` | array | 0.2+/0.3 | `[]` | max 48 | | `events` on v0.1 |
| `player` | object | 0.3 no | | spawn/height/speed | | |
| `ui` | object | 0.3 no | | hud | | |
| `education` | object | 0.3 no | | lesson metadata | | |
| `missions` | array | 0.3 no | `[]` | max 32 | | broken refs |
| `npc` | array | 0.3 no | `[]` | max 24 | | |
| `zones` | array | 0.3 no | `[]` | max 48 | | box without size |
| `quizzes` | array | 0.3 no | `[]` | | | answer out of range |
| `score` | object | 0.3 no | zeros | starting XP | | |

**Unknown root keys:** warning (non-strict). Strict mode: error.

---

## 1. Primitive types

### vec3
YAML array of exactly 3 finite numbers. Positions/bounds in **meters**.

Allowed: `[0, 1.6, -8]`  
Forbidden: `{x:0,y:1,z:-8}`, 2-length arrays, `null`.

### rgb
Three numbers **≥ 0**. HDR > 1 is valid (`[1.4, 0.7, 0.25]`).  
Forbidden: `"#ffffff"`, `"white"`, `[r,g,b,a]`.

### surface
```yaml
concept: pared_yeso_blanco   # required string, catalog id
params:                      # optional map
  darkness: 0.5
```

### material (objects)
Short: `material: metal_dorado_pulido`  
Long:
```yaml
material:
  concept: metal_dorado_pulido
  params:
    shimmer: 0.8
```

---

## 2. objects[]

| Property | Type | Required | Default | Allowed | Notes |
|---|---|---|---|---|---|
| `id` | string | yes | — | unique snake_case | duplicate → error |
| `kind` | enum | yes | — | `sphere` `box` `round_box` `cylinder` `torus` `concept` | |
| `position` | vec3 | yes | — | center | |
| `rotation` | vec3 | no | `[0,0,0]` | **degrees**, Euler XYZ | not radians |
| `scale` | number \| vec3 | no | `1` | all **> 0** | sphere: x=radius; cylinder: x=radius y=height; torus: x=major y=minor |
| `seed` | number | no | — | finite | material variation |
| `material` | string\|object | yes if kind ≠ concept | — | catalog id | |
| `concept` | string | yes if kind=concept | — | object_geo id | |
| `audio_reactive` | bool \| `{band}` | no | false | band: `bass` `mid` `treble` | |
| `animate` | object | no | — | §2.1 | |
| `label` | string | 0.3 no | — | HUD name | |
| `interact` | bool | 0.3 no | — | E to interact | |
| `zone` | string | 0.3 no | — | bind to zone id | |

### 2.1 animate (legacy)

```yaml
animate:
  mode: bob          # bob | rotate | pulse
  speed: 0.8         # default 1
  amplitude: 0.15    # default 0.1, ≥ 0
```

`bob` oscillates Y. `rotate` spins Y (speed ≈ rad/s). `pulse` scales (amplitude capped ~0.9).

### 2.2 animate (timeline, v0.2+)

```yaml
animate:
  duration: 4
  loop: true
  keyframes:
    - { t: 0, position: [0,0,0], ease: smooth }
    - { t: 4, position: [2,0,0], ease: in }
```

`ease`: `linear` `smooth` `in` `out`. `t` unique, `t ≤ duration`. Max 16 keyframes. Each keyframe needs position, rotation or scale.

---

## 3. ambient, light, window, sky

### ambient
| Field | Type | Default | Constraint |
|---|---|---|---|
| `background` | rgb | `[0.05,0.045,0.04]` | miss color |
| `ambientColor` | rgb | `[0.08,0.075,0.07]` | |
| `tint` | rgb | `[1,1,1]` | multiplier |
| `fogColor` | rgb | same as background | |
| `fogDensity` | number | `0.015` | ≥ 0 |

### light (single point)
| Field | Type | Default | Constraint |
|---|---|---|---|
| `position` | vec3 | `[0,2.5,0]` | |
| `color` | rgb | `[1,0.92,0.78]` | |
| `intensity` | number | `1` | ≥ 0 |

### window
Cutout in a wall. `position` center, `size` **positive** half-extents. Object, never array.

### sky (exterior)
`horizon` + `zenith` rgb. Used when `walls` and `ceiling` are omitted.

---

## 4. events

**v0.2 light flash**
```yaml
events:
  - t: 1.2
    kind: light_flash
    duration: 0.15
    intensity: 1
```

**v0.3 education**
```yaml
events:
  - trigger: mission_completed
    target: mission1
    action:
      next: mission2
      sound: success
      fireworks: true
      xp: 0
```

`trigger`: `enter_zone` `exit_zone` `interact` `mission_completed` `mission_failed` `talk` `quiz_passed` `spawn` `timer`  
`action`: `next` `xp` `badge` `dialog` `sound` `fireworks` `teleport` `unlock` `hint`

---

## 5. Education Layer (v0.3)

### player
| Field | Type | Default | Notes |
|---|---|---|---|
| `spawn` | vec3 | root `spawn` | keep in sync |
| `height` | number >0 | 1.6 | eye above floor |
| `speed` | number >0 | 3.2 | m/s |

Eye Y ≈ `-bounds.y + height`.

### ui
`hud`: `education` | `minimal` | `none`  
`locale`: BCP-47, default `es`  
`map` `hints`: bool

### education
`subject`, `grade`, `durationMin` >0, `language`, `difficulty` (`intro|easy|medium|hard`), `objectives[]`, `bloom[]` (remember→create), `competencies[]`, `stem` bool, `mode` `student|teacher`

### missions[]
Required: `id`, `title`, `objective`  
`objective` one of: `enter_zone` `interact` `talk` `collect` `quiz` `reach`  
`rewards`: `xp` `stars` `badge` `coins` `item`  
`next`: id of another mission, **no cycles**  
`hints[]`, `success`, `failure`, `required` bool

### npc[]
Required: `id`, `position`, `dialog[]` (strings or `{text, when, mission}`)  
`role`: `teacher` `guide` `peer` `narrator` `evaluator`  
`voice`, `mission`, `hint`, `reward`

### zones[]
`kind`: `box` (needs `size` vec3>0) or `sphere` (needs `radius`>0)  
`hidden` bool — still collides for missions

### quizzes[]
`prompt`, `choices` 2–6, `answer` index 0-based, `bloom`, `xp`

### score
Starting `xp` `stars` `coins`

---

## 6. Coordinate system

Right-handed, **+Y up**. Room from `-bounds` to `+bounds`. Floor plane `y = -bounds.y`. Cameras look −Z. Spawn default `[0,0,-3.5]` is ~3 m above a floor at y=-3.

---

## 7. Limits

| Limit | Value |
|---|---|
| objects | 256 |
| keyframes / object | 16 |
| events | 48 |
| missions | 32 |
| npc | 24 |
| zones | 48 |

Target file size: **< 12 KB**. Prefer instances of catalog concepts over many unique meshes.

---

## 8. Validation pipeline

1. YAML parse  
2. version ∈ {0.1,0.2,0.3}  
3. JSON Schema / Zod types  
4. unique ids  
5. concept ids ∈ catalog  
6. referential integrity (missions → zones/objects/npc/quizzes)  
7. no mission cycles  
8. box zones have size, sphere zones have radius  

Error format:
```
[m13/parser] Escena .m13 inválida:
  · objects.0.position — Required
```
