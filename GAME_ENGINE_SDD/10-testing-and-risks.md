# 10 — Testing y riesgos

Tests de gameplay: Node, sin GPU. Importar `renderer/` = fallo de arquitectura. CI visual v0.1 se mantiene.

## Riesgos

| ID | Riesgo | Mitigación |
|---|---|---|
| R1 | Netcode vs determinismo | inputs cuantizados; mic/LLM fuera del World |
| R2 | Física vs SDF GPU | AABB CPU; no vender physics-on-SDF |
| R3 | IA no determinista vs saves | scene_hash; save apunta al YAML, no al prompt |
| R4 | Posiciones horneadas en WGSL | MVP headless; PR L de uniforms después |
| R5 | Contaminar runtime con hp | overlay + strip |
| R6 | Scope creep de géneros | citar cap. 08 o es F2+ |
| R7 | Visor educativo vs survival | education/quizzes passthrough |
| R8 | Plugins remotos / RCE | allowlist local |
| R9 | Tick vs XR frame | relojes separados |
| R10 | MAX_SCENE_OBJECTS=256 | presupuesto visual bajo |

Criterio de cumplimiento en código: v0.1 verde, tape `primera_comida`, cero imports gameplay→renderer, MCP valida v0.3.
