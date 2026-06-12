# Plan — Fase 2: Sonido 13 visual

**Spec fuente:** `docs/spec/phase-2-spec.md` (aprobado por Gato 2026-06-12, OQ-1..4 resueltas)
**Series:** tasks T-2xx · decisiones D-3xxx
**Orden confirmado:** P1 PWA → P3 calidad → P2 detalle continuo (+exteriores/showcase) → P4 FFT → P5 seeds

---

## 1. Arquitectura por prioridad

### P1 — PWA (packages/examples)

Sin dependencias nuevas: service worker escrito a mano (~80 líneas) en lugar de
vite-plugin-pwa/workbox. Razón (D-3001 propuesta): cero deps, control total del cache,
Constitution-friendly (el SW solo cachea lo que ya se servía — no introduce red nueva).

- `public/manifest.webmanifest` — name/short_name, icons 192/512 (generados con sharp
  desde un SVG del logo m13, script en tools/), `display: standalone`, theme `#050807`.
- `public/sw.js` — cache-first con nombre de cache ligado a `__BUILD_HASH__` (inyectado
  por Vite `define` desde el hash del commit). Precache: index, assets del build,
  escenas `.m13`, scan.html. `skipWaiting` + mensaje al cliente → banner "nueva versión".
- `src/main.ts` — registro del SW + handler `beforeinstallprompt` → botón "Instalar"
  en la statusbar; en Quest/iOS (sin evento) → tooltip con pasos manuales.
- Riesgo R5 (cache congela deploys) cubierto por el hash + banner.

### P3 — Uniforms de calidad (packages/runtime)

**Una sola migración de uniform layout para toda la fase (D-3002 propuesta):** el
struct se amplía UNA vez con los campos de P3 *y* P4 juntos (quality + audioBands),
aunque P4 se implemente después. Evita dos pasadas por la zona de riesgo D-108
(corrupción silenciosa si WGSL/writeUniforms/UNIFORM_BYTES divergen).

```wgsl
// Uniforms v2 (delta):
quality:    vec4<f32>,  // x=maxSteps, y=shadowSteps, z=aoSamples, w=octaveCap
audioBands: vec4<f32>,  // x=bass, y=mid, z=treble, w=amplitude (compat)
```

- `raymarch.ts`: las constantes hardcodeadas (auditoría 06-10) leen de `uniforms.quality`.
  Loops WGSL con bound dinámico: `for (var i = 0; i < i32(u.quality.x); i++)`.
- `renderer/index.ts`: `writeUniforms` + `UNIFORM_BYTES` actualizados en el MISMO
  commit + test de layout (tamaño del struct WGSL parseado vs constante TS).
- `engine.setQuality(preset | Partial<Quality>)` — presets `quest|mobile|desktop|ultra`.
  Auto-detección absorbe D-2110/D-2112 (renderScale entra al preset; el cap de dpr
  en examples se simplifica a `engine`-driven).
- examples: selector en Ajustes + `?quality=` (el `?dpr=` existente se mantiene como
  override fino).

### P2 — Detalle continuo (packages/synth + runtime/shaders)

El corazón. Secuencia anti-riesgo R1 (la tesis puede no ser perceptible):

1. **Prototipo gate (T-221):** `fbm_continuous` sobre UN concepto en una page A/B.
   Gato lo ve ANTES de migrar nada. Si no convence → pivote documentado, la fase
   sigue valiendo por P1/P3/P4/P5.
2. Footprint del pixel en el shader: `footprint = dist * pixelAngle` donde
   `pixelAngle = 2*tan(fov/2)/resY` (ya hay dist por step del raymarch — gratis).
3. `fbm_continuous(p, footprint, base, cap)`: octaves efectivas
   `n = clamp(base + log2(k/footprint), 1.0, cap)` — la parte fraccional de `n`
   atenúa la última octave (smoothstep) → **transición microtonal, cero pops**.
   `cap` viene de `quality.w` (P3 ya instalado — por eso P3 va antes).
4. Anti-shimmer: las octaves cuya longitud de onda < footprint se desvanecen
   analíticamente (no se muestrean).
5. Migración de 4 conceptos: `piedra_volcanica` (primero — es el del showcase),
   `marmol_blanco_vetas`, `pared_ladrillo_viejo`, `metal_oxidado`.
6. Micro-detalle <40cm: capa extra de domain perturbation con fade por proximidad,
   presupuestada bajo `octaveCap`.

### P2b — Escenas exteriores + showcase Chichén Itzá (parser + compiler + escena)

Requisito directo de la orden de Gato ("campo abierto, no habitación, mucho más grande").

- Schema: `walls`/`ceiling` → `.optional()` (schema.ts:119-121). `floor` se mantiene
  obligatorio (siempre hay suelo). Campo nuevo opcional `sky: { horizon, zenith }`
  (colores) y `cameraSpeed: number` (caminar una explanada de 60m a 2.5 m/s desespera).
- Compiler: sin walls/ceiling no se emiten sus SDFs; el suelo se extiende (plano
  infinito ya soportado por el SDF de plano); background usa gradiente horizon→zenith
  en lugar de color plano; fog de distancia escalado a bounds.
- Retro-compat (NFR-2.6): escenas con walls/ceiling presentes = idénticas. Tests de
  regresión de hash sobre las 10 escenas existentes.
- `chichen_itza.m13`: El Castillo — 9 plataformas escalonadas (round_box apilados),
  templo superior, 4 escalinatas (box inclinados o escalones), `piedra_volcanica`
  con seeds distintos por bloque (P5 lo enriquece después), bounds ~[60, 25, 60],
  sol cálido bajo, fog atmosférico. Spawn lejano para la narrativa zoom-in.
- Velocidad cámara: `FlyCamera` lee `cameraSpeed` de la escena vía engine.

### P4 — FFT (packages/runtime/audio)

- `MicAudioInput`: `AnalyserNode` (fftSize 256) → 3 bandas promediadas y normalizadas
  (bass <250Hz, mid 250-2k, treble >2k) con smoothing temporal. API: `getBands()`.
- El uniform `audioBands` ya existe desde P3 (D-3002) — solo se escribe per-frame.
- Schema: `audio_reactive: true | { band: 'bass'|'mid'|'treble' }` (true = amplitude,
  retro-compat). Compiler mapea band → componente del vec4.
- 2 conceptos demo con reactividad por banda + escena demo con música.

### P5 — Seeds por instancia (parser + compiler)

- Schema: `seed: number` opcional por objeto.
- Compiler: el seed se convierte en offset de dominio `p + hash3(seed)*K` aplicado al
  muestreo del material de ESE objeto (no toca la geometría — solo variación visual).
- Determinismo: seed es input del hash WGSL → tests T-012 extendidos.
- Aplicación inmediata: bloques de Chichén Itzá con seeds 1..N.

---

## 2. Grafo de dependencias

```
P1 PWA ──────────────────────────────── independiente (arranca ya)
P3 quality struct (T-211, layout v2) ──┬─→ P3 presets/API ─→ retest Quest (SC-6/NFR-7)
                                       └─→ P2 fbm_continuous (usa octaveCap)
                                       └─→ P4 escritura audioBands (layout ya listo)
P2 prototipo gate (T-221) ─→ GATE GATO ─→ migración 4 conceptos ─→ micro-detalle
P2b schema exteriores ─→ compiler exterior ─→ chichen_itza.m13 ─→ showcase polish
                                              ↑ P5 seeds enriquece los bloques
SC2: video zoom laptop (Gato) al final de P2+P2b
```

Paralelizable: P1 completo ∥ P3 ∥ P2b-schema. El gate de T-221 es el único stop humano.

## 3. Validación

- Cada task: typecheck + tests + `pnpm dev` sin errores consola (reglas de oro).
- Layout v2: test automático de tamaño de struct (nuevo, T-211).
- Regresión: hashes WGSL de las 10 escenas Fase 1 antes/después de cada cambio de
  compiler (script nuevo `tools/hash-scenes.ts`, corre en CI).
- Quest: preset `quest` → reporte FPS de Gato (cierra SC-6/NFR-7 heredados).
- Smoke test producción extendido con chichen_itza + manifest + sw (SC2-7).

## 4. Estimación gruesa

P1 ~1 día · P3 ~1.5 días · P2 ~3-4 días (incluye gate) · P2b ~2 días · P4 ~1 día ·
P5 ~0.5 día · cierre ~0.5 día → **~10 días de trabajo efectivo** dentro de junio. Holgura
del roadmap: julio arranca Fase 5; el buffer es real.
