# Best practices

## Do
- Start from an example in `EXAMPLES/` closest to the request
- Reuse catalog materials; vary `params` and `seed` instead of new ids
- Keep missions to 3–5 steps
- Place NPC within 4 m of spawn
- Put interactive objects `label` + `interact: true`
- Match spawn to floor: `y = -bounds.y + 1.6`
- Prefer one point light, warm or cool, not both
- Exterior: large bounds, `cameraSpeed` 5–8

## Don't (antipatterns)
- Invent `kind: mesh` or `gltf` — not in v0.3
- Hex colors, CSS names
- `window: [x,y,z]` (must be object)
- `version: 0.3` without quotes
- 200 objects (hard to walk, hits GPU budget)
- Mission pointing at missing zone
- Cycles `m1.next: m1`
- Interior without walls+ceiling
- Player spawn inside a solid (`position` of a box)
- Mixing Spanish concept ids with English invented ones (`brick_wall`)

## Minimize file size
- Drop unused optional blocks
- Short dialogs (≤ 4 lines)
- Shared materials as short strings
- Avoid duplicating identical objects; 8–40 is plenty
