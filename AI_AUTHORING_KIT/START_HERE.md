# START HERE

You are going to generate a `.m13` YAML document.

## Non-negotiables

1. Output **only YAML**. No markdown fences unless the host requires them.
2. `version` is a **quoted string**: `"0.3"` for lessons, `"0.2"` for geometry-only.
3. `name` is `snake_case`. Unique.
4. `floor.concept` is required. Interior scenes also need `walls` and `ceiling`.
5. Use **only** catalog concept IDs. Never invent materials.
6. Every `id` unique across objects, npc, missions, zones, quizzes.
7. Primitive `kind` requires `material`. `kind: concept` requires `concept` and forbids relying on `material`.
8. `bounds`, `scale`, `window.size` values must be **> 0**.
9. Colors are `[r,g,b]` floats ≥ 0. No hex, no CSS names.
10. Mission `next` must not form a cycle. `enter_zone` / `interact` / `talk` / `quiz` must reference existing ids.

## Minimal interior

```yaml
version: "0.1"
name: cuarto_vacio
walls:
  concept: pared_yeso_blanco
floor:
  concept: piso_madera_envejecida
ceiling:
  concept: pared_yeso_blanco
```

## Minimal education lesson (v0.3)

See `EXAMPLES/04-sistema-solar.m13`. Pattern:

- geometry (floor + objects + optional walls)
- `education` (objectives, bloom, difficulty)
- `npc` with `dialog`
- `missions` chained with `next`
- `zones` for `enter_zone`
- `ui.hud: education`

## Decision tree

- User asked a **room / gallery / office** → interior, `walls`+`ceiling`, version 0.3 if there are missions else 0.1
- User asked **solar system, park, city, landscape** → exterior: omit walls/ceiling, add `sky`
- User asked **lesson / students / XP** → version `"0.3"` + missions
- User asked **empty room** → minimal YAML, no objects

## After generating

Run the checklist in `AI/validation-rules.md`. If any item fails, fix the YAML before showing it to the user.
