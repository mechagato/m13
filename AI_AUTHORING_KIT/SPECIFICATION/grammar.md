# Grammar of `.m13`

PEG-style. `S` is whitespace / comments.

```
Document      <- S Version Field* S
Version       <- "version" S ":" S '"' ("0.1" / "0.2" / "0.3") '"'
Field         <- Name / Title / Description / Bounds / Spawn / Ambient / Light
               / Walls / Floor / Ceiling / Sky / CameraSpeed / Window
               / Objects / Events / Player / Ui / Education / Missions
               / Npc / Zones / Quizzes / Score

Vec3          <- "[" S Number S "," S Number S "," S Number S "]"
Rgb           <- Vec3
Number        <- "-"? [0-9]+ ("." [0-9]+)? (("e" / "E") "-"? [0-9]+)?
String        <- '"' (!'"' .)* '"' / Ident
Ident         <- [a-z] [a-z0-9_]*

Surface       <- "concept" S ":" S String (S "params" S ":" S Map)?
Material      <- String / Surface

Object        <- "-" S "id" S ":" S String
                 S "kind" S ":" S Kind
                 S "position" S ":" S Vec3
                 (S "rotation" S ":" S Vec3)?
                 (S "scale" S ":" S (Number / Vec3))?
                 (S "material" S ":" S Material)?
                 (S "concept" S ":" S String)?
                 (S Animate)?
Kind          <- "sphere" / "box" / "round_box" / "cylinder" / "torus" / "concept"

Animate       <- "animate" S ":" S (LegacyAnim / Timeline)
LegacyAnim    <- "mode" S ":" S ("bob" / "rotate" / "pulse") ...
Timeline      <- "duration" S ":" S Number S "keyframes" S ":" S Keyframe+

Mission       <- "-" S "id" S ":" S String S "title" S ":" S String S "objective" S ":" S Objective
Objective     <- "enter_zone" / "interact" / "talk" / "collect" / "quiz" / "reach"
Npc           <- "-" S "id" S ":" S String S "position" S ":" S Vec3 S "dialog" S ":" S Dialog+
Zone          <- "-" S "id" S ":" S String S "kind" S ":" S ("box" / "sphere") ...
```

### Scenes
A scene is one Document. One file = one world. No includes in v0.3.

### Objects
Declared under `objects`. Referenced by `id` from missions, events, npc.mission.

### Materials
Catalog identifiers only. Applied to walls/floor/ceiling/object.material.

### Lights
Exactly one `light` point in v0.1–0.3. Color HDR allowed.

### Events
v0.2: scheduled `light_flash`. v0.3: gameplay triggers.

### Cameras
No camera object. `spawn` + `cameraSpeed` + `player`.

### UI / NPC / dialogs / zones / missions / checkpoints / triggers / rewards / audio / animations / replay
See specification §§2.1, 4, 5 and `EDUCATION/`, `GAMIFICATION/`, `SDK/supported-*.md`.
Replay is a **runtime** concern (student timeline). Authoring only needs stable ids so a replay can name objects.
