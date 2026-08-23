---
name: estado-vivo
description: Estado vivo de m13 (snapshot 2026-07-03). Fuente humana = BITACORA_MOTOR13.md.
metadata: {type: project}
---

# Estado vivo â€” m13 (2026-08-22)

> Snapshot anterior 2026-07-03 conservado abajo como histÃ³rico. **Vigente:**

- **SSOT:** `docs/plans/plan-canonico-plataforma.md` (v4) â€” MCP + ChatGPT Apps primero; portales config + landings; FlowCAD desktop no se frena; confidencialidad industrial (no claim â€œinhackeableâ€).
- Suite: m13 = entrega espacial; FlowCAD = CAD+Three; Comp3D (`proy3-qro`) = compress/weight â€” no mezclar visores.
- Licencia **MIT** Â· repo **pÃºblico** Â· Quest PASS Â· F3 frozen Â· F4 no built.
- **D1 hecho:** `@m13/mcp` v0.2 â€” templates EHS, share privado S2/S3, `ui_card`, ChatGPT App skeleton.
- **D2 hecho:** `@m13/gateway` â€” vault+token publish, portal `/portal/`, player `?p=&token=`, MCP `publish_m13_scene`.
- **D3 hecho (flowcad ``7b36cb2``).** Siguiente: **D4 Comp3D** en proy3-qro.
- Sonido 13 = inspiraciÃ³n; runtime = fBm continuo medible.

---

# Estado vivo â€” m13 (2026-07-03) [histÃ³rico]

- **Fase 1: CERRADA** â€” T-215 FPS Quest medido (68-72fps); bloqueante formal cerrado.
- **Fase 2: GRUESO COMPLETO Y EN PRODUCCIÃ“N** (barrida en autopilot 2026-06-26). Todo LIVE en
  **m13.phi-core.com** (dominio de marca propia; CNAME a motor13.pages.dev):
  - **P2 detalle continuo (Sonido 13):** `fbm_continuous`/`fbm_norm`/`fbm_detail` + `pixelFootprint`;
    4 conceptos del showcase migrados; toggle global `continuousDetail` (`?s13=on|off`).
  - **P2b exterior:** walls/ceiling opcionales + `sky` + `cameraSpeed`; **escena ChichÃ©n ItzÃ¡ v3**
    (El Castillo con escalinata de escalones reales + serpientes KukulcÃ¡n + cornisas).
  - **P5 seeds** por instancia (offset de dominio). **P4 FFT** 3 bandas (`audio_reactive:{band}`).
  - **PWA** + presets de calidad + **resoluciÃ³n dinÃ¡mica adaptativa** (ultra-opt Quest, commit 49db186).
- **AuditorÃ­a adversarial** (Workflow 4 lentes): 0 crit/high; fixes aplicados. Ver [[decisiones]].
- typecheck 6/6 Â· **157 tests** Â· build OK Â· determinismo interior intacto.
- **Easter eggs** (commit d4f4ba4) HECHOS. MANIFESTO.md âœ…. Material en `ref-claudedesign/artefactos/`.

## Cerrado 2026-06-29 (commit 49db186)
**Ultra-opt Quest + resoluciÃ³n dinÃ¡mica:**
- Preset `quest` re-balanceado: shadowSteps 16â†’8, aoSamples 3â†’2, maxSteps 96â†’78.
- FunciÃ³n `autoResolution(fps)`: muestrea 45 frames, ajusta `dynScale` Â±0.06/0.10, aplica en
  `resize()`. Sube resoluciÃ³n mientras FPS sobra (objetivo 72); baja si cae. Piso 0.7, techo 1.0.
- `?dpr=<valor>` desactiva la adaptaciÃ³n (fija, Ãºtil para debug).
- **Resultado esperado en Quest (re-mediciÃ³n PENDIENTE de Gato):** resoluciÃ³n > 604Ã—364 @ â‰¥72fps.
- BitÃ¡cora entrada 031 escrita.

## Cerrado 2026-06-29 (Entrada 032)
**T-225 micro-detalle <40cm + F6 Nyquist edge AA (sin hardware):**
- **T-225:** `fbm_continuous` ahora aplica `nearBoost` logarÃ­tmico: cuando `footprint` es muy
  pequeÃ±o (cerca), la frecuencia base del FBM escala hasta 6Ã— para revelar detalle sub-grid
  que las octavas a cap ya no aportaban. FÃ³rmula: `clamp(1-log2(footprint)*0.35, 1, 6)`. El
  dominio arranca a `freq=nearBoost` en lugar de 1, desplazando el espectro hacia arriba sin
  cambiar el conteo de octavas (Nyquist preservado).
- **F6:** AA de bordes geomÃ©tricos en `fs_main` usando `dpdxFine`/`dpdyFine` WGSL. Detecta
  bordes (edgeMag > 0.0016) y lanza 2 rayos adicionales en offsets Â±0.5px horizontal,
  promedia los 3. Coste solo en pÃ­xeles de borde â€” presupuesto Quest intacto en superficies.
  Refactoring: `traceColor(uvFixed)` extrae la lÃ³gica del rayo para reutilizarla.
- typecheck 6/6 Â· **157/157 tests** Â· hashes regenerados (`pnpm gen:hashes`).

## Cerrado 2026-07-02 (Entrada 033) â€” AUDITORÃA 7 LENTES + credibilidad IP + plan fases 3-6
- **Quest RE-MEDIDO por Gato: 70-72fps** con resoluciÃ³n dinÃ¡mica â†’ ultra-opt VALIDADO.
- **AuditorÃ­a 7 lentes** (3 SDD + 4 forenses adversariales). **Veredicto IP: SÃ“LIDO CON MATICES â€”
  REGISTRABLE.** Cero vaporware (22/22 capacidades verificadas). Detalle continuo = REAL pero el
  kernel es prior art â†’ **registrar como SISTEMA integrado, no como algoritmo** (marca "m13"/
  "Sonido 13" protegible). Ver BITACORA 033 para el desglose completo.
- **Correcciones aplicadas** (commits 1a90c5a, 0133b14, 4f366d4): encuadre honesto del benchmark
  (30.8Ã—=assets; sin texturas 2.83Ã—), notas SC-4, **constitution v0.1.1** (formaliza skip 3-4),
  dominio MCPâ†’m13.phi-core.com, fix flake de tests, CLAUDE.md al dÃ­a. **170/170 tests.**
- **NUEVOS TESTS que fijan la IP:** `packages/runtime/src/shaders/__tests__/fbm-continuous-math.test.ts`
  (5 propiedades del Sonido 13) + `packages/runtime/src/camera/__tests__/fly-camera.test.ts`.
- **PLAN MAESTRO fases 3-6 AUTORIZADO por Gato:** orden Innovafest-first **5â†’6â†’(Innovafest dic)â†’3â†’4**.
  Ver `docs/plans/roadmap-fases-restantes.md`. Multiplayer/gaming = m13-platform (proyecto hermano
  post-fases; Fase 6 determinismo+replay es su cimiento) â€” Â§6.5 del roadmap.

## Pendientes (post-auditorÃ­a)
- **CHECK-IN DE GATO del Spec Fase 5** (`docs/spec/phase-5-spec.md`): resolver **OQ-5.1..5.4**
  (locomociÃ³n, migraciÃ³n uniforms 256B D-5001, voz P2, HUD VR) â†’ luego Plan â†’ Tasks â†’ Implement.
- **T-501 spike gate (Gato):** probar `immersive-vr`+WebGPU en el navegador del Quest ANTES de
  construir Fase 5 (riesgo de interop inmadura).
- **Opcionales/stoppers de Gato:** T-205 APK Quest Â· T-235 video Â· re-eval LLM (:9095 offline) Â·
  registro IP con abogado (dossier: registrar como sistema).
- **Huecos de la auditorÃ­a aÃºn abiertos:** H2 sin definiciÃ³n medible Â· H3 sin baseline FPS/watt
  vs Three.js (hacer con Fase 5) Â· specs de Fases 3-4-6 (se generan en su ventana).

## Cerrado 2026-07-03 (Entrada 034) â€” FASE 5 WebXR CODIFICADA + en producciÃ³n
- Gato: "Fase 5 completa, todo full". OQ resueltas (smooth-move+snap-turn, uniforms 256B, voz P2,
  HUD VR mÃ­nimo). Commits 4fcc78dâ†’130e631, todo LIVE en m13.phi-core.com.
- **D-5001**: uniforms 192â†’256B (`xr`+`viewport`+reserva). **Render estÃ©reo** sin romper 2D
  (`fs_main` viewport-aware; `renderEyePass`). **`XRCameraController`** (rig+locomociÃ³n+eyeVectors,
  11 tests). **SesiÃ³n WebXR** en engine (enterXR/onXRFrame estÃ©reo con XRGPUBinding). Preset
  **`quest_xr`**. BotÃ³n "Entrar en VR" + **voz editor-time** (Web Speech es-MX). **181/181 tests.**
- **STOPPER GATO:** T-501 (spike WebGPU+WebXR en el Quest â€” interop nueva, fallback 2D si falta) y
  T-513 (ChichÃ©n en VR + FPS estÃ©reo). Ver `docs/spec/phase-5-spec.md` + `docs/tasks/phase-5-tasks.md`.

## Actualizacion de credibilidad - 2026-07-27
- XR estereo corregido: el segundo ojo ya no limpia el framebuffer del primero.
- Cobertura real agregada para renderer, ciclo XR de dos ojos y recuperacion de fallo de inicializacion.
- Carga publica estricta: los campos desconocidos ahora fallan en vez de omitirse.
- CI: coverage, lint estricto, build completo y audit de produccion. Dependencias sin hallazgos high/critical.
- README/benchmark alineados: 30.8x es peso de assets y 2.5x es carga inicial; no se publica FPS sin medicion.
- **Gate sigue abierto:** T-501/T-513 necesitan Quest 3 fisico. No marcar Fase 5 como completada hasta anexar evidencia de visor.

## Reordenamiento de fases - 2026-07-27
- **Fase 3 congelada:** no ONNX, dataset, entrenamiento, inferencia ni decision de licencia hasta nueva orden.
- **Orden activo:** cerrar evidencia de Fase 5 en Quest, ejecutar Fase 6 y despues crear/aprobar el Spec Kit de Fase 4.
- **Riesgo de procedencia:** `m13.phi-core.com` contiene artefactos temporales que no estan en el checkout `main` actual. No contar esas funciones como Fase 6 verificada hasta localizar su revision fuente y pruebas.

## Siguiente acciÃ³n
Esperar T-501/T-513 de Gato en el Quest (valida VR real + ajusta `quest_xr`). Mientras, se puede
arrancar **Fase 6** (ediciÃ³n temporal + determinismo/replay = cimiento del multiplayer m13-platform).
Releer BITACORA (entradas 032-034) + `git log --oneline -18` al arrancar.

