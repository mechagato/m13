# Spec — Fase 2: Sonido 13 visual (detalle continuo)

**Proyecto:** m13 motor gráfico
**Fase:** 2 de 6 · codename "Sonido 13 visual"
**Estado:** BORRADOR v1 — esperando aprobación de dirección por Gato
**Fecha:** 2026-06-12 (despausado por orden directa de Gato esta fecha)
**Spec anterior:** `phase-1-spec.md` (gate 2026-05-28; cierre real de criterios jun-2026)
**Roadmap:** junio 2026 (CLAUDE.md §Directiva Estratégica — Innovafest dic 2026)

---

## 1. La tesis de esta fase

Fase 1 demostró que un mundo se puede describir en ~2KB y sintetizarse local. Fase 2
ataca la apuesta central del proyecto, la que le da nombre: **aplicar el microtonalismo
de Julián Carrillo al detalle visual.**

En un engine tradicional el detalle es *discreto*: niveles de LOD que "brincan"
(LOD0→LOD1 = semitonos), mipmaps, texturas de resolución fija. En m13 el mundo es una
función continua — el detalle puede ser una **función continua de la distancia de
observación**: acercarte a una pared no cambia de nivel, *revela* frecuencias nuevas
del material, como subdividir el intervalo entre dos notas en dieciseisavos de tono.

De la BITACORA (entrada 002): *"Puede no producir nada perceptual, o puede generar una
firma estética única. Apostamos por descubrirlo en Fase 2."* Esta fase es ese
descubrimiento, más la infraestructura que lo hace medible y demostrable.

---

## 2. Las 5 prioridades (reconstruidas de referencias documentadas — confirmar con Gato)

La lista numerada nunca quedó escrita como tal; se reconstruye de: Idea 1 de CLAUDE.md
(PWA = "primera tarea de Fase 2"), nota de auditoría en `raymarch.ts` (uniforms de
calidad "candidatas a Fase 2"), `m13-live/VISION.md` ("FFT audio→visual = prioridad 4
de Fase 2", "seeds por instancia", "uniforms de calidad"), y D-1504 (updateMatParams).

| # | Prioridad | Qué es | Por qué |
|---|---|---|---|
| P1 | **PWA instalable** (Idea 1) | manifest + service worker + botón Install — el demo se instala como app en desktop/Quest, offline tras primera carga | Cierra NFR-2 de Fase 1 · responde la pregunta de Gato "app para el Quest" · 1ª task declarada del plan |
| P2 | **Detalle continuo (el core)** | octaves/frecuencia de los conceptos materiales como función continua del footprint del pixel (distancia + resolución) | LA tesis Sonido 13. Firma visual única. El pitch de Innovafest |
| P3 | **Uniforms de calidad** | steps de raymarch, shadow steps, AO samples, octave cap → uniforms configurables por dispositivo, no constantes hardcodeadas | Deuda de auditoría 06-10 · necesidad REAL medida hoy en Quest (37-48fps → D-2112) · regalo a m13-live |
| P4 | **FFT audio→visual** | el `audioAmp` único se vuelve 3-4 bandas (graves/medios/agudos) vía AnalyserNode — materiales y luces reaccionan por banda | Sonido 13 *literal* · documentado como prioridad 4 en VISION de m13-live |
| P5 | **Seeds por instancia** | cada objeto puede llevar `seed` propio que varía su material proceduralmente (vetas distintas en dos mármoles iguales) | Riqueza visual gratis · requisito de crowd-mirror (m13-live) |

**Bonus si cabe (no compromiso):** `engine.updateMatParams()` live sin re-compile (D-1504).

---

## 3. Functional requirements

### FR-1 — PWA instalable (P1)
- FR-1.1 `manifest.json` con icons (192/512), theme color `#050807`, `display: standalone`.
- FR-1.2 Service worker: precache del bundle + escenas `.m13`; estrategia cache-first
  con revalidación. El demo funciona offline tras la primera carga.
- FR-1.3 Botón "Instalar app" visible cuando el browser dispara `beforeinstallprompt`
  (y guía manual para Quest/Safari donde el evento no existe).
- FR-1.4 El share link `#scene=` funciona también offline (la URL ES la escena — no
  requiere red, solo el runtime cacheado).

### FR-2 — Detalle continuo (P2, el core)
- FR-2.1 El compilador emite para cada concepto material una versión cuyo número
  efectivo de octaves FBM es **función continua** de la distancia cámara-superficie y
  del footprint del pixel: `octaves(d) = clamp(base + log2(k/d), min, max)` con
  **blending fraccional** de la última octave (sin pops — ése es el microtono).
- FR-2.2 Al menos 4 conceptos existentes migrados a detalle continuo (candidatos:
  `marmol_blanco_vetas`, `piedra_volcanica`, `pared_ladrillo_viejo`, `metal_oxidado`).
- FR-2.3 Micro-detalle de proximidad: a <40cm de una superficie aparecen frecuencias
  que a 3m no existen (domain perturbation escalada por cercanía) — presupuestado para
  no romper NFR-fps.
- FR-2.4 Anti-aliasing procedural: las frecuencias que exceden el footprint del pixel
  se atenúan (filtrado analítico), no se muestrean (nada de shimmer al moverse).
- FR-2.5 Una **escena showcase nueva** (`sonido13_zoom.m13`) diseñada para demostrar
  el zoom continuo — el material revela 3+ "registros" de detalle al acercarse.

### FR-3 — Uniforms de calidad (P3)
- FR-3.1 Struct de calidad en uniforms: `maxSteps`, `shadowSteps`, `aoSamples`,
  `octaveCap`, `renderScale` (los hardcoded de `raymarch.ts` señalados en auditoría).
- FR-3.2 Presets: `quest` / `mobile` / `desktop` / `ultra`, auto-seleccionados por
  device (heurística D-2110/D-2112) y override por API + query param.
- FR-3.3 API pública: `engine.setQuality(preset | partial)` sin recompilar shader.
- FR-3.4 Resultado medible: Quest 3 sostiene **≥72fps** con preset `quest` en
  `sala_galeria` (cierra formalmente SC-6/NFR-7 de Fase 1 si el retest 0.7 no bastó).

### FR-4 — FFT audio→visual (P4)
- FR-4.1 `MicAudioInput` expone 3 bandas (graves <250Hz, medios 250-2k, agudos >2k)
  normalizadas 0..1 vía AnalyserNode FFT — además del amplitude actual (compat).
- FR-4.2 Uniforms nuevos: `audioBands: vec3<f32>` (layout actualizado en WGSL +
  `writeUniforms` + `UNIFORM_BYTES` sincronizados — regla D-108).
- FR-4.3 Los conceptos materiales pueden declarar reactividad por banda; al menos 2
  conceptos demo la usan (ej: graves → pulso de emisión, agudos → brillo de vetas).
- FR-4.4 El schema `.m13` permite `audio_reactive: true | { band: bass|mid|treble }`
  (retro-compatible: `true` = amplitude como hoy).

### FR-5 — Seeds por instancia (P5)
- FR-5.1 Campo opcional `seed: number` por objeto en el schema `.m13`.
- FR-5.2 El compilador inyecta el seed como offset de dominio en el concepto material
  → dos objetos con mismo material y seed distinto se ven como "hermanos, no clones".
- FR-5.3 Determinismo intacto: misma escena + mismos seeds = mismo hash WGSL (los
  tests de determinismo T-012 se extienden a seeds).

---

## 4. Non-functional requirements

- **NFR-2.1** El detalle continuo NO baja el fps de las escenas demo existentes en
  desktop (presupuesto: el costo se paga solo donde el footprint lo permite).
- **NFR-2.2** Quest 3 con preset `quest`: ≥72fps en sala_galeria (hereda y cierra NFR-7/SC-6).
- **NFR-2.3** Bundle runtime sigue <100KB gzip (hoy 58.6KB — margen para FFT + quality).
- **NFR-2.4** Determinismo del compilador intacto (mismo input → mismo hash SHA-256).
- **NFR-2.5** Cero red en runtime; el service worker NO introduce llamadas nuevas
  (solo cachea lo que ya se servía). Constitution §1 intacta.
- **NFR-2.6** Retro-compatibilidad: TODA escena `.m13` v0.1 de Fase 1 renderiza igual
  o mejor sin cambios (schema solo agrega campos opcionales).

---

## 5. Out of scope (NO en Fase 2)

- ❌ Síntesis neural ONNX (Fase 3 — saltada para Innovafest según directiva)
- ❌ Gaussian Splatting (Fase 4 — saltada)
- ❌ WebXR inmersivo / modo VR real (Fase 5 — julio)
- ❌ Módulos m13-live (cue-engine, crowd-mirror, gesture-trigger) — subproyecto aparte;
  Fase 2 solo entrega las dependencias (P3, P4, P5)
- ❌ Editor visual drag-and-drop, scripting, física
- ❌ Endpoint LLM público del demo (stopper de Gato, decisión comercial)
- ❌ Variante ChatGPT del MCP + publicación (post-Fase 2)

---

## 6. Success criteria (gate de cierre Fase 2)

- **SC2-1** Zoom continuo: acercarse de 3m a 5cm a una superficie migrada muestra
  detalle creciente SIN pops ni shimmer (validación visual de Gato grabada en video
  — el video es además material de Innovafest).
- **SC2-2** A/B medible: la escena showcase con detalle continuo ON vs OFF (octaves
  fijas) — diferencia visible en screenshots a 3 distancias, fps dentro de ±10%.
- **SC2-3** PWA: Chrome desktop ofrece instalación; abre standalone; funciona en
  avión-mode tras primera carga. (Cierra NFR-2 de Fase 1.)
- **SC2-4** Quest 3: ≥72fps sostenidos en sala_galeria con preset `quest`.
- **SC2-5** Demo audio: con música, 3 bandas producen reacciones visualmente
  distinguibles en la escena showcase.
- **SC2-6** Seeds: 5 objetos mismo material / distinto seed se perciben como variación
  natural (screenshot evidencia) y el hash WGSL se mantiene determinista.
- **SC2-7** Las 10 escenas de Fase 1 renderizan sin cambios (regresión cero — smoke
  test extendido).

**Fallida si:** el detalle continuo no produce diferencia perceptible (la apuesta era
descubrirlo — si falla, se documenta honestamente y la fase pivota a P1/P3/P4/P5 como
entregables) · o Quest <60fps incluso con preset quest · o se rompe retro-compat.

---

## 7. Riesgos y mitigaciones

**R1 — El detalle continuo no se nota (riesgo de tesis).**
*Mitigación:* prototipo de FR-2.1 en UNA superficie en la primera semana ANTES de
migrar 4 conceptos. Gate temprano con Gato: si no convence visualmente, pivote.

**R2 — Presupuesto de GPU en Quest.** Más octaves cerca = más ALU.
*Mitigación:* P3 (uniforms de calidad) se construye ANTES que P2 en el orden de tasks;
`octaveCap` por preset limita el costo en standalone.

**R3 — Uniform layout corrupto (FFT + quality amplían el struct).**
*Mitigación:* regla D-108 (WGSL + writeUniforms + UNIFORM_BYTES en el mismo commit) +
test de layout que falle si los tamaños divergen.

**R4 — Scope creep hacia m13-live.** Las 3 dependencias (P3/P4/P5) invitan a "ya que
estamos, el cue-engine…". *Mitigación:* out-of-scope explícito §5; m13-live consume,
no dirige.

**R5 — Service worker cachea de más y "congela" deploys.**
*Mitigación:* versión de cache ligada al hash del build; `skipWaiting` + banner
"nueva versión disponible".

---

## 8. Open questions (para Gato antes del Plan)

- **OQ-1:** ¿Confirmas las 5 prioridades y su orden (P1 PWA → P3 quality → P2 core →
  P4 FFT → P5 seeds como orden de implementación)? Nota: P3 antes que P2 es deliberado
  (R2) aunque P2 sea el corazón.
- **OQ-2:** ¿La escena showcase (FR-2.5) es nueva o prefieres evolucionar
  `templo_mexica` (ya tiene identidad fuerte para el zoom de piedra)?
- **OQ-3:** ¿El video del zoom (SC2-1) lo grabamos en tu laptop (mejor GPU) o en
  Quest (mejor narrativa)?
- **OQ-4:** PWA: ¿solo demo público o también el editor Next.js? (NFR-2 de Fase 1
  hablaba del editor; el valor inmediato está en el demo.)

---

## 9. Decisión gate para arrancar implementación

- [ ] Gato confirma las 5 prioridades y resuelve OQ-1..OQ-4
- [ ] SC-6/NFR-7 de Fase 1 cerrado con número (retest 0.7 pendiente — corre en paralelo)
- [ ] `docs/plans/phase-2-plan.md` generado a partir de este spec
- [ ] `docs/tasks/phase-2-tasks.md` generado (serie T-2xx, decisiones serie D-3xxx)

*Cualquier desvío de este documento se registra en BITACORA_MOTOR13.md con su D-3xxx.*
