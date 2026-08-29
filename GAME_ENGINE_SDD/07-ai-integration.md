# 07 — Integración IA (editor-time)

El LLM emite `.m13` / diffs. No pinta frames. No resuelve daño. Constitution §3.5 / §3.7.

## Hoy

MCP format-guide + tools + `@m13/generator` + editor experimental. Nada conoce `game:` / `npcs` / `loot_tables`.

## Kit v0.3 (extender, no reemplazar)

1. `get_m13_format_guide` + sección gameplay overlay.
2. `validate_m13_game`.
3. `diff_m13_scene` por id.
4. `apply_m13_diff` → YAML canónico + validate.

LLM nunca recibe WGSL ni GPUDevice.

## Diffs

`op: upsert|remove` + collection + id + body. Apply en CommandFlush, no a mitad de Integrate.

## Semilla

YAML validado + seed ⇒ mismo mundo. El LLM no es determinista; `@m13/generator` sí puede serlo. UI: “regenerar con IA ≠ replay”.

## Allowlist / denylist

Sí: concepts de `@m13/synth`, items, 5 recetas, 1 banco, 1 enemigo, zonas, misiones, biomas-como-tags.
No: concept inventado, WGSL, URLs, plugins no registrados, recetas huérfanas.

`World.step` no hace fetch.
