# Plan maestro — terminar de codificar TODAS las fases de m13 (3, 4, 5, 6)

**Fecha:** 2026-07-02 · **v2** (incorpora la auditoría SDD + forense de 7 lentes del 2026-07-02)
**Estado a hoy:** Fases 0-2 ✅ COMPLETAS y en producción (m13.phi-core.com) · 157 tests · Quest 70-72fps.
**Definición de "terminado":** las 6 fases de la Constitution codificadas, testeadas, desplegadas y
con sus tesis (H1-H5) validadas o explícitamente marcadas — más las correcciones de credibilidad IP.
**Gobernanza:** cada fase = Spec Kit (Spec→Plan→Tasks) con check-in de Gato ANTES de codear (§8.2).

---

## §0 — Resultado de la auditoría (2026-07-02, 7 lentes: 3 SDD + 4 forenses)

**Credibilidad IP: SÓLIDO CON MATICES — REGISTRABLE.** Cero vaporware; 22/22 capacidades
verificadas contra código; tests ~90% genuinos; benchmark y tesis reproducidos empíricamente.
**Recomendación forense: registrar como SISTEMA/producto integrado** (formato .m13 semántico
LLM-first + compilador determinista YAML→WGSL + detalle continuo + local-first WebGPU/WebXR),
NO como algoritmo de ruido (el kernel matemático es prior art; "Sonido 13" = identidad/marca protegible).

**Correcciones en curso (workflow `fix-huecos-auditoria`, pre-autorizadas por Gato):** encuadre del
benchmark 30.8×, matices del eval LLM (estructural ≠ semántico, gateway offline), editor LLM
no-desplegado anotado, dominio del MCP → m13.phi-core.com, footnote de skip 3-4 en Constitution
v0.1.1, CLAUDE.md al día, fix del flake de timeout, y 2 suites nuevas que **fijan la matemática de
la IP** (fbm_continuous/pixelFootprint) y cubren FlyCamera.

---

## §1 — Orden de ejecución (recomendado: Innovafest-first)

```
JULIO        Fase 5 — WebXR inmersivo (Quest 3)          ← el wow de Innovafest
AGO-SEP      Fase 6 — Edición temporal + Compositor       ← segundo diferenciador demo
OCT-NOV      Fase 3 — Síntesis neural local (ONNX)        ← arranca si Innovafest está cubierto*
DIC          INNOVAFEST 🎯 (polish, video, ensayos — no features nuevas en las 2 semanas previas)
ENE-MAR 2027 Fase 4 — Gaussian Splatting híbrido          ← la más pesada, post-evento
```
\* Fase 3 tiene un largo camino de datos/entrenamiento que puede correr EN PARALELO (dataset desde ya,
entrenamiento en el servidor de Gato) mientras 5-6 se codifican. La integración ONNX al runtime se
hace en su ventana oct-nov.

**Alternativa B (orden Constitution 3→4→5→6):** pone los 2 frentes de investigación pesada ANTES
del evento → riesgo alto de llegar a diciembre sin el demo inmersivo. NO recomendada.

---

## §2 — Fase 5: WebXR + Quest 3 inmersivo (JULIO · est. 2-3 semanas de código)

**Qué entrega:** pasar de "ventana 2D en el navegador del Quest" a **estar DENTRO del mundo**
(VR estéreo real). Chichén Itzá caminable EN el visor. Cierra H3 con número inmersivo.

**Pre-fase de plomería (los 3 bloqueadores CRÍTICOS que encontró la auditoría técnica):**
1. **Render estéreo:** el pipeline actual dibuja 1 vista; XR necesita 2 (una por ojo) —
   `renderFrameXR(state, xrFrame)` iterando `viewerPose.views` con viewport por ojo.
2. **Uniforms:** struct lleno (192B, D-108) → ampliar a 256B con padding reservado (UNA migración,
   test de layout la blinda) o binding XR separado. Decisión en el Spec.
3. **Cámara:** interfaz `ICameraController` — `FlyCamera` (2D, actual) + `XRCameraController`
   (viewer pose + XR input; teleport con controllers).
Además: `@types/webxr`, preset `quest_xr` (el raymarch ×2 vistas — microbench con Gato), y
`XRSession.requestAnimationFrame` en el loop.

**Success criteria (borrador para el Spec):** Chichén en VR ≥72fps sin mareo · controllers
(teleport + mirar) · todas las escenas cargan en VR sin regresión 2D (hash-regression intacto) ·
voz editor-time opcional (Web Speech → .m13, P2). **Stopper Gato:** validación en Quest (varias rondas).

## §3 — Fase 6: Edición temporal + Sabio Compositor (AGO-SEP · est. 2-3 semanas)

**Qué entrega:** escenas con TIEMPO — timeline/keyframes/eventos en el formato `.m13`
(`animate` v2: keyframes con interpolación determinista), replay determinista (grabar input +
timestamps → reproducir exacto, §3.5), y el "Sabio Compositor" editor-time (agente que compone
escenas temporales — LLM solo en autoría, nunca runtime).
**Pre-requisito técnico (de la auditoría):** versionado del schema (v0.1 → v0.2 con migración
retro-compatible) — se instala aquí porque Fase 6 es la primera que muta el formato fuerte.
**Demo:** Chichén con amanecer→atardecer + evento (fuego ceremonial a las X seg) — material Innovafest.

## §4 — Fase 3: Síntesis neural local ONNX (OCT-NOV + dataset desde YA · est. 4-8 sem, paralelo)

**Qué entrega (tesis H4):** materiales/formas sintetizados por red neural LOCAL (onnxruntime-web,
backend WebGPU) — cero nube en runtime (§3.1 intacto).
**Dos caminos (Idea 6):** A) LLM chico local fine-tuneado (prompt→.m13 sin internet — cierra el
círculo D-025-06 al 100%) · B) Neural SDFs (DeepSDF — la red ES la forma, la tesis Sonido 13 con pesos).
**Arranque INMEDIATO y barato (no espera a octubre):** persistir TODA escena generada (demo/editor/
MCP) como dataset — la fábrica de datos auto-validada ya existe; el tiempo juega a favor.
**Stoppers:** entrenamiento en el servidor de Gato · decisión npm publish + licencia (§8.4 dice
"privado hasta Fase 3" — aquí se resuelve con el abogado, alineado al registro IP).

## §5 — Fase 4: Gaussian Splatting híbrido (ENE-MAR 2027 · est. 4-6 sem)

**Qué entrega:** captura real (splats de fotogrametría) coexistiendo con síntesis SDF en la misma
escena. **Requiere re-arquitectura:** `MultiPipelineRenderer` (raymarch + splatting + composición
con depth), `kind: gaussian_splat` en el schema, y `ModelRegistry` (caché/versionado/hash de
modelos —también lo usa Fase 3). Es la fase más pesada; va después del evento a propósito.

## §6 — Transversales (se intercalan, no son fases)

| Ítem | Cuándo | Nota |
|---|---|---|
| **CSG en `.m13`** (opSub/opSmoothUnion al schema) | ventana libre post-F5 | pulir Chichén con detalle real; WGSL ya existe |
| **H2 medible** (firma estética) | con Fase 5 | definición verificable + A/B documentado vs LOD clásico (pide la auditoría) |
| **H3 benchmark** (FPS/watt vs Three.js en Quest) | con Fase 5 | falta baseline comparativo; paper `phase-5-quest-benchmark.md` |
| **Re-eval LLM (H5)** | cuando reviva :9095 | re-correr 30 prompts tras refactor B5/B6 + criterio semántico opcional |
| **Editor LLM público** | post H-01 (token server-side) | hoy código completo sin desplegar |
| **Registro IP** | decide Gato | dossier técnico honesto para el abogado (opcional, lo preparo) |
| **Pilotos B2B** (PLANVR/Domus/FlowCAD-viewer) | ago+ | requieren confirmación de cliente por Gato |

## §6.5 — m13 for gaming / multiplayer: dónde vive (aclaración pedida por Gato 2026-07-02)

**El multiplayer/netcode NO está dentro de las Fases 3-6** — por decisión propia de Gato ya
registrada: Constitution §5 lo excluye del scope ("hasta nuevo aviso") y la Idea 2 del CLAUDE.md
("m13-platform", el "nuevo Roblox" con NPCs LLM + netcode + physics + avatares) fue confirmada por
Gato el 2026-05-21 como **proyecto hermano separado, POST-éxito comercial de m13** (~18-24 meses,
repo aparte). No es una fase del motor.

**Lo que las fases SÍ aportan al gaming:** la **Fase 6 es el CIMIENTO técnico del multiplayer** —
determinismo runtime (§3.5: mismas entradas = mismas salidas) + replay determinista (grabar
input/timestamps → reproducir exacto) son exactamente los pre-requisitos de un netcode simple
(lockstep/rollback) sin sincronización compleja. Al cerrar las 6 fases, el motor queda **listo para
que m13-platform se construya encima** — el netcode en sí es la siguiente carrera, con su propio
Spec y decisión go/no-go de Gato.

## §7 — Método (idéntico al que ya funcionó en Fases 1-2)

Spec Kit → check-in Gato → tasks chicas con commit por avance → typecheck+tests+hash-regression
verdes → **auditoría adversarial del WGSL antes de cada deploy** (sin GPU en Cerebro4) → deploy →
**validación visual/Quest de Gato** → BITÁCORA + memoria `.phi` por sesión. Las 6 fases cierran con
su gate de criterios + CHANGELOG (0.3.0=F5, 0.4.0=F6, 0.5.0=F3, 0.6.0=F4).

## §8 — Qué NO es código y queda fuera de mi alcance directo (stoppers de Gato)

Validaciones Quest/laptop (recurrentes) · entrenamiento neural (su server) · licencia + registro IP
(abogado) · confirmación de pilotos B2B · video/ensayos Innovafest · APK Quest (T-205, opcional).

---

**Gate de arranque:** este plan requiere la autorización de Gato. Al autorizar, la ejecución empieza
por el Spec Kit de Fase 5 (mismo día) y no se detiene salvo stoppers.
