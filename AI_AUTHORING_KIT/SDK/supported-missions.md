# Supported missions

Objectives (exactly one recommended):

| key | target |
|---|---|
| enter_zone | zone id or object id |
| interact | object or npc id |
| talk | npc id |
| collect | object id (alias of interact) |
| quiz | quiz id |
| reach | vec3, radius ~2 m |

Chain with `next`. First mission is active. `required: false` skips without blocking completion.
