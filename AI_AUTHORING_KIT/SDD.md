# SDD — m13 Education Demo

## Goal
Prove that an AI can build a 3D educational experience **only** by generating `.m13`.

## MVP
User: "Quiero una lección sobre el sistema solar."  
AI: a `lesson.m13` (see EXAMPLES/04-sistema-solar.m13).  
Runtime opens it. The student walks, interacts, solves missions, gets points.

## Components
- **Runtime (engine):** exists in `mechagato/m13`. **Do not modify** renderer, WGSL, compiler.
- **Parser:** exists for v0.1/v0.2. This kit documents v0.3 as an additive layer consumed by the Education Demo.
- **Education Layer (new):** lesson, mission, score, teacher, student, checkpoints, dialog.
- **HUD:** objetivo, puntos, tiempo, inventario, misiones, ayuda IA, mapa.
- **NPC:** id, dialog, voice, mission, hint, reward.
- **Mission system / Score / Teacher mode / Replay** as specified in EDUCATION/ and GAMIFICATION/.

## Roadmap
1. Motor educativo: HUD, misiones, NPC, diálogos, score  
2. Gamificación: logros, inventario, ítems, portales, llaves, cofres  
3. Profesor: dashboard, analytics, export PDF/CSV  
4. IA: tutor, narrador, NPC, evaluador  
5. Marketplace: biblioteca de lecciones

## Dual-runtime note
Until the native WebGPU engine bumps `SUPPORTED_VERSIONS` to include `0.3`, emit `"0.3"` for this Demo and `"0.2"` (geometry only) for m13.phi-core.com.
