# m13 AI Authoring Kit

**Version:** 0.3.0  
**Status:** Stable for authoring · Education Layer additive  
**License:** MIT  
**Native engine compatibility:** geometry `0.1` and `0.2` (repo `mechagato/m13`)  
**This kit adds:** `0.3` Education Layer (missions, NPC, UI, score, zones, quizzes)

This package is **decoupled from the engine**. Any LLM (Grok, ChatGPT, Claude, Gemini, DeepSeek) can generate valid `.m13` worlds by reading **only** this kit.

## What this kit is

| Included | Not included |
|---|---|
| Specification of every writable field | Renderer / WebGPU |
| Formal grammar | WGSL shaders |
| JSON Schema + YAML schema | Compiler |
| 20 executable examples | Runtime internals |
| System prompts and antipatterns | Proprietary SDF algorithms |
| Education + gamification contracts | Engine TypeScript |

A `.m13` file is a **semantic YAML scene**. Typical size: 1–12 KB.

## Quick start for a model

1. Read `START_HERE.md`
2. Read `SPECIFICATION/m13-specification.md`
3. Load `SPECIFICATION/schema.json` for validation
4. Copy `PROMPTS/prompt-system.md` as your system prompt
5. Emit **only YAML**, then self-check with `AI/validation-rules.md`

## Versions

| version | Geometry | Education | Native m13 runtime |
|---|---|---|---|
| `"0.1"` | Interior room (walls+floor+ceiling) | no | yes |
| `"0.2"` | + exterior (optional walls), sky, timeline events | no | yes |
| `"0.3"` | same as 0.2 | missions, npc, ui, zones, quizzes, score | **Education Demo** (this kit). Native runtime currently rejects `0.3`. Dual-emit `0.2` + extra keys if you need the WebGPU engine today. |

## Layout

```
AI_AUTHORING_KIT/
  README.md  START_HERE.md  CHANGELOG.md  LICENSE.md  SDD.md
  SPECIFICATION/   PROMPTS/   SDK/   EDUCATION/   GAMIFICATION/   AI/
  EXAMPLES/        (20 worlds)
```

## Concept catalog (do not invent IDs)

Materials: `pared_yeso_blanco`, `pared_ladrillo_viejo`, `pared_concreto_pulido`, `pared_madera_oscura`, `piso_madera_envejecida`, `piso_concreto_industrial`, `piso_marmol_blanco`, `marmol_blanco_vetas`, `piedra_volcanica`, `metal_dorado_pulido`, `metal_bronce_pulido`, `metal_oxidado`, `cuero_vintage`, `vidrio_esmerilado`

Geometry concepts (`kind: concept`): `pedestal_marmol`, `lampara_colgante`, `esfera_decorativa`, `cubo_basico`

Kinds: `sphere` `box` `round_box` `cylinder` `torus` `concept`
