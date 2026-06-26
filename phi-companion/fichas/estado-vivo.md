---
name: estado-vivo
description: Estado vivo de m13 (snapshot 2026-06-26). Fuente humana = BITACORA_MOTOR13.md.
metadata: {type: project}
---

# Estado vivo — m13 (2026-06-26)

- **Fase 1: 6/7** — único bloqueante = número FPS Quest 3 (hardware Gato).
- **Fase 2: GRUESO COMPLETO Y EN PRODUCCIÓN** (barrida en autopilot 2026-06-26, orden de Gato
  "hazlas todas"). Todo LIVE en **m13.phi-core.com** (dominio de marca propia; CNAME a motor13.pages.dev):
  - **P2 detalle continuo (Sonido 13):** `fbm_continuous`/`fbm_norm`/`fbm_detail` + `pixelFootprint`;
    4 conceptos del showcase migrados; toggle global `continuousDetail` (`?s13=on|off`).
  - **P2b exterior:** walls/ceiling opcionales + `sky` + `cameraSpeed`; **escena Chichén Itzá**
    (El Castillo, 2.4KB) = primera del selector / showcase Innovafest.
  - **P5 seeds** por instancia (offset de dominio). **P4 FFT** 3 bandas (`audio_reactive:{band}`).
  - **PWA** + presets de calidad (previos).
- **Auditoría adversarial** (Workflow 4 lentes): 0 crit/high; 9 fixes aplicados (fbm normalizado,
  toggle robusto, seed .finite(), cámara exterior, etc.). Ver [[decisiones]].
- typecheck 6/6 · 119 tests · build OK · determinismo interior intacto.
- **Easter eggs** (commit d4f4ba4) HECHOS. Material de referencia en `ref-claudedesign/artefactos/`
  (ver [[material-y-artefactos]]).

## Cerrado 2026-06-26
- **Gate visual del detalle continuo: APROBADO** por Gato ("avancemos"). Pirámide es v1 (cajas
  apiladas, falta modelado fino — trabajo de escena).
- **T-215 FPS Quest:** 68-72 fps @604×364 (SC-6 al límite, render funcional → cierra el bloqueante
  formal de Fase 1). Optimización de calidad Quest = pendiente post (no bloquea).
- **T-227** hash-regression CI: hecho.

## Pendientes
- **Opcionales de Gato:** T-205 APK Quest · T-235 video laptop · re-eval LLM (gateway :9095 offline).
- **Pulir Chichén Itzá** (geometría fina) — cuando Gato lo pida.
- **Refinamientos visuales:** T-225 micro-detalle <40cm · F6 Nyquist · optimización calidad Quest
  (requieren ojo en GPU / re-test Quest).
- **🚀 CSG / modelado sólido** (FlowCAD/Innovafest) = el gran frente POST-Fase 2. WGSL
  opSub/opSmoothUnion ya existe; falta exponerlo al formato `.m13`. Espera "abre el Spec de CSG"
  de Gato. Ver [[decisiones]].

## Orden de Gato (2026-06-26) — post Fase 2
1. ✅ Revisar FlowCAD (`~/neonodos-core/neocad`) + propuesta → **concluir por separado** (ver [[decisiones]]).
2. **Chichén Itzá v2 desplegada** (29 objetos: 9 cuerpos+cornisas, templo, escalinata+alfardas) —
   **pendiente validación visual de Gato** (la v1 "le faltaba mucho"; esta sube proporciones/detalle).
3. **Ultra-optimizar calidad Quest** (lo último) — hoy 604×364 @68-72fps; palancas: subir resolución
   aprovechando headroom del detalle continuo, bajar sombras/AO, resolución dinámica, o modo VR Fase 5.

## Siguiente acción
Pedir a Gato validación visual de Chichén v2; si gusta, seguir afinando o pasar a optimización Quest.
CSG sigue siendo el gran frente post (FlowCAD lo cierra por su lado con CadQuery). Releer BITACORA
(entrada 030) + `git log --oneline -14` al arrancar.
