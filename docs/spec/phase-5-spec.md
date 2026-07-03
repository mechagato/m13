# Spec — Fase 5: WebXR + Quest 3 inmersivo (+ voz editor-time)

**Proyecto:** m13 motor gráfico · **Fase:** 5 de 6 · codename **"immersive"**
**Estado:** BORRADOR v1 — esperando check-in de Gato (OQ-5.x en §9)
**Fecha:** 2026-07-02 · **Spec anterior:** phase-2-spec.md (Fase 2 cerrada 2026-06-26)
**Series:** tasks T-5xx · decisiones D-5xxx · CHANGELOG target 0.3.0
**Insumo:** auditoría técnica SDD 2026-07-02 (3 bloqueadores críticos identificados ANTES de codear).

---

## 1. La tesis de esta fase

Fases 1-2 demostraron síntesis local + detalle continuo **en pantalla plana** (incluida la ventana
2D del navegador del Quest, 70-72fps). Fase 5 rompe el cristal: **estar DENTRO del mundo** —
sesión `immersive-vr` real, render estéreo, head-tracking 6DOF, controllers. El pitch se vuelve
literal: *"la URL es el mundo — ábrela y CAMINA dentro, sin instalar nada"*.

Cierra la validación de **H3** (eficiencia en hardware XR) con número inmersivo real y es el
diferenciador #1 del demo de Innovafest (dic 2026).

## 2. Functional requirements

### FR-5.1 — Sesión WebXR (immersive-vr)
- `navigator.xr.requestSession('immersive-vr')` desde un botón "Entrar en VR" (visible solo si
  `xr.isSessionSupported` — en desktop/móvil sin XR el demo queda idéntico al actual).
- Reference space `local-floor`; loop con `XRSession.requestAnimationFrame` (72Hz nativo Quest).
- Salida limpia de la sesión (volver al canvas 2D sin recargar; el estado de escena se conserva).

### FR-5.2 — Render estéreo WebGPU (el corazón técnico)
- `renderFrameXR(state, xrFrame)`: itera `viewerPose.views` (2 ojos), render por vista con su
  viewport y matrices de vista/proyección XR.
- **Bloqueador 1 resuelto en diseño:** el pipeline actual dibuja 1 vista → se agrega el path XR
  sin tocar el path 2D (hash-regression y determinismo intactos).
- **Bloqueador 2 (uniforms):** struct lleno (192B). **Propuesta D-5001:** ampliar a **256B** con
  64B reservados (una sola migración D-108, blindada por el test de layout) — los campos XR
  (forward/right/up por ojo derivados de la view matrix) se escriben por vista antes de cada pass.
  Alternativa (binding separado) se descarta por complejidad de pipeline-layout. **Decisión en OQ-5.2.**
- El raymarcher actual construye rayos con camPos/camDir/camRight/camUp — las views XR se
  descomponen a esa misma base (transform.position + orientación) → **cero cambio en fs_main**.

### FR-5.3 — Cámara e input XR
- **Bloqueador 3 resuelto en diseño:** interfaz `ICameraController` — `FlyCamera` (2D actual,
  intacta) + `XRCameraController` (viewer pose manda; el rig se desplaza con locomoción).
- Locomoción: **stick izquierdo = smooth move del rig** (ya validado en 2D con Gamepad D-2111),
  stick derecho = snap-turn (30°, anti-mareo). Teleport = P2 si el tiempo alcanza.
- Clamps de bounds y `cameraSpeed` de la escena se respetan en VR.

### FR-5.4 — Presupuesto de rendimiento XR
- Preset **`quest_xr`** (D-5002): el raymarch corre ×2 vistas → arrancar con maxSteps ~48,
  shadowSteps 6, aoSamples 2, octaveCap 3, renderScale conservador + **foveation nativa del
  compositor** (`XRWebGLLayer.fixedFoveation` equivalente WebGPU si el runtime lo expone).
- La resolución dinámica (autoResolution) se adapta al framebuffer XR.
- **Microbench con Gato:** medición real en Quest ANTES de pulir (task temprana [QUEST-TEST]).

### FR-5.5 — Compatibilidad de escenas
- Las 11 escenas cargan en VR sin regresión (mismo WGSL → hash-regression lo garantiza).
- `spawn`/`bounds`/`cameraSpeed` funcionan en VR; escala 1m escena = 1m real.

### FR-5.6 — Voz editor-time (P2, opcional)
- Web Speech API (dictado) → prompt → generador/MCP → `.m13` → cargar en vivo. **Editor-time
  puro** (§3.7): la voz AUTORA la escena; el runtime jamás llama a la nube. Si Web Speech del
  navegador Quest requiere red del sistema, se documenta como autoría opcional (igual que el LLM).

## 3. Non-functional requirements
- **NFR-5.1** ≥60fps estéreo sostenido en Quest 3 en sala_galeria con `quest_xr` (aspiracional 72).
- **NFR-5.2** El path 2D queda byte-idéntico (hash-regression 11/11 + determinismo intactos).
- **NFR-5.3** Runtime + capa XR ≤ 100KB gzip (hoy ~80KB → margen 20KB para XR).
- **NFR-5.4** Cero red en runtime VR (§3.1). **NFR-5.5** typecheck/tests verdes en cada task.

## 4. Out of scope (Fase 5)
Hand tracking (gestos) → Fase 6+ · foveated por eye-tracking (Quest Pro) → no (solo foveation fija
del compositor) · físicas/colisión de manos → no · multiplayer → **m13-platform, post-fases**
(roadmap §6.5) · AR passthrough → post (existe `/scan` experimental, no se toca).

## 5. Success criteria (gate de cierre)
- **SC5-1** Chichén Itzá caminable EN VR (visor puesto) — validación de Gato grabada.
- **SC5-2** ≥60fps estéreo en sala_galeria (statusbar/HUD VR lo reporta) — número de Gato.
- **SC5-3** Locomoción stick + snap-turn sin mareo (reporte subjetivo de Gato).
- **SC5-4** Las 11 escenas cargan en VR; el modo 2D sin regresión (CI verde).
- **SC5-5** Entrar/salir de VR sin recargar ni fugas (dispose limpio verificado).
- **SC5-6** [P2] Una escena creada por voz de punta a punta.

## 6. Deliverables
Capa XR en `@m13/runtime` (sesión + estéreo + `XRCameraController` + preset `quest_xr`) · botón
"Entrar en VR" en examples · `@types/webxr` en devDeps · docs (README runtime + DEPLOY Quest) ·
paper corto H3 (`docs/papers/phase-5-xr-benchmark.md`) con los números del Quest.

## 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| Interop WebGPU↔WebXR inmadura en el navegador del Quest | **T-501 = spike gate**: probar `immersive-vr` + WebGPU en Quest ANTES de construir; si el navegador aún no lo soporta, fallback documentado (render a canvas + capa WebGL de presentación) y decisión con Gato |
| Raymarch ×2 no da 60fps | preset `quest_xr` agresivo + foveation fija + resolución dinámica; escenas lite si hace falta |
| Migración uniforms (zona D-108) | UNA sola migración a 256B, test de layout + hash-regression + auditoría adversarial antes de deploy |
| Mareo | snap-turn default, viñeta en movimiento (P2), velocidad moderada |

## 8. Método
Igual que Fases 1-2: este spec → plan → tasks (T-5xx) → implement con commits chicos; auditoría
adversarial del WGSL/XR antes de cada deploy; validación en Quest por Gato en 2-3 rondas marcadas
[QUEST-TEST]; BITÁCORA + memoria .phi por sesión.

## 9. Open questions (Gato — resolver en el check-in)
- **OQ-5.1** Locomoción default: ¿smooth move + snap-turn (recomendado) o teleport primero?
- **OQ-5.2** ¿Apruebas la migración de uniforms a 256B con 64B reservados (D-5001) — una sola
  pasada por la zona de riesgo que además deja espacio a Fases 3-6?
- **OQ-5.3** ¿La voz (FR-5.6) entra en Fase 5 como P2 o se difiere a Fase 6?
- **OQ-5.4** ¿HUD dentro de VR (fps/escena) mínimo o sin HUD (más inmersivo)?
