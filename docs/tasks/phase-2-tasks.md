# Tasks — Fase 2: Sonido 13 visual

**Plan fuente:** `docs/plans/phase-2-plan.md` · **Spec:** `docs/spec/phase-2-spec.md`
**Serie:** T-201+ · decisiones D-3xxx · cada task 30-90 min con criterio de done.
**Definition of done global (toda task):** `pnpm typecheck` limpio · tests verdes ·
`pnpm dev` arranca sin errores de consola · BITACORA actualizada · commit semántico.

---

## P1 — PWA instalable (T-201..T-205)

### T-201 Manifest + icons
- Crear `tools/gen-icons.ts` (sharp, ya en stack global → dep dev del root si falta,
  justificar D-3003): SVG logo m13 → PNG 192/512 + favicon.
- `packages/examples/public/manifest.webmanifest`: name "m13 — mundos de 2KB",
  short_name "m13", display standalone, theme/background `#050807`, icons.
- `<link rel="manifest">` + meta theme-color en index.html.
- **Done:** DevTools → Application → Manifest sin warnings.

### T-202 Service worker cache-first con versión de build
- `packages/examples/public/sw.js`: install → precache (index, assets, escenas, scan);
  fetch → cache-first con fallback red; activate → purga caches viejos.
- Nombre de cache = `m13-${__BUILD_HASH__}` — hash inyectado vía `vite define`
  (git short hash). `skipWaiting` + `clients.claim` + postMessage "updated".
- Registro en main.ts (solo en build prod — en dev estorba).
- **Done:** segunda carga sirve desde SW (DevTools offline → la app abre completa).

### T-203 Botón instalar + banner de actualización
- `beforeinstallprompt` → botón "instalar app" en statusbar; click → prompt().
- Mensaje "updated" del SW → banner discreto "nueva versión — recarga".
- Quest/iOS sin evento: tooltip con pasos manuales (menú browser → Add to Home).
- **Done:** Chrome desktop instala como ventana standalone.

### T-204 Verificación offline E2E + smoke
- Puppeteer: cargar página → `page.setOfflineMode(true)` → reload → la app renderiza
  y un share link `#scene=` abre (la URL es la escena — no necesita red).
- Extender `tools/smoke-test.mjs`: manifest 200 + sw.js 200.
- **Done:** script E2E pasa local; smoke 20/20 contra producción tras deploy.

### T-205 [GATO + opcional] APK para Quest via ovr-platform-util
- Descargar CLI de Meta, `createpwa` apuntando a motor13.neonodos.com, sideload por
  adb (requiere Quest conectado/dev mode — coordinar con Gato).
- **Done:** ícono m13 en la biblioteca del Quest abre la app fullscreen.

## P3 — Uniforms de calidad (T-211..T-215)

### T-211 [CRÍTICA] Uniform layout v2 (quality + audioBands juntos — D-3002)
- `shaders/common.ts`: struct +`quality: vec4<f32>` +`audioBands: vec4<f32>`.
- `renderer/index.ts`: `writeUniforms` + `UNIFORM_BYTES` (160 → 192) MISMO commit.
- Test nuevo de layout: tamaño calculado del struct WGSL == UNIFORM_BYTES.
- audioBands se escribe con amplitude en .w desde ya (compat); bandas en 0 hasta P4.
- **Done:** test de layout verde + las 10 escenas renderizan igual (hashes intactos
  — el struct cambia pero el WGSL generado de escena no).

### T-212 Quality en raymarch.ts
- Constantes hardcodeadas (maxSteps, shadowSteps, aoSamples — las de la nota de
  auditoría) → leen `u.quality`. Loops con bound dinámico.
- Default = valores actuales exactos (cero cambio visual de default).
- **Done:** hashes de escena cambian UNA vez (registrar baseline nuevo); A/B visual
  default vs hoy = idéntico en screenshot diff.

### T-213 engine.setQuality + presets + auto-detect
- `Quality` type + presets `quest|mobile|desktop|ultra` (incluyen renderScale).
- Auto-detect absorbe D-2110/D-2112; examples simplifica su lógica de dpr a
  `engine.setQuality(autoPreset())` + override `?quality=` y `?dpr=` fino.
- **Done:** API pública documentada en README runtime; demo cambia presets en vivo.

### T-214 Selector de calidad en Ajustes (examples)
- Dropdown preset + indicador del preset activo en statusbar.
- **Done:** cambio en vivo sin recargar escena.

### T-215 [GATO] Retest Quest con preset quest
- Gato abre motor13.neonodos.com en Quest → statusbar fps.
- **Done:** ≥72fps en sala_galeria → SC-6 + NFR-7 de FASE 1 cerrados formalmente
  en BITACORA + tabla del gate. (≥90 = NFR-7 estricto ✓.)

## P2 — Detalle continuo (T-221..T-227)

### T-221 [GATE GATO] Prototipo fbm_continuous en un concepto
- `fbm_continuous` en `shaders/common.ts` (octaves fraccionales por footprint).
- `piedra_volcanica` duplicada como `piedra_volcanica_s13` (flag, no migración).
- Página A/B: `?s13=on|off` en una escena de prueba.
- **Done:** GATO VE EL A/B y decide: "se nota y gusta" → seguir · "no se nota" →
  pivote documentado (la fase entrega P1/P3/P4/P5 + showcase con detalle clásico).

### T-222 Footprint del pixel en el raymarch
- `pixelAngle = 2*tan(fov/2)/resY` como uniform derivado; footprint = dist*pixelAngle
  disponible en la evaluación de material (plumbing WGSL).
- **Done:** visualización debug (footprint como color) coherente con la distancia.

### T-223 fbm_continuous productivo + anti-shimmer
- Versión final: `n = clamp(base + log2(k/footprint), 1, octaveCap)` + fade
  fraccional de última octave + atenuación analítica de frecuencias sub-pixel.
- **Done:** zoom 3m→5cm sin pops ni shimmer en la escena de prueba (video corto).

### T-224 Migrar 4 conceptos
- `piedra_volcanica`, `marmol_blanco_vetas`, `pared_ladrillo_viejo`, `metal_oxidado`
  → fbm_continuous. Firma WGSL de conceptos extendida con footprint (breaking interno:
  actualizar compilador + los 18 conceptos aunque solo 4 lo usen — resto passthrough).
- **Done:** 10 escenas Fase 1 sin regresión visual (screenshots diff) + fps ±10%.

### T-225 Micro-detalle de proximidad (<40cm)
- Domain perturbation extra con fade por cercanía, bajo presupuesto octaveCap.
- **Done:** pegarse a la piedra revela grano nuevo; fps en preset quest no cae >10%.

### T-226 A/B medible (SC2-2)
- Screenshots 3 distancias × {on, off} + fps registrados → `docs/papers/sonido13-ab.md`.
- **Done:** documento con evidencia, listo para el paper técnico de septiembre.

### T-227 Tests de regresión de hash por escena
- `tools/hash-scenes.ts`: hash WGSL de las 10 escenas → baseline JSON; corre en CI.
- **Done:** CI falla si un cambio de compiler altera hashes sin actualizar baseline.

## P2b — Exteriores + Chichén Itzá (T-231..T-235)

### T-231 Schema: walls/ceiling opcionales + sky + cameraSpeed
- `schema.ts`: walls/ceiling `.optional()` · `sky: {horizon: vec3, zenith: vec3}`
  opcional · `cameraSpeed: number` opcional. Tests parser (válidas/erróneas).
- **Done:** escena sin walls parsea; las 10 existentes intactas.

### T-232 Compiler: modo exterior
- Sin walls/ceiling → no se emiten SDFs de caja; suelo plano extendido; background
  gradiente horizon→zenith; fog escalado a bounds.
- **Done:** escena exterior mínima renderiza (suelo + cielo + un objeto); hashes de
  las 10 escenas room INTACTOS (test T-227 lo garantiza).

### T-233 chichen_itza.m13 — El Castillo
- 9 plataformas round_box apiladas (~30m base, proporciones reales aprox 55.3m base
  × 24m alto — escalar a bounds [60,25,60]), templo superior, 4 escalinatas, piedra
  volcánica, sol cálido bajo, fog atmosférico, spawn lejano (~50m) mirando la pirámide.
- `cameraSpeed: 8` (explanada grande).
- **Done:** carga en el demo, <50KB (debería ser ~3-4KB), caminable de lejos a tocar
  la piedra. Se agrega al selector + smoke test.

### T-234 Showcase polish + seeds
- Tras P5: seed por plataforma/bloque. Ajuste de luz/fog para el zoom dramático.
- **Done:** el recorrido lejos→pegado muestra los 3+ registros de detalle (SC2-1).

### T-235 [GATO] Video del zoom en laptop
- Ruta: OBS o grabación de pantalla, recorrido spawn→piedra, 30-60s.
- **Done:** video guardado en assets de Innovafest + linkeado en BITACORA.

## P4 — FFT audio (T-241..T-243)

### T-241 MicAudioInput → 3 bandas
- AnalyserNode fftSize 256, bandas bass/mid/treble normalizadas + smoothing.
- `getBands(): [number, number, number]` + amplitude actual intacto.
- **Done:** test unitario con buffer sintético (seno 100Hz → bass alto, resto ~0).

### T-242 Bandas al uniform + schema band
- Engine escribe audioBands per-frame (slot ya existe — T-211).
- Schema: `audio_reactive: true | {band}` + compiler mapea a componente.
- **Done:** retro-compat: escenas con `audio_reactive: true` = comportamiento actual.

### T-243 Demo audio-reactivo por banda
- 2 conceptos con reactividad distinta (graves→pulso emisión, agudos→brillo vetas)
  + escena demo o flag en chichen_itza (fuego ceremonial reactivo 🔥).
- **Done:** con música, las 3 bandas se distinguen visualmente (SC2-5, video corto).

## P5 — Seeds por instancia (T-251..T-252)

### T-251 Schema seed + compiler domain offset
- `seed: number` opcional por objeto → `p + hash3(seed)*K` solo en muestreo de material.
- Tests determinismo extendidos (mismo seed = mismo hash, distinto seed = distinto).
- **Done:** 5 esferas mismo material/seed distinto se ven hermanas no clones (SC2-6).

### T-252 Seeds en chichen_itza
- Plataformas y bloques con seeds 1..N.
- **Done:** variación natural visible en el showcase.

## Cierre (T-261..T-263)

### T-261 Gate de cierre Fase 2 — tabla SC2-1..SC2-7 con evidencia real
### T-262 Docs: CHANGELOG 0.2.0 + CLAUDE.md (fases, decisiones D-3xxx) + README
### T-263 Deploy final + smoke extendido + BITACORA de cierre

---

**Critical path:** T-211 → T-212 → T-213 → T-221(gate) → T-222..T-224 → T-231..T-233 → T-234 → T-261
**Paralelizable desde el inicio:** T-201..T-204 (PWA) ∥ T-231 (schema) ∥ T-241 (bandas)
