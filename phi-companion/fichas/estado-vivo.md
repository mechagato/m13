---
name: estado-vivo
description: Estado vivo de m13 (snapshot 2026-07-03). Fuente humana = BITACORA_MOTOR13.md.
metadata: {type: project}
---

# Estado vivo — m13 (2026-07-03)

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

## Cerrado 2026-06-29 (Entrada 032)
**T-225 micro-detalle <40cm + F6 Nyquist edge AA (sin hardware):**
- **T-225:** `fbm_continuous` ahora aplica `nearBoost` logarítmico: cuando `footprint` es muy
  pequeño (cerca), la frecuencia base del FBM escala hasta 6× para revelar detalle sub-grid
  que las octavas a cap ya no aportaban. Fórmula: `clamp(1-log2(footprint)*0.35, 1, 6)`. El
  dominio arranca a `freq=nearBoost` en lugar de 1, desplazando el espectro hacia arriba sin
  cambiar el conteo de octavas (Nyquist preservado).
- **F6:** AA de bordes geométricos en `fs_main` usando `dpdxFine`/`dpdyFine` WGSL. Detecta
  bordes (edgeMag > 0.0016) y lanza 2 rayos adicionales en offsets ±0.5px horizontal,
  promedia los 3. Coste solo en píxeles de borde — presupuesto Quest intacto en superficies.
  Refactoring: `traceColor(uvFixed)` extrae la lógica del rayo para reutilizarla.
- typecheck 6/6 · **157/157 tests** · hashes regenerados (`pnpm gen:hashes`).

## Cerrado 2026-07-02 (Entrada 033) — AUDITORÍA 7 LENTES + credibilidad IP + plan fases 3-6
- **Quest RE-MEDIDO por Gato: 70-72fps** con resolución dinámica → ultra-opt VALIDADO.
- **Auditoría 7 lentes** (3 SDD + 4 forenses adversariales). **Veredicto IP: SÓLIDO CON MATICES —
  REGISTRABLE.** Cero vaporware (22/22 capacidades verificadas). Detalle continuo = REAL pero el
  kernel es prior art → **registrar como SISTEMA integrado, no como algoritmo** (marca "m13"/
  "Sonido 13" protegible). Ver BITACORA 033 para el desglose completo.
- **Correcciones aplicadas** (commits 1a90c5a, 0133b14, 4f366d4): encuadre honesto del benchmark
  (30.8×=assets; sin texturas 2.83×), notas SC-4, **constitution v0.1.1** (formaliza skip 3-4),
  dominio MCP→m13.phi-core.com, fix flake de tests, CLAUDE.md al día. **170/170 tests.**
- **NUEVOS TESTS que fijan la IP:** `packages/runtime/src/shaders/__tests__/fbm-continuous-math.test.ts`
  (5 propiedades del Sonido 13) + `packages/runtime/src/camera/__tests__/fly-camera.test.ts`.
- **PLAN MAESTRO fases 3-6 AUTORIZADO por Gato:** orden Innovafest-first **5→6→(Innovafest dic)→3→4**.
  Ver `docs/plans/roadmap-fases-restantes.md`. Multiplayer/gaming = m13-platform (proyecto hermano
  post-fases; Fase 6 determinismo+replay es su cimiento) — §6.5 del roadmap.

## Pendientes (post-auditoría)
- **CHECK-IN DE GATO del Spec Fase 5** (`docs/spec/phase-5-spec.md`): resolver **OQ-5.1..5.4**
  (locomoción, migración uniforms 256B D-5001, voz P2, HUD VR) → luego Plan → Tasks → Implement.
- **T-501 spike gate (Gato):** probar `immersive-vr`+WebGPU en el navegador del Quest ANTES de
  construir Fase 5 (riesgo de interop inmadura).
- **Opcionales/stoppers de Gato:** T-205 APK Quest · T-235 video · re-eval LLM (:9095 offline) ·
  registro IP con abogado (dossier: registrar como sistema).
- **Huecos de la auditoría aún abiertos:** H2 sin definición medible · H3 sin baseline FPS/watt
  vs Three.js (hacer con Fase 5) · specs de Fases 3-4-6 (se generan en su ventana).

## Cerrado 2026-07-03 (Entrada 034) — FASE 5 WebXR CODIFICADA + en producción
- Gato: "Fase 5 completa, todo full". OQ resueltas (smooth-move+snap-turn, uniforms 256B, voz P2,
  HUD VR mínimo). Commits 4fcc78d→130e631, todo LIVE en m13.phi-core.com.
- **D-5001**: uniforms 192→256B (`xr`+`viewport`+reserva). **Render estéreo** sin romper 2D
  (`fs_main` viewport-aware; `renderEyePass`). **`XRCameraController`** (rig+locomoción+eyeVectors,
  11 tests). **Sesión WebXR** en engine (enterXR/onXRFrame estéreo con XRGPUBinding). Preset
  **`quest_xr`**. Botón "Entrar en VR" + **voz editor-time** (Web Speech es-MX). **181/181 tests.**
- **STOPPER GATO:** T-501 (spike WebGPU+WebXR en el Quest — interop nueva, fallback 2D si falta) y
  T-513 (Chichén en VR + FPS estéreo). Ver `docs/spec/phase-5-spec.md` + `docs/tasks/phase-5-tasks.md`.

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

## Siguiente acción
Esperar T-501/T-513 de Gato en el Quest (valida VR real + ajusta `quest_xr`). Mientras, se puede
arrancar **Fase 6** (edición temporal + determinismo/replay = cimiento del multiplayer m13-platform).
Releer BITACORA (entradas 032-034) + `git log --oneline -18` al arrancar.
