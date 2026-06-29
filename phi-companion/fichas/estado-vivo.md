---
name: estado-vivo
description: Estado vivo de m13 (snapshot 2026-06-29). Fuente humana = BITACORA_MOTOR13.md.
metadata: {type: project}
---

# Estado vivo — m13 (2026-06-29)

- **Fase 1: CERRADA** — T-215 FPS Quest medido (68-72fps); bloqueante formal cerrado.
- **Fase 2: GRUESO COMPLETO Y EN PRODUCCIÓN** (barrida en autopilot 2026-06-26). Todo LIVE en
  **m13.phi-core.com** (dominio de marca propia; CNAME a motor13.pages.dev):
  - **P2 detalle continuo (Sonido 13):** `fbm_continuous`/`fbm_norm`/`fbm_detail` + `pixelFootprint`;
    4 conceptos del showcase migrados; toggle global `continuousDetail` (`?s13=on|off`).
  - **P2b exterior:** walls/ceiling opcionales + `sky` + `cameraSpeed`; **escena Chichén Itzá v3**
    (El Castillo con escalinata de escalones reales + serpientes Kukulcán + cornisas).
  - **P5 seeds** por instancia (offset de dominio). **P4 FFT** 3 bandas (`audio_reactive:{band}`).
  - **PWA** + presets de calidad + **resolución dinámica adaptativa** (ultra-opt Quest, commit 49db186).
- **Auditoría adversarial** (Workflow 4 lentes): 0 crit/high; fixes aplicados. Ver [[decisiones]].
- typecheck 6/6 · **157 tests** · build OK · determinismo interior intacto.
- **Easter eggs** (commit d4f4ba4) HECHOS. MANIFESTO.md ✅. Material en `ref-claudedesign/artefactos/`.

## Cerrado 2026-06-29 (commit 49db186)
**Ultra-opt Quest + resolución dinámica:**
- Preset `quest` re-balanceado: shadowSteps 16→8, aoSamples 3→2, maxSteps 96→78.
- Función `autoResolution(fps)`: muestrea 45 frames, ajusta `dynScale` ±0.06/0.10, aplica en
  `resize()`. Sube resolución mientras FPS sobra (objetivo 72); baja si cae. Piso 0.7, techo 1.0.
- `?dpr=<valor>` desactiva la adaptación (fija, útil para debug).
- **Resultado esperado en Quest (re-medición PENDIENTE de Gato):** resolución > 604×364 @ ≥72fps.
- Bitácora entrada 031 escrita.

## Pendientes
- **RE-MEDICIÓN QUEST (Gato):** abrir m13.phi-core.com, cerrar/reabrir pestaña, esperar 5s,
  reportar fps + resolución W×H. Esto valida el ultra-opt.
- **Opcionales de Gato:** T-205 APK Quest · T-235 video laptop.
- **Refinamientos visuales:** T-225 micro-detalle <40cm · F6 Nyquist.
- **CSG / modelado sólido** (FlowCAD/Innovafest) = gran frente POST-Fase 2. WGSL opSub/opSmoothUnion
  ya existe; falta exponerlo al formato `.m13`. Espera "abre el Spec de CSG" de Gato.
- **npm publish / Fase 3:** `package.json` tiene `"private": true`. D-201: repo independiente +
  `build:types` se decide al cerrar Fase 3. No urgente.

## Siguiente acción
Esperar re-medición Quest de Gato. Si resolución subió → ultra-opt validado. Si no → afinar
deltas de autoResolution. CSG es el siguiente frente grande post-Quest. Releer BITACORA
(entradas 030-031) + `git log --oneline -15` al arrancar.
