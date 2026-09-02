# Changelog

Kit versioning is independent from the engine. Additive by default.

## 0.3.0 — 2026-08-28

### Added
- Education Layer: `education`, `player`, `ui`, `missions`, `npc`, `zones`, `quizzes`, `score`
- Extended events (`enter_zone`, `interact`, `mission_completed`, `talk`, `quiz_passed`)
- 20 executable examples (classroom → escape room)
- LLM prompt pack, validation rules, hallucination prevention
- JSON Schema for v0.3 (VS Code compatible)
- SDD of the Education Demo (HUD, teacher mode, replay)

### Compatibility
- Geometry subset remains a superset of engine v0.1 / v0.2
- Native `mechagato/m13` runtime still parses only `"0.1"` and `"0.2"`
- Dual-emit: copy a 0.3 file, set `version: "0.2"`, drop education keys, to load in the WebGPU engine

## 0.2.0 — 2026-06-26 (engine)

Exterior scenes, `sky`, `cameraSpeed`, `seed`, audio bands, timeline `events` (`light_flash`), keyframe `animate`

## 0.1.0 — 2026-06-12 (engine)

Initial `.m13` language, 18 concepts, interior rooms
