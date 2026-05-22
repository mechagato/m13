# m13 · Phase 1 — Plan

**Phase:** 1 of N
**Codename:** lenguaje `.m13` + librería de conceptos
**Status:** Drafted · Pending owner approval before tasks generation
**Spec source:** [`docs/spec/phase-1-spec.md`](../spec/phase-1-spec.md)
**Authored:** 2026-05-21
**Author:** Claude Opus 4.7 (xhigh) bajo dirección de Gato

---

## 0. TL;DR

El bootstrap entregó un **esqueleto sólido del runtime** (parser, compiler, renderer WebGPU, fly camera, audio mic, 8 conceptos materiales, 4 escenas demo). Lo que falta para cerrar Fase 1 se agrupa en **8 deliverables (D-1 a D-8)**, **24 componentes técnicos**, ~5 semanas a 15-20 h/sem. El componente **más caro** es el editor Next.js + LLM (XL, ~30% del esfuerzo). El componente **más bloqueante** es la spec formal `m13-spec/v0.1.md` (S, pero todo lo demás depende de fijarla).

---

## 1. Audit del bootstrap (qué YA está vs. qué FALTA)

### 1.1 ✅ Implementado en el bootstrap

| Componente | Estado | LOC |
|---|---|---|
| `@m13/runtime` parser YAML + Zod schema | ✅ funcional | 138 |
| `@m13/runtime` compiler M13Scene → WGSL (map+material+concept asm) | ✅ funcional | 169 |
| `@m13/runtime` renderer WebGPU (pipeline + UNIFORM_BYTES=160 + bind group) | ✅ funcional | 156 |
| `@m13/runtime` FlyCamera con pointer lock + bounds | ✅ funcional | 159 |
| `@m13/runtime` MicAudioInput (opcional) | ✅ funcional | 65 |
| `@m13/runtime` shaders WGSL: SDF prims + noise/FBM + raymarch + AO + soft shadows | ✅ funcional | 209 |
| `@m13/runtime` M13Engine class (API pública) | ✅ funcional | 191 |
| `@m13/synth` 8 conceptos materiales | ✅ funcional | ~120 |
| `@m13/examples` Vite app con 4 escenas demo (sala, galería, loft, templo) | ✅ funcional | 210+CSS |
| Monorepo pnpm + tsconfig estricto + commit inicial | ✅ | — |
| Typecheck baseline limpio (post-fix T-000) | ✅ | — |

### 1.2 ❌ Falta para cerrar Fase 1 (lo que este plan resuelve)

| Gap | Spec ref | Categoría |
|---|---|---|
| Spec formal del formato `.m13 v0.1` (`m13-spec/v0.1.md`) | FR-1.6 | docs |
| JSON Schema generado desde Zod | FR-1.4 | runtime |
| Validación con warnings (no error) para campos desconocidos | FR-1.5 | runtime |
| Versionado del formato + ejemplos/contraejemplos | FR-1.6 | docs |
| 6 conceptos materiales faltantes (10 mínimo) | FR-2 | synth |
| 4 conceptos geométricos (pedestal, lámpara, esfera, cubo) | FR-2 | synth |
| Manifiesto JSON por concepto (params editables documentados) | FR-2.1, FR-2.2 | synth |
| Tests unitarios parser + compiler (>70% coverage) | NFR-6 | runtime |
| Benchmark: tiempo de compilación <200ms para 50 objetos | FR-3.4, H1.3 | runtime |
| Determinismo del compiler (mismo input → mismo bytes) | FR-3.3 | runtime |
| Caché de shaders por hash de input | R1 mitigación | runtime |
| Editor Next.js 14 + Tailwind + Monaco + WebGPU preview | FR-4.1, FR-4.2 | editor |
| Editor live reload <500ms | FR-4.3 | editor |
| Editor panel "lenguaje natural → .m13" (LLM editor-time) | FR-4.4 | editor |
| Editor export bundle .zip | FR-4.5 | editor |
| 3 escenas formales del spec (sala_galeria, cocina_industrial, oficina_neonodos) | §4.5 | examples |
| Reemplazo o renaming de 4 escenas bootstrap | — | examples |
| Bundle runtime <100KB minified+gzipped | NFR-3 | runtime |
| Benchmark report vs Unity WebGL | §7-6, deliverable | docs |
| Suite de 30 prompts para validar LLM editor (>70% éxito) | §8 criterio | docs+editor |
| Demo público con QR (Cloudflare Pages o Vercel) | §7-7 | infra |
| Test Quest 3 (Horizon OS v62+) | §7 implícito, NFR-7 | infra |
| Spec Fase 2 drafted | §7-9 | docs |

---

## 2. Decisiones del plan (resuelven OQs del spec)

| ID | Decisión | OQ resuelto |
|---|---|---|
| **D-101** | Conceptos materiales **parametrizables** con defaults sensatos. Cada concepto declara `paramsSchema: z.ZodObject` y el shader ramifica con uniforms inyectados por concepto (vía push-constants emulado con un `MAT_PARAMS` buffer separado de tamaño fijo, ej. 16 floats por concepto). | OQ-1 |
| **D-102** | **NO** se permite `extends` ni composición de conceptos en `.m13 v0.1`. Si una escena necesita "variante" se hace clonando el concepto + renombrando. Reabrir en v0.2 si surge demanda real. | OQ-2 |
| **D-103** | LLM editor-time corre **client-side por default** (usuario trae su API key, guardada solo en localStorage) **+ server-side opcional** detrás de `/api/llm` en Next.js (proxy con rate limit). Configurable vía env var `M13_EDITOR_LLM_MODE=client \| server \| both`. | OQ-3 |
| **D-104** | Telemetría **anónima, opt-out** en el editor. Eventos: scene_loaded, scene_compiled, llm_prompt_submitted, llm_prompt_accepted, error. Sin payload de YAML del usuario. Endpoint: Supabase tabla `m13_editor_telemetry` (instancia NeoNodos compartida). | OQ-4 |
| **D-105** | **Vite** (no esbuild puro) como build tool del runtime — D-002 ya lo fija para examples; lo extendemos para editor y bundles de producción. | OQ del bitácora 001 |
| **D-106** | **Monorepo único** (pnpm workspaces) — ya es D-001 oficial. El editor entra como `packages/editor/`. | OQ del bitácora 001 |
| **D-107** | **Repo privado en GitHub hasta Fase 3** (decisión §8.4 del Constitution honrada). Demo público es estático, no hace falta abrir el código. | OQ del bitácora 001 |
| **D-108** | El **bootstrap actual del compilador es la base** — no rehacer parser/compiler/renderer. Solo extender. Cualquier cambio al UNIFORM_BYTES o struct Uniforms requiere actualización sincronizada en `shaders/common.ts` + `renderer/index.ts` (regla del CLAUDE.md). | — |
| **D-109** | Tests con **Vitest** (no Jest, no node:test). Coverage con `@vitest/coverage-v8`. Solo parser y compiler en Fase 1 — renderer/shaders se validan visualmente. | NFR-6 |
| **D-110** | Despliegue del editor en **Cloudflare Pages** (alinea con stack NeoNodos). Subdomain provisional: `m13.neonodos.com` con worker para `/api/llm`. | — |

---

## 3. Decision gate del spec §12 — revisado

| Item del gate | Estado actual | Acción |
|---|---|---|
| Demo Fase 0 corre >60fps en hardware del owner | ⚠️ Por verificar en vivo por Gato | Recomendación: dar por **válido provisional** porque el bootstrap incluye 4 escenas que reemplazan al demo Fase 0. Si Gato detecta FPS bajo en su sesión, registra blocker. |
| Dirección estética del Fase 0 se siente "viable" | ⚠️ Por verificar | Idem — validación visual diferida. Si no convence, R5 (calidad procedural) se materializa y mete riesgo de fase. |
| Owner confirma stack: Next.js 14 + Vite + Vitest + Monaco | ✅ Asumido por este plan (D-109 + bootstrap) | Confirmar con Gato al aprobar el plan. |
| Repo motor-13 creado en GitHub | ⚠️ Pendiente | git init **local hecho** (commit `a34095e`). Decidir si crear `mechagato/motor-13` o si vive como subcarpeta de `mechagato/neonodos`. |
| Plan Fase 1 generado | ✅ Este documento | — |

**Veredicto:** los 5 items se dan **provisionalmente válidos** para arrancar el detalle de tasks. Bloqueadores reales solo: (a) si Gato corre el demo y los FPS no llegan a 60, (b) si la estética no convence.

---

## 4. Desglose técnico por deliverable

> Convención: cada deliverable se descompone en **componentes técnicos** con id `C-XXX`, complejidad **S/M/L/XL**, archivos afectados, criterio de validación y dependencias.

### D-1 — Especificación formal `.m13 v0.1`

**Output:** `m13-spec/v0.1.md` (raíz del repo, nueva carpeta).

| Id | Componente | Compl | Archivos | Criterio de done | Depende de |
|---|---|---|---|---|---|
| C-101 | Documento spec del formato | S | `m13-spec/v0.1.md` | Cubre 100% del schema actual + extension policy + 3 ejemplos pos + 3 contraejemplos | — |
| C-102 | JSON Schema autogenerado desde Zod | S | `tools/gen-json-schema.ts` (nuevo) + output `m13-spec/v0.1.schema.json` | `pnpm gen:schema` produce JSON Schema válido (draft-07). Diff cero contra el Zod schema. | C-101 |
| C-103 | Política de campos desconocidos: warning en parser, no error | S | `packages/runtime/src/parser/index.ts` | Test: campo extra en YAML emite `console.warn` con path y key; parser sigue sin lanzar | C-101 |
| C-104 | Versionado: validar `version: "0.1"` y rechazar otras versiones con error claro | S | `packages/runtime/src/parser/schema.ts` + `index.ts` | Test: version "0.2" → error con texto `m13 v0.2 no soportado por este runtime` | C-101 |

**Criterio de validación del deliverable:** un dev externo lee `m13-spec/v0.1.md` y puede escribir un `.m13` válido sin abrir el código del runtime. Adicionalmente, el JSON Schema valida correctamente las 7 escenas (4 actuales + 3 nuevas) por CI.

---

### D-2 — Runtime extension + tests

**Output:** mejoras al `@m13/runtime` para llegar a calidad de producción.

| Id | Componente | Compl | Archivos | Criterio de done | Depende de |
|---|---|---|---|---|---|
| C-201 | Setup Vitest + coverage v8 a nivel monorepo | S | `package.json` root + `packages/runtime/package.json` + `vitest.config.ts` | `pnpm test` corre; `pnpm test:coverage` genera reporte | — |
| C-202 | Tests parser: válidos, defaults aplicados, errores claros con path | M | `packages/runtime/src/parser/__tests__/parser.test.ts` | Coverage parser >85%; 12+ tests | C-201, C-103, C-104 |
| C-203 | Tests compiler: determinismo (hash idéntico en 2 corridas), conceptos válidos, errores claros | M | `packages/runtime/src/compiler/__tests__/compiler.test.ts` | Coverage compiler >70%; test de determinismo: 100 ejecuciones, mismo SHA-256 del WGSL output | C-201 |
| C-204 | Determinismo formal del compiler: ordenar `conceptsUsed`, fijar precisión de floats en codegen | M | `packages/runtime/src/compiler/index.ts` | Test C-203 pasa; documentar en spec D-1 que el output es estable | — |
| C-205 | Caché de shaders por hash SHA-256 del WGSL | M | `packages/runtime/src/engine.ts` + `compiler/index.ts` | Re-cargar misma escena → no se rebuildea el pipeline (verificable con `console.time`) | C-204 |
| C-206 | Benchmark compile-time: 50 objetos en <200ms en laptop mid-range | M | `tools/bench-compile.ts` + reporte | Script imprime tiempo medio de 10 corridas; <200ms en hardware de Cerebro4 | C-204 |
| C-207 | Bundle size del runtime <100KB min+gzip | M | `packages/runtime/vite.config.ts` (nueva config para build standalone) + `packages/runtime/package.json` build script ESM | `pnpm --filter @m13/runtime build` produce `dist/m13-runtime.js`; size-limit script reporta <100KB gzipped | — |
| C-208 | Soporte para parámetros de concepto en `.m13` y propagación a shader | L | `parser/schema.ts` (params validados por schema del concepto) + `compiler/index.ts` (genera uniforms inyectados) + `renderer/index.ts` (segundo buffer MAT_PARAMS) + `synth` API (cada concepto exporta `paramsSchema`) | Test: una escena con `material: { concept: 'metal_dorado_pulido', params: { roughness: 0.8 } }` cambia visualmente y compila | D-101 |

**Criterio de validación del deliverable:** `pnpm test` verde, coverage >70% en parser+compiler combinados, benchmark imprime <200ms para 50 objetos, bundle runtime ≤100KB gzipped.

---

### D-3 — Librería `@m13/synth` extendida (14 conceptos totales)

**Output:** 14 conceptos en `packages/synth/src/concepts/`. Cada uno con módulo TS + manifiesto JSON inline + paramsSchema Zod (D-101).

#### 3.A Materiales faltantes (6 nuevos para llegar a 10)

| Id | Componente | Compl | Criterio de done |
|---|---|---|---|
| C-301 | `pared_concreto_pulido` (wall) | S | WGSL renderiza, manifiesto + paramsSchema, ejemplo visual en escena |
| C-302 | `pared_madera_oscura` (wall) | S | idem |
| C-303 | `piso_marmol_blanco` (floor) | S | idem (mármol existe como universal, este es variante floor optimizada) |
| C-304 | `metal_oxidado` (object) | S | idem |
| C-305 | `metal_bronce_pulido` (object) | S | idem |
| C-306 | `vidrio_esmerilado` (object) | M | Requiere alpha-blending en shader. **Decisión técnica:** en Fase 1 lo emulamos con noise alto + brillor especular alto, sin transmisión real. Documentar limitación. |

#### 3.B Conceptos geométricos (4 nuevos)

Estos son **geometría + material combinados** — declaran un SDF de figura + el material aplicado. El compiler debe soportar este nuevo tipo.

| Id | Componente | Compl | Criterio de done |
|---|---|---|---|
| C-307 | `pedestal_marmol` — round_box parametrizable + mármol | S | Se referencia desde `.m13` con `kind: concept` y `concept: pedestal_marmol`. Renderiza. |
| C-308 | `lampara_colgante` — cilindro suspendido + emisión | M | Incluye fuente de luz adicional emisiva. Requiere extender struct Uniforms con 2da luz O usar emissive shader inline. Decisión: **emissive inline** (más simple, menos cambios). |
| C-309 | `esfera_decorativa` — sphere parametrizable + material configurable | S | idem |
| C-310 | `cubo_basico` — box parametrizable | S | idem |

#### 3.C Infraestructura del registry

| Id | Componente | Compl | Criterio de done |
|---|---|---|---|
| C-311 | Extensión del `Concept` interface con `paramsSchema`, `category` expandido (`'object_geo'` para 3.B), `defaults` | S | Type + index.ts actualizado; existing concepts añaden `paramsSchema: z.object({})` (vacío) sin romper compat |
| C-312 | Compiler soporta `kind: concept` en object (delegando SDF al concept) | M | Test: escena con `kind: concept`/`concept: pedestal_marmol` compila y renderiza |
| C-313 | Manifiestos JSON exportables por concepto (para editor browse) | S | Cada concept exporta `manifest()` que retorna `{id, category, description, defaults, paramsSchema: jsonSchema}`. Editor lo consume. |

**Criterio de validación del deliverable:** 14 conceptos listables vía `listConcepts()`, cada uno renderiza al menos en una escena de prueba, parámetros pasados desde `.m13` se reflejan visualmente.

---

### D-4 — Editor web minimal (`packages/editor/`)

**Output:** Next.js 14 app en `packages/editor/` desplegable a Cloudflare Pages como `m13.neonodos.com`.

| Id | Componente | Compl | Archivos | Criterio de done | Depende de |
|---|---|---|---|---|---|
| C-401 | Scaffold Next.js 14 + Tailwind + ESLint + tsconfig consistente | M | `packages/editor/` (estructura completa) | `pnpm --filter @m13/editor dev` arranca en :3000 | — |
| C-402 | Layout split: Monaco YAML izquierda + WebGPU canvas derecha + panel errores abajo | M | `app/page.tsx`, `components/MonacoYaml.tsx`, `components/Preview.tsx`, `components/ErrorPanel.tsx` | Las 3 zonas visibles y redimensionables (resizer drag) | C-401 |
| C-403 | Integración M13Engine: re-load on YAML change con debounce 250ms | M | `components/Preview.tsx` (usa `@m13/runtime` directo via workspace link) | Cambio en YAML re-renderiza en <500ms | C-205, D-2 |
| C-404 | Validación inline: errores Zod del parser se renderizan en `ErrorPanel` + Monaco markers (línea/columna) | M | `lib/yaml-marker-bridge.ts` (parser custom para mapear path Zod a línea Monaco) | Test: YAML inválido marca línea correcta en Monaco con tooltip del error | C-203 |
| C-405 | Panel "Natural language → .m13": input texto, botón Generate, replace o insert | L | `components/NLPrompt.tsx` + `lib/llm-client.ts` (cliente con switch client/server) | Prompt "Quiero una cocina industrial con paredes de ladrillo" produce `.m13` válido en >70% de runs | D-103, D-5 |
| C-406 | Cliente LLM client-side: API key en localStorage + Anthropic SDK browser-safe | M | `lib/llm-client.ts` modo `client` | Funciona offline para preview de YAML, requiere API key para Generate | C-405 |
| C-407 | Cliente LLM server-side: `/api/llm` route con rate limit (10/min/IP) + key del server | M | `app/api/llm/route.ts` + variables de entorno | Funciona sin API key del usuario, modo `server` o `both` | C-405 |
| C-408 | Sistema de prompts del LLM: prompt maestro + few-shot examples + JSON Schema en contexto | L | `lib/llm-system-prompt.ts` (incluye `m13-spec/v0.1.schema.json` como contexto) | Output del LLM valida contra el schema en >70% de la suite de 30 prompts | C-405, C-102 |
| C-409 | Botón "Export bundle": .zip con `.m13` + WGSL precompilado + HTML standalone runner | M | `lib/export-bundle.ts` (usa `jszip`) | Click Export → descarga `.zip` que abierto en otro tab renderiza la escena sin servidor | D-2 |
| C-410 | Telemetría anónima opt-out (5 eventos definidos en D-104) | S | `lib/telemetry.ts` + toggle en settings | Evento se envía a Supabase si toggle ON; OFF por default después de banner inicial | D-104 |
| C-411 | Auth básico (opcional Fase 1): editor accesible público con rate limit, sin login | S | — | Decisión D-110: sin auth en v0.1, rate limit por IP en route /api/llm | C-407 |

**Criterio de validación del deliverable:** una persona no-técnica abre `m13.neonodos.com`, escribe en lenguaje natural lo que quiere, ve la escena 3D rendereando en vivo, descarga el bundle. Tiempo total <2 min. Suite de 30 prompts del editor LLM tiene >70% de validez sintáctica + visual.

---

### D-5 — Escenas de ejemplo formales (3 escenas del spec)

**Output:** 3 escenas en `packages/examples/public/scenes/` con los nombres que pide el spec §4.5.

| Id | Componente | Compl | Archivos | Criterio de done |
|---|---|---|---|---|
| C-501 | `sala_galeria.m13` — galería de arte minimalista | S | nuevo `.m13` | Pesa <30KB, renderiza >60fps en Cerebro4. Aprovecha conceptos pared_yeso_blanco + piso_marmol_blanco + esfera_decorativa |
| C-502 | `cocina_industrial.m13` — cocina estilo loft | S | nuevo `.m13` | Pesa <30KB, >60fps. Usa pared_ladrillo_viejo + piso_concreto_industrial + lampara_colgante + metal_bronce_pulido |
| C-503 | `oficina_neonodos.m13` — oficina look NeoNodos (terracota/dorado/madera) | M | nuevo `.m13` + nueva paleta override en ambient.tint | Pesa <30KB, >60fps. Identidad NeoNodos clara |
| C-504 | Reconciliación: decidir destino de las 4 escenas bootstrap (sala/galeria/loft/templo) | S | `packages/examples/src/main.ts` + mover .m13 | Decisión: **mantener templo_mexica** como showcase del audio reactivo + identidad mexicana; **sala_basica, galeria_minimal, loft_industrial** son reemplazadas por las 3 nuevas. Total: 4 escenas en el carrusel del demo. |

**Criterio de validación del deliverable:** las 3 escenas del spec abren a >60fps en laptop mid-range (Cerebro4), pesan <30KB cada una, demuestran que los 14 conceptos cubren el "80% de materiales residenciales/comerciales" (sub-hipótesis H1.2).

---

### D-6 — Benchmark vs Unity WebGL

**Output:** `docs/papers/phase-1-benchmark.md` con números crudos + análisis.

| Id | Componente | Compl | Criterio de done |
|---|---|---|---|
| C-601 | Crear escena Unity WebGL equivalente a `sala_galeria.m13` | L | Build Unity WebGL exportado, hospedado estático |
| C-602 | Medir: tamaño de assets, tiempo de carga inicial, FPS sostenido, peso del bundle JS+WASM, memoria peak | M | Tabla en el reporte con 5 columnas × 2 motores |
| C-603 | Análisis: ratio de compresión semántica (objetivo H1: >10×) | S | Sección "Conclusiones" con %, gráficos, interpretación |

> **Riesgo R6 nuevo:** este deliverable requiere Unity instalado o un build pre-hecho. Si Gato no quiere invertir en Unity ahora, **C-601 es opcional** y se reemplaza por benchmark vs Three.js (más rápido de armar y suficiente para validar H1).

**Criterio de validación:** PDF/MD publicado con números reproducibles, conclusión clara sobre H1.

---

### D-7 — Demo público

**Output:** sitio estático con las 4 escenas activas + QR para acceso móvil.

| Id | Componente | Compl | Criterio de done |
|---|---|---|---|
| C-701 | `packages/examples` con build de producción optimizado | S | `pnpm build` produce `dist/` <500KB total |
| C-702 | Deploy a Cloudflare Pages bajo subdominio (decidir: `m13-demo.neonodos.com` o `motor13.neonodos.com`) | S | URL accesible públicamente |
| C-703 | QR generado apuntando al demo, embebido en página principal y en docs públicas | S | QR es escaneable, abre el demo en mobile, funciona en Chrome Android |
| C-704 | Test en Quest 3: una persona se conecta vía Tailscale o WAN, abre el demo en el browser del Quest, valida renderizado | M | Captura de pantalla del Quest renderizando ≥72fps en sala_galeria (NFR-7) |

**Criterio de validación:** owner abre el QR desde el celular y el Quest, ambos renderizan correctamente y a FPS objetivo.

---

### D-8 — Documentación + Spec Fase 2

**Output:** BITACORA actualizada, README del runtime/synth (inglés), spec Fase 2 drafted.

| Id | Componente | Compl | Criterio de done |
|---|---|---|---|
| C-801 | `BITACORA_MOTOR13.md` con entradas por sesión de implementación (formato del template existente) | S | Cada task implementada agrega su entrada con decisiones D-XXX | 
| C-802 | `packages/runtime/README.md` API reference en inglés (entry-point, M13Engine API, conceptos clave) | S | Cubre M13Engine, parseScene, compileScene, FlyCamera, MicAudioInput |
| C-803 | `packages/synth/README.md` cómo crear un concepto nuevo (workflow) | S | Tutorial: nuevo concepto en <30 min siguiendo los pasos |
| C-804 | `packages/editor/README.md` cómo correr el editor + configurar LLM | S | Setup local + deploy CF Pages |
| C-805 | `docs/spec/phase-2-spec.md` drafted: detalle continuo Sonido 13 (foveation+subdivisión microtonal de detalle) | M | Spec sigue el template del spec Fase 1, con hipótesis verificables y deliverables |
| C-806 | Spec Kit alignment: agregar plan al CLAUDE.md como referencia, actualizar tabla de estado de fases | S | CLAUDE.md fase 1 marcada con link al plan |

---

## 5. Mapa de dependencias entre componentes

```
                                    ┌───────────────────────────────────┐
                                    │  D-1 spec formal (C-101)          │
                                    │  bloquea a casi todo               │
                                    └────────┬──────────────────────────┘
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                       JSON Schema     warnings field     versioning
                       C-102            C-103              C-104
                              │              │              │
                              └──────────────┼──────────────┘
                                             ▼
                              ┌──────────────────────────────────┐
                              │  D-2 runtime tests + extension    │
                              │  C-201..C-208                     │
                              └────┬─────────────────────────────┘
                                   │
                  ┌────────────────┼─────────────────┐
                  ▼                ▼                 ▼
              C-208 params      D-3 synth         C-205 caché
              (uniforms)        14 conceptos      shaders
                  │                │
                  └────────┬───────┘
                           ▼
                  ┌──────────────────┐
                  │  D-5 3 escenas    │
                  │  C-501..C-504     │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │  D-4 editor       │ ← requiere D-2 y D-3 funcionales
                  │  C-401..C-411     │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │  D-7 demo público │ ← requiere D-5 + opcionalmente D-4
                  │  C-701..C-704     │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │  D-6 benchmark    │ ← requiere D-5 + D-7
                  │  D-8 docs/spec2   │ ← cierra la fase
                  └──────────────────┘
```

**Camino crítico (longitud ~38 días-Claude):**
`C-101 → C-102 → C-203/204 → C-208 → C-302..C-310 → C-501..C-504 → C-403/405/408 → C-701..C-704 → C-805`

**Componentes paralelizables sin shared state** (apto para `subagent-driven-development`):
- C-301..C-310 (10 conceptos) — cada uno es un archivo .ts independiente
- C-501..C-503 (3 escenas YAML) — independientes
- C-802..C-805 (docs) — independientes una vez D-2..D-7 estables

---

## 6. Estimación de complejidad agregada

| Deliverable | Componentes | Carga (h-Claude estimadas) | Compl total |
|---|---|---|---|
| D-1 spec formal | 4 (C-101..C-104) | 8-12 h | M |
| D-2 runtime ext + tests | 8 (C-201..C-208) | 20-28 h | L |
| D-3 synth 14 conceptos | 13 (C-301..C-313) | 16-22 h | L |
| D-4 editor Next.js + LLM | 11 (C-401..C-411) | 32-44 h | **XL** |
| D-5 3 escenas | 4 (C-501..C-504) | 4-6 h | S |
| D-6 benchmark | 3 (C-601..C-603) | 8-12 h | M |
| D-7 demo público | 4 (C-701..C-704) | 6-10 h | M |
| D-8 docs + spec Fase 2 | 6 (C-801..C-806) | 10-14 h | M |
| **TOTAL** | **53 componentes** | **104-148 h** | — |

Spec estimaba ~75-100 h (15-20 h/sem × 5 sem). Plan llega a 104-148 h. **Holgura recomendada: 6 semanas en lugar de 5**, o reducir scope (ver §9).

---

## 7. Riesgos y mitigaciones

| Id | Riesgo | Severidad | Probabilidad | Mitigación |
|---|---|---|---|---|
| R1 (spec) | Latencia compilación WGSL rompe live reload | Alta | Media | C-205 caché por hash + Vite cache warm + workerización del compiler en C-403 |
| R2 (spec) | Explosión de variantes shader | Media | Baja | Shader uber con branches (ya es la arquitectura del compiler actual) |
| R3 (spec) | WebGPU inestable en mobile/Quest | Alta | Media | Probar Quest 3 al final (C-704). Si falla, documentar y dejar fallback como Fase 5. |
| R4 (spec) | Rate limits Claude API en editor | Media | Media | C-407 con rate limit + caché por prompt hash |
| R5 (spec) | Calidad visual "demo-90s" sin neural | Alta | Media | Curar conceptos cuidadosamente, evitar materiales transparentes/translúcidos en F1. Evaluar tras D-5. |
| **R6 nuevo** | Unity setup para benchmark consume tiempo desproporcionado | Media | Alta | Plan B: benchmark vs Three.js (más rápido, suficiente para validar H1 ratio >10×) |
| **R7 nuevo** | TS 5.9+ rompe assumptions del bootstrap (ya vimos 2 errores) | Baja | Media | Resuelto en T-000 (typecheck limpio). Monitorear si pnpm trae versión más nueva. |
| **R8 nuevo** | Editor LLM con prompt malo produce YAML inválido en >30% (falla H5) | Alta | Media | Iteración del prompt sistema + few-shot + JSON Schema en contexto (C-408). Suite de 30 prompts mide en cada cambio. |
| **R9 nuevo** | Editor con auth ausente expone proxy LLM a abuso | Media | Baja | Rate limit por IP en route /api/llm + monitoring de costos en Supabase + flag para desactivar modo `server` rápido |
| **R10 nuevo** | Scope del editor (D-4) consume 35% del esfuerzo total — si se atrasa, atrasa toda la fase | Alta | Alta | Plan B: editor minimal-minimal sin export bundle ni telemetría (sacar C-409 y C-410 a Fase 1.5). Reduce 6-10h. |

---

## 8. Criterios globales de validación (success criteria del spec §8 mapeados a este plan)

| Criterio spec §8 | Componente que lo valida | Cómo se mide |
|---|---|---|
| 3 escenas >60fps en mid-range | C-501..C-503 + D-7 | onFrame stats del engine, screenshots con FPS counter |
| Escenas <50KB | C-501..C-503 | `wc -c` sobre .m13; CI lo verifica |
| Editor live reload <500ms | C-403 + C-205 | console.time entre keystroke y frame nuevo; promedio de 50 ediciones |
| LLM válido >70% en 30 prompts | C-408 + suite | Script automatizado de tests, output % en CI |
| Bundle runtime <100KB gzipped | C-207 | `size-limit` en CI |
| Quest 3 >72fps | C-704 | screenshot con stats |
| Compilación <200ms / 50 obj | C-206 | bench-compile.ts |
| Reducción de peso >10× vs Unity | C-602 | tabla del benchmark report |
| Persona no-técnica edita y ve resultado | C-405 + C-411 | user test interno con Gato no-técnico (rol cliente) |

---

## 9. Scope-cutting options (si la fase amenaza el deadline)

Lista priorizada de qué sacar **sin romper la integridad de la fase**:

1. **C-409 Export bundle** (M) → mover a Fase 1.5. El editor funciona sin esto.
2. **C-410 Telemetría** (S) → mover a Fase 1.5. No bloquea nada.
3. **D-6 Benchmark Unity** → reemplazar por benchmark vs Three.js (más rápido, suficiente para validar H1).
4. **C-411 Editor sin auth** ya es default. Si abre puerta de abuso → desactivar modo `server` y dejar solo client-side BYOK.
5. **C-704 Test Quest 3** → opcional si Gato no tiene el Quest disponible esta fase. NFR-7 se valida en Fase 5.
6. **Reducir conceptos a 10 totales** (cortar geo: dejar solo `pedestal_marmol` y `lampara_colgante`, sacar `esfera_decorativa` y `cubo_basico` que son triviales en `kind` directo).

**NO se puede recortar:** D-1 (sin spec no hay nada), D-2 tests (calidad mínima), D-3 mat faltantes (sin ellos no hay escenas), D-4 editor mínimo (es la cara de la fase), D-5 escenas (deliverable público), D-7 demo (sin demo no hay validación).

---

## 10. Decisiones nuevas registradas en este plan

| Id | Decisión | Razón |
|---|---|---|
| **D-100** | Bootstrap se asume estable post-T-000 (typecheck limpio) — no rehacer parser/compiler/renderer | Ahorra ~20h; arquitectura ya válida |
| **D-101** | Conceptos parametrizables vía paramsSchema + uniforms inyectados | Spec OQ-1; balance entre simplicidad y flexibilidad |
| **D-102** | NO extends en `.m13 v0.1` | Spec OQ-2; KISS |
| **D-103** | LLM editor client+server configurable | Spec OQ-3; cobertura amplia sin atar al usuario |
| **D-104** | Telemetría anónima opt-out a Supabase NeoNodos | Spec OQ-4; útil sin invasivo |
| **D-105** | Vite como build tool (no esbuild puro) | Continuidad con bootstrap |
| **D-106** | Monorepo único con `packages/editor/` | Continuidad con D-001 |
| **D-107** | Repo privado hasta Fase 3 | Honra Constitution §8.4 |
| **D-108** | Cambios al uniform layout sincronizan WGSL+renderer+UNIFORM_BYTES en mismo commit | Regla CLAUDE.md, código D-XXX permanente |
| **D-109** | Vitest + @vitest/coverage-v8 para tests | Único framework, alinea con stack TS moderno |
| **D-110** | Editor en Cloudflare Pages, subdomain `m13.neonodos.com`, sin auth en v0.1 con rate limit en /api/llm | Stack NeoNodos + simplicidad inicial |

---

## 11. Hand-off al Prompt #3 (generación de tasks)

Cuando este plan se apruebe, generar `docs/tasks/phase-1-tasks.md` con la siguiente estructura:

- Listado numerado T-001, T-002, ... ordenado por el camino crítico de §5
- Cada task: 1-2 líneas descripción, archivos a tocar, criterio de done, estimación 30-90 min
- Marcar con `[BLOQUEADOR]` lo que sale del camino crítico
- Marcar con `[PARALELIZABLE]` lo que puede ejecutarse con subagent-driven-development
- La primera task `T-001` es **adopción del spec D-1 (`m13-spec/v0.1.md`)** — sin esto nada más arranca

---

## 12. Aprobación

- [ ] Gato aprueba este plan tal cual
- [ ] Gato aprueba con modificaciones (anotar abajo)
- [ ] Gato rechaza y pide rehacer (anotar razón)

Solo con aprobación pasamos a **Prompt #3 — generar tasks**.

---

*Fin del plan de Fase 1. Cualquier desvío de este documento durante la implementación debe quedar registrado en `BITACORA_MOTOR13.md` con código D-XXX nuevo.*
