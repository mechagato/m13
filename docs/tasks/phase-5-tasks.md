# Tasks — Fase 5: WebXR + Quest 3 inmersivo

**Spec:** `docs/spec/phase-5-spec.md` · **Serie:** T-5xx · **Decisiones:** D-5xxx
**OQ resueltas (Gato "todo full" 2026-07-03):** OQ-5.1 = smooth-move + snap-turn · OQ-5.2 = SÍ 256B ·
OQ-5.3 = voz P2 dentro de Fase 5 · OQ-5.4 = HUD VR mínimo (v1 sin HUD, más inmersivo).

Estado: la mayor parte del CÓDIGO de Fase 5 está implementada y en producción; lo que resta
depende del hardware (Quest de Gato) — es el gate de validación previsto.

| Task | Qué | Estado |
|---|---|---|
| **T-501** | Spike gate: `immersive-vr` + WebGPU (`XRGPUBinding`) real en el navegador del Quest | ⏳ **STOPPER GATO** — código listo con fallback claro; falta confirmar interop en el visor |
| **T-502** | D-5001: uniforms 192→256B (`xr` + `viewport` + reserva fases 3-6) + test layout | ✅ (commit 4fcc78d) |
| **T-503** | `fs_main` viewport-aware (uv centrado por ojo; 2D byte-idéntico) | ✅ (370f109) |
| **T-504** | `renderEyePass` (dibuja un ojo a textura+viewport arbitrarios) | ✅ (4fcc78d) |
| **T-505** | `XRCameraController`: rig + smooth-move + snap-turn + `eyeVectors` (rig∘view) | ✅ (370f109) |
| **T-506** | 11 tests de la matemática XR (composición, fov, IPD, locomoción, snap-turn) | ✅ (370f109) |
| **T-507** | Sesión WebXR en el engine: `enterXR/exitXR/onXRFrame` estéreo, cierre limpio | ✅ (8d5d9ed) |
| **T-508** | Preset `quest_xr` (×2 ojos) + auto-aplicar/restaurar al entrar/salir | ✅ (130e631) |
| **T-509** | Botón "Entrar en VR" (si `isXRSupported`) en examples | ✅ (130e631) |
| **T-510** | Voz editor-time (Web Speech es-MX → `generateFromPrompt` → render) | ✅ (130e631) |
| **T-511** | `@types/webxr` en devDeps | ⚪ omitido a propósito — tipos WebXR mínimos locales (sin dep; `XRGPUBinding` no está en @types aún) |
| **T-512** | Deploy a m13.phi-core.com | ✅ (130e631) |
| **T-513** | [QUEST-TEST] Chichén Itzá caminable en VR + FPS estéreo (SC5-1/2/3) | ⏳ **STOPPER GATO** |
| **T-514** | Ajuste de `quest_xr` según microbench + paper H3 FPS/watt | ⏳ tras T-513 |
| **T-515** | Foveation fija del compositor (si el runtime la expone) | ⚪ P2 — tras T-513 |

## Gate de cierre (SC5-x)
Pendientes de hardware (Gato): SC5-1 (Chichén en VR), SC5-2 (≥60fps estéreo), SC5-3 (locomoción
sin mareo), SC5-6 (voz). ✅ ya: SC5-4 (11 escenas cargan / 2D sin regresión — 181 tests, hashes
intactos), SC5-5 (entrar/salir sin fugas — dispose XR limpio).

## Riesgo vivo
**Interop WebGPU↔WebXR** (`XRGPUBinding`) es muy nueva; el navegador del Quest podría no traerla
aún → el código lanza error claro y el usuario usa la vista 2D. T-501 lo confirma en el visor.
Si falta, el fallback (render a canvas + capa WebGL de presentación) se documenta y decide con Gato.
