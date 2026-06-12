# Changelog

Todos los cambios notables de m13 se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

## [0.1.0] - 2026-06-12

**Fase 1 — lenguaje `.m13` + librería de conceptos.** Primera versión completa del motor:
de demo hardcodeado a motor que lee descriptores semánticos y los renderiza. Gate de
cierre con 6 de 7 criterios de éxito en PASS (SC-6 Quest 3 pendiente de hardware).
Detalle completo en `BITACORA_MOTOR13.md` entradas 024/025 y `docs/spec/phase-1-spec.md`.

### Añadido

- **Runtime WebGPU con SDF raymarching** (`@m13/runtime`): clase `M13Engine`, pipeline
  WebGPU puro (sin WebGL ni Three.js en el core), FlyCamera con pointer lock, audio de
  micrófono opcional. Bundle 58.64 KB gzipped (NFR-3: <100 KB).
- **Parser YAML + Zod**: escenas `.m13` validadas contra `m13SceneSchema` con tipos TS
  derivados; rechaza dimensiones degeneradas y colores/intensidades negativas.
- **Compilador `.m13` → WGSL determinista**: shader ensamblado por escena con caché por
  hash, rotación Euler XYZ en grados con matriz inversa precomputada compile-time
  (D-025-01), animaciones `rotate`/`pulse`/`bob`, fondo vía `missColor()` generada
  (D-025-02). Compile p95 = 21.67 ms para 50 objetos (límite del spec: <200 ms).
- **18 conceptos materiales y geométricos** (`@m13/synth`): de `pared_yeso_blanco` a
  `piedra_volcanica`, todos con `material_signature` + `procedural_seed` (FR-2.2) y
  `paramsSchema` con JSON Schema en el manifest.
- **Editor Next.js con LLM editor-time** (`@m13/editor`): Monaco + preview con live
  reload (debounce 250 ms), prompt en lenguaje natural → `.m13` validado. Eval suite de
  30 prompts (T-052/T-053): **100% de pass rate en 3 corridas consecutivas** (baseline
  93.3%, una iteración del system prompt; target del spec era >70%).
- **Demo público en https://motor13.neonodos.com** (Cloudflare Pages, custom domain via
  API): workspace agéntico estilo IDE con **generador paramétrico 100% local**
  (D-025-06 — cero LLM en el flujo de render; 185 escenas generadas validadas contra
  parser+compiler con 0 fallas), panel Receta con peso real en bytes, walkthrough WASD,
  modo pitch y QR.
- **Edición live-reload en el demo (SC-7)**: botón "editar" en el panel Receta →
  textarea → cambio de cualquier valor del YAML → render actualizado en ~250 ms, con
  errores de validación mostrados sin crashear. Validado: persona no-técnica edita sin
  onboarding.
- **Share links `#scene=`**: la URL es la escena — compartir un link reproduce el mundo
  3D completo. FPS visible en la statusbar.
- **Paquete `@m13/generator`**: generador paramétrico de escenas extraído a workspace
  propio — local, determinista, cero LLM (D-025-06).
- **Paquete `@m13/mcp`**: servidor MCP de m13 — cualquier LLM se vuelve front-end del
  motor. Solo editor-time, conforme a Constitution §3 (Idea 3, orden de Gato 2026-06-11).
- **Benchmark vs Three.js** (`docs/papers/phase-1-benchmark.md`): H1 validada — assets
  de escena `.m13` 2,014 B vs equivalente Three.js 62,115 B = **30.8× de reducción de
  peso** (umbral del spec: 10×). Bundle gzip 70.9 KB vs 167.5 KB (2.36×).
- **Escenas de ejemplo**: 3 escenas formales (`sala_galeria`, `cocina_industrial`,
  `oficina_neonodos`, todas <3 KB — límite del spec: 50 KB) + escenas FlowCAD de
  cocinas (lineal/isla/L/U/escuadra) con 43-73 sub-piezas.

### Corregido

- **Canvas negro por `loadScene` concurrente**: dos cargas simultáneas compartían el
  `GPUCanvasContext` y dejaban el contexto sin configurar ("context is not configured").
  Resuelto serializando `loadScene` vía promise chain + flag `loading` (commit 7ec1fc8).
- Race `dispose`/`loadScene`, leak de `GPUDevice` en cache-miss del shader,
  `cancelAnimationFrame` sin guard (auditoría profunda 2026-06-10/11: 9 hallazgos
  confirmados, 9 corregidos — reporte en `docs/audit/deep-review-2026-06-10.md`).
- Guard de errores en el render loop + handlers de `device.lost` + timeout/retry en el
  cliente LLM del editor.
- Schema del parser endurecido: rechaza dimensiones degeneradas y valores negativos.

### Verificación de la versión

- `pnpm typecheck` limpio en todos los packages · **116/116 tests verdes** ·
  determinismo del compilador intacto.
- Validación visual en GPU real: **60 FPS sostenidos (vsync-capped, 16.7 ms/frame)**
  en laptop Windows de Gato sobre motor13.neonodos.com (SC-1 PASS).
- Dato pitch-ready: un screenshot PNG de la escena pesa 462 KB; la escena `.m13` que lo
  genera pesa 769 bytes — **la captura pesa 601× más que el mundo que muestra**.
