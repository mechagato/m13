# m13 · Phase 1 — Tasks

**Phase:** 1 of N · lenguaje `.m13` + librería de conceptos
**Source plan:** [`docs/plans/phase-1-plan.md`](../plans/phase-1-plan.md)
**Source spec:** [`docs/spec/phase-1-spec.md`](../spec/phase-1-spec.md)
**Authored:** 2026-05-21
**Total tasks:** 78 (incluyendo T-000 ya completado)
**Total estimado:** ~108-145 h-Claude

---

## Cómo leer este documento

Cada task tiene:
- **ID `T-XXX`** secuencial, ordenado por camino crítico
- **Componente** del plan que la origina (`C-XXX`)
- **Descripción** 1-2 líneas accionables
- **Archivos a tocar** absoluto desde `m13/`
- **Done cuando** criterio verificable (test, comando, output)
- **Estimado** 30/45/60/90 min
- **Depende de** lista de tasks que deben estar `[x]` antes de empezar
- **Etiquetas:**
  - `[BLOQUEADOR]` — si no pasa, bloquea camino crítico
  - `[PARALELIZABLE]` — apta para `superpowers:subagent-driven-development`
  - `[OPCIONAL]` — sale del MVP si scope-cut activado (§9 del plan)
  - `[INFRA]` — requiere acción externa (deploy, comprar dominio, etc.)

Granularidad: ninguna task supera 90 min. Si una task se siente más larga durante implementación, dividirla en T-XXX.a / T-XXX.b y registrar en BITACORA.

---

## Tabla de contenidos

- [Pre-fase: T-000 baseline (completado)](#pre-fase)
- [D-1 — Especificación formal `.m13 v0.1` (T-001..T-006)](#d-1--especificación-formal-m13-v01)
- [D-2 — Runtime extension + tests (T-007..T-024)](#d-2--runtime-extension--tests)
- [D-3 — Synth 14 conceptos (T-025..T-046)](#d-3--synth-14-conceptos)
- [D-5 — 3 escenas formales (T-047..T-051)](#d-5--3-escenas-formales)
- [D-4 — Editor Next.js + LLM (T-052..T-068)](#d-4--editor-nextjs--llm)
- [D-7 — Demo público (T-069..T-072)](#d-7--demo-público)
- [D-6 — Benchmark vs Three.js/Unity (T-073..T-075)](#d-6--benchmark-vs-threejsunity)
- [D-8 — Docs + Spec Fase 2 (T-076..T-078)](#d-8--docs--spec-fase-2)
- [Mapa de dependencias (resumen)](#mapa-de-dependencias-resumen)

---

## Pre-fase

### T-000 [x] Fix typecheck baseline TS 5.9 [BLOQUEADOR] (completado 2026-05-21)

- **Componente:** plan §1.1 + Entrada 002 de BITACORA
- **Descripción:** Agregar `@webgpu/types` a `@m13/synth`, quitar import no usado, tipar `Uint8Array<ArrayBuffer>` en mic-input.
- **Archivos:** `packages/synth/package.json`, `packages/runtime/src/compiler/index.ts`, `packages/runtime/src/audio/mic-input.ts`
- **Done cuando:** `pnpm typecheck` limpio en los 3 packages. ✅
- **Commit:** `9a7ca25`

---

## D-1 — Especificación formal `.m13 v0.1`

### T-001 [BLOQUEADOR] Crear estructura `m13-spec/` y esqueleto `v0.1.md`

- **Componente:** C-101
- **Descripción:** Crear directorio `m13-spec/`, archivo `v0.1.md` con secciones: Identidad, Schema raíz, Tipos primitivos, Conceptos, Objetos, Iluminación, Validación, Extensiones, Versionado, Ejemplos.
- **Archivos:** `m13-spec/v0.1.md` (nuevo)
- **Done cuando:** Doc abierto a editar con 10 secciones esqueleto (sin contenido todavía).
- **Estimado:** 30 min
- **Depende de:** T-000

### T-002 [BLOQUEADOR] Documentar schema raíz + tipos primitivos en spec

- **Componente:** C-101
- **Descripción:** Cubrir 100% de `m13SceneSchema`: scene, bounds, spawn, ambient, light, walls, floor, ceiling, window, objects. Para cada uno: tipo, defaults, restricciones, ejemplo YAML.
- **Archivos:** `m13-spec/v0.1.md`
- **Done cuando:** Cada campo del Zod schema tiene su entrada en el doc con: tipo TS, restricción Zod (min/max), default, ejemplo YAML válido.
- **Estimado:** 60 min
- **Depende de:** T-001

### T-003 Documentar materiales/conceptos + extension policy en spec

- **Componente:** C-101
- **Descripción:** Sección "Material" cubre `materialSchema` (string corta o `{concept, params}` extendida). Sección "Extensiones": política de versionado, campos desconocidos, conceptos no registrados.
- **Archivos:** `m13-spec/v0.1.md`
- **Done cuando:** Doc explica el contrato runtime↔.m13 y cómo agregar campos en v0.2 sin romper v0.1.
- **Estimado:** 45 min
- **Depende de:** T-002

### T-004 Añadir 3 ejemplos positivos + 3 contraejemplos al spec

- **Componente:** C-101
- **Descripción:** 3 YAML válidos minimal/intermedio/avanzado. 3 contraejemplos con error esperado (campo inválido, version desconocida, concept inexistente).
- **Archivos:** `m13-spec/v0.1.md`
- **Done cuando:** Cada contraejemplo lista el mensaje exacto de error esperado del parser.
- **Estimado:** 45 min
- **Depende de:** T-003

### T-005 [BLOQUEADOR] Generador JSON Schema desde Zod (CLI tool)

- **Componente:** C-102
- **Descripción:** Script `tools/gen-json-schema.ts` que importa `m13SceneSchema` y produce `m13-spec/v0.1.schema.json` (draft-07).
- **Archivos:** `tools/gen-json-schema.ts` (nuevo), `m13-spec/v0.1.schema.json` (output), `package.json` script `gen:schema`
- **Done cuando:** `pnpm gen:schema` produce JSON Schema válido (validar con `ajv` opcional). Tamaño consistente entre runs (diff zero).
- **Estimado:** 60 min
- **Depende de:** T-002

### T-006 Parser: warning (no error) para campos desconocidos + test de versionado

- **Componente:** C-103 + C-104
- **Descripción:** En `validateScene`, después de Zod parse, comparar keys del raw vs keys reconocidas y emitir `console.warn` para extras. Validar `version` === "0.1", error claro si no.
- **Archivos:** `packages/runtime/src/parser/index.ts`, `packages/runtime/src/parser/schema.ts` (si requiere)
- **Done cuando:** Test manual: YAML con `version: "0.2"` lanza error `m13 v0.2 no soportado por este runtime`. YAML con campo extra `foo: bar` no falla y emite warning con path.
- **Estimado:** 45 min
- **Depende de:** T-002

---

## D-2 — Runtime extension + tests

### T-007 [BLOQUEADOR] Setup Vitest + coverage v8 a nivel monorepo

- **Componente:** C-201
- **Descripción:** Instalar `vitest` `@vitest/coverage-v8`, crear `vitest.config.ts` raíz, scripts `test`/`test:coverage` en root y runtime.
- **Archivos:** `package.json` (root + runtime), `vitest.config.ts` (raíz)
- **Done cuando:** `pnpm test` corre (0 tests por ahora). `pnpm test:coverage` genera `coverage/index.html`.
- **Estimado:** 45 min
- **Depende de:** T-000

### T-008 [PARALELIZABLE] Tests parser: casos válidos con defaults aplicados

- **Componente:** C-202
- **Descripción:** 6+ tests: escena minimal, escena completa, defaults de ambient/light, walls/floor/ceiling como string corta vs objeto.
- **Archivos:** `packages/runtime/src/parser/__tests__/parser-valid.test.ts` (nuevo)
- **Done cuando:** 6 tests pasan, coverage parser >50% solo con estos.
- **Estimado:** 60 min
- **Depende de:** T-007

### T-009 [PARALELIZABLE] Tests parser: errores con path y mensaje claro

- **Componente:** C-202
- **Descripción:** 6+ tests: YAML inválido (no parsea), bounds no es vec3, light.intensity negativo, scene sin name, version inválida, concept inexistente al material.
- **Archivos:** `packages/runtime/src/parser/__tests__/parser-errors.test.ts` (nuevo)
- **Done cuando:** Coverage parser >85% combinado con T-008. Cada test verifica mensaje de error contiene path correcto.
- **Estimado:** 60 min
- **Depende de:** T-007, T-006

### T-010 Tests compiler: WGSL generado contiene funciones esperadas

- **Componente:** C-203
- **Descripción:** 4+ tests: compileScene de cada una de las 4 escenas demo, verificar que `wgsl` contiene `fn map(`, `fn material(`, `fn mat_<concept_id>(` por cada concept usado, `conceptsUsed` array correcto.
- **Archivos:** `packages/runtime/src/compiler/__tests__/compiler-output.test.ts` (nuevo)
- **Done cuando:** 4 tests pasan, coverage compiler >50%.
- **Estimado:** 60 min
- **Depende de:** T-007

### T-011 [BLOQUEADOR] Compiler determinism: ordenar conceptsUsed + floats fijos

- **Componente:** C-204
- **Descripción:** En `collectConceptIds()` ordenar set lexicográficamente. En `generateMapFunction` y `generateMaterialFunction`, formatear floats con `.toFixed(6)` o helper para evitar ruido como `0.300000000004`.
- **Archivos:** `packages/runtime/src/compiler/index.ts`
- **Done cuando:** Test (en T-012) de determinismo pasa.
- **Estimado:** 60 min
- **Depende de:** T-010

### T-012 [PARALELIZABLE] Tests compiler determinism: 100 corridas, mismo SHA-256

- **Componente:** C-203 (determinismo)
- **Descripción:** Test que compila la misma escena 100 veces, hashea el WGSL con SHA-256, todos los hashes son idénticos.
- **Archivos:** `packages/runtime/src/compiler/__tests__/compiler-determinism.test.ts` (nuevo)
- **Done cuando:** Test pasa. Coverage compiler >70% combinado con T-010.
- **Estimado:** 30 min
- **Depende de:** T-011

### T-013 Caché de shaders por hash (engine + compiler)

- **Componente:** C-205
- **Descripción:** En `M13Engine.loadScene`, calcular hash SHA-256 del WGSL antes de crear shader module. Si el hash coincide con el último cargado y no hubo cambios estructurales, reusar el `GPUShaderModule` previo.
- **Archivos:** `packages/runtime/src/engine.ts`, `packages/runtime/src/compiler/index.ts` (exportar `wgslHash` opcional)
- **Done cuando:** Manual: cargar misma escena 2 veces, segunda vez `console.time` < 5ms para el step "compile pipeline".
- **Estimado:** 60 min
- **Depende de:** T-011

### T-014 Benchmark compile-time: 50 objetos en <200ms

- **Componente:** C-206
- **Descripción:** Script `tools/bench-compile.ts` genera escena sintética con 50 objetos random, mide tiempo de `parseScene + compileScene` × 10 corridas, imprime media/p95.
- **Archivos:** `tools/bench-compile.ts` (nuevo), `package.json` script `bench:compile`
- **Done cuando:** `pnpm bench:compile` imprime p95 < 200ms en Cerebro4. Si excede, escalar.
- **Estimado:** 60 min
- **Depende de:** T-011

### T-015 Bundle config runtime + size-limit budget

- **Componente:** C-207 (parte 1)
- **Descripción:** Crear `packages/runtime/vite.config.ts` para build library mode → `dist/m13-runtime.js` (ESM). Instalar `size-limit` + `@size-limit/preset-small-lib`.
- **Archivos:** `packages/runtime/vite.config.ts` (nuevo), `packages/runtime/package.json` (script build + size-limit config)
- **Done cuando:** `pnpm --filter @m13/runtime build` produce `dist/m13-runtime.js`. `pnpm --filter @m13/runtime size` corre y reporta size.
- **Estimado:** 60 min
- **Depende de:** T-007

### T-016 Validar bundle <100KB gzipped + ajustar

- **Componente:** C-207 (parte 2)
- **Descripción:** Si bundle inicial > 100KB, identificar bloat: `yaml` lib full vs minimal API, Zod tree-shaking, splits dinámicos.
- **Archivos:** `packages/runtime/vite.config.ts`, posiblemente `packages/runtime/src/parser/index.ts` (importar `parse` de `yaml` directamente)
- **Done cuando:** `pnpm size` reporta < 100KB gzipped. Si no se logra, registrar en BITACORA y plantear scope-cut.
- **Estimado:** 60 min
- **Depende de:** T-015

### T-017 [BLOQUEADOR] Extender interface `Concept` con paramsSchema + manifest()

- **Componente:** C-311
- **Descripción:** En `@m13/synth/index.ts`, agregar campos: `paramsSchema?: z.ZodObject<any>`, `defaults?: Record<string, unknown>`, `category` ampliada con `'object_geo'`. Función `manifest()` que retorna metadata serializable.
- **Archivos:** `packages/synth/src/index.ts`, los 8 concepts existentes (añadir `paramsSchema: z.object({})` vacío para compat)
- **Done cuando:** `pnpm typecheck` limpio en synth. `listConcepts().every(c => c.manifest)` true.
- **Estimado:** 60 min
- **Depende de:** T-000

### T-018 Compiler: leer params del object.material y propagarlos

- **Componente:** C-208 (a)
- **Descripción:** Cuando `materialSchema` es `{concept, params}`, validar params contra `concept.paramsSchema`. Inyectar como uniforms numéricos en posición fija del nuevo buffer MAT_PARAMS.
- **Archivos:** `packages/runtime/src/compiler/index.ts`
- **Done cuando:** Test manual: escena con `material: {concept: 'metal_dorado_pulido', params: {roughness: 0.8}}` no truena, compila WGSL referencia uniform `matParams.metal_dorado_pulido_roughness`.
- **Estimado:** 90 min (frontera; si se alarga, dividir en compiler→params layout, compiler→WGSL injection)
- **Depende de:** T-011, T-017

### T-019 Renderer: agregar buffer MAT_PARAMS + bind group entry

- **Componente:** C-208 (b)
- **Descripción:** Crear segundo buffer uniform `matParamsBuffer` (256B fixed budget = 64 floats), añadir entry al bind group, actualizar `writeUniforms` para escribirlo.
- **Archivos:** `packages/runtime/src/renderer/index.ts`, `packages/runtime/src/shaders/common.ts` (struct MatParams)
- **Done cuando:** Renderer inicia sin error con el segundo buffer. La 4ta escena demo (`templo_mexica`) renderiza igual que antes (con params vacíos).
- **Estimado:** 90 min (frontera; si se alarga, dividir en setup buffer / writeUniforms / WGSL struct)
- **Depende de:** T-018

### T-020 [PARALELIZABLE] Test E2E: param de concept altera output visual

- **Componente:** C-208 (validación)
- **Descripción:** Test unitario: compilar escena A con `params: {x: 0.1}` y B con `params: {x: 0.9}`, comparar substrings WGSL — diferentes en la línea del uniform.
- **Archivos:** `packages/runtime/src/compiler/__tests__/compiler-params.test.ts` (nuevo)
- **Done cuando:** Test pasa.
- **Estimado:** 45 min
- **Depende de:** T-019

### T-021 Compiler: soporte `kind: concept` para conceptos geométricos

- **Componente:** C-312
- **Descripción:** En `parser/schema.ts`, agregar `'concept'` al `objectKindSchema`. En compiler `generateObjectSdf`, cuando `kind === 'concept'`, delegar al SDF del concept geo (que expone `wgslSdf` además de `wgslMaterial`).
- **Archivos:** `packages/runtime/src/parser/schema.ts`, `packages/runtime/src/compiler/index.ts`, extender `Concept` interface con `wgslSdf?: string`
- **Done cuando:** Test (T-039) pasa.
- **Estimado:** 90 min (frontera; dividir si crece)
- **Depende de:** T-017

### T-022 Manifest JSON exportable por concepto (para editor)

- **Componente:** C-313
- **Descripción:** Función `manifest()` por concepto que retorna `{id, category, description, defaults, paramsJsonSchema}`. Convertir Zod schema a JSON Schema con `zod-to-json-schema`.
- **Archivos:** `packages/synth/src/index.ts`, instalar `zod-to-json-schema`
- **Done cuando:** `listConcepts().map(c => c.manifest())` produce array serializable a JSON.
- **Estimado:** 45 min
- **Depende de:** T-017

### T-023 [PARALELIZABLE] README.md inicial de runtime (inglés)

- **Componente:** C-802
- **Descripción:** Documentar M13Engine API, parseScene, compileScene, FlyCamera, MicAudioInput con ejemplos cortos.
- **Archivos:** `packages/runtime/README.md` (nuevo)
- **Done cuando:** Cada export público de `index.ts` tiene su sección con ejemplo de 5-10 líneas.
- **Estimado:** 60 min
- **Depende de:** T-013

### T-024 [PARALELIZABLE] README.md inicial de synth (inglés)

- **Componente:** C-803
- **Descripción:** Tutorial: cómo agregar un concepto nuevo en <30 min. Plantilla mínima de un concept module + cómo registrarlo + cómo testear visualmente.
- **Archivos:** `packages/synth/README.md` (nuevo)
- **Done cuando:** Doc completo con código copiable y referenciado por CLAUDE.md.
- **Estimado:** 60 min
- **Depende de:** T-017

---

## D-3 — Synth 14 conceptos

> Cada concepto material (T-025..T-030) es un módulo `.ts` independiente con WGSL + paramsSchema. Apta para subagent-driven-development paralelo (no comparten archivo).

### T-025 [PARALELIZABLE] Concept material: `pared_concreto_pulido`

- **Componente:** C-301
- **Descripción:** WGSL: base gris claro + speckle FBM + manchas leves. Params: `tint` (vec3), `roughness` (f32, 0-1).
- **Archivos:** `packages/synth/src/concepts/pared_concreto_pulido.ts` (nuevo), registrar en `synth/src/index.ts`
- **Done cuando:** Concept aparece en `listConcepts()`. Renderiza al referenciarse desde escena de prueba.
- **Estimado:** 45 min
- **Depende de:** T-017

### T-026 [PARALELIZABLE] Concept material: `pared_madera_oscura`

- **Componente:** C-302
- **Descripción:** WGSL: vetas senoidales en y/z + tinta café oscuro + brillo bajo. Params: `darkness` (f32), `grainScale` (f32).
- **Archivos:** `packages/synth/src/concepts/pared_madera_oscura.ts` (nuevo)
- **Done cuando:** ídem T-025.
- **Estimado:** 45 min
- **Depende de:** T-017

### T-027 [PARALELIZABLE] Concept material: `piso_marmol_blanco`

- **Componente:** C-303
- **Descripción:** Variante floor optimizada de `marmol_blanco_vetas`. Vetas más sutiles, brillo de piso pulido. Params: `veinIntensity`.
- **Archivos:** `packages/synth/src/concepts/piso_marmol_blanco.ts` (nuevo)
- **Done cuando:** ídem T-025.
- **Estimado:** 30 min
- **Depende de:** T-017

### T-028 [PARALELIZABLE] Concept material: `metal_oxidado`

- **Componente:** C-304
- **Descripción:** WGSL: óxido naranja/marrón sobre metal gris. Mancha procedural FBM. Params: `rustAmount` (0-1).
- **Archivos:** `packages/synth/src/concepts/metal_oxidado.ts` (nuevo)
- **Done cuando:** ídem T-025.
- **Estimado:** 45 min
- **Depende de:** T-017

### T-029 [PARALELIZABLE] Concept material: `metal_bronce_pulido`

- **Componente:** C-305
- **Descripción:** WGSL: bronce cobrizo cálido con shimmer leve. Sin audio reactivity (vs metal_dorado_pulido que sí). Params: `shimmer` (f32).
- **Archivos:** `packages/synth/src/concepts/metal_bronce_pulido.ts` (nuevo)
- **Done cuando:** ídem T-025.
- **Estimado:** 45 min
- **Depende de:** T-017

### T-030 [PARALELIZABLE] Concept material: `vidrio_esmerilado` (emulado)

- **Componente:** C-306
- **Descripción:** Sin transmisión real (limitación documentada). Noise alto + brillo especular alto + tinta semi-transparente faked. Params: `clarity` (0-1).
- **Archivos:** `packages/synth/src/concepts/vidrio_esmerilado.ts` (nuevo)
- **Done cuando:** ídem T-025. Limitación documentada en `synth/README.md`.
- **Estimado:** 60 min
- **Depende de:** T-017

### T-031 [PARALELIZABLE] Concept geo: `pedestal_marmol`

- **Componente:** C-307
- **Descripción:** Concept con `wgslSdf` (round_box parametrizable) + `wgslMaterial` (mármol). Params: `width`, `height`, `depth`, `cornerRadius`.
- **Archivos:** `packages/synth/src/concepts/pedestal_marmol.ts` (nuevo)
- **Done cuando:** Referenciable en `.m13` con `kind: concept`/`concept: pedestal_marmol`. Renderiza.
- **Estimado:** 60 min
- **Depende de:** T-021

### T-032 [PARALELIZABLE] Concept geo: `lampara_colgante` (emissive inline)

- **Componente:** C-308
- **Descripción:** Cilindro suspendido del techo + glow inline en shading (no segunda luz). Params: `height`, `glowColor`, `glowIntensity`.
- **Archivos:** `packages/synth/src/concepts/lampara_colgante.ts` (nuevo)
- **Done cuando:** Renderiza con halo emisivo visible. Documentar limitación de no segunda luz en synth/README.md.
- **Estimado:** 90 min
- **Depende de:** T-021

### T-033 [PARALELIZABLE] Concept geo: `esfera_decorativa`

- **Componente:** C-309
- **Descripción:** Sphere con radius parametrizable + material configurable. Params: `radius`, `material` (string ID a otro concept).
- **Archivos:** `packages/synth/src/concepts/esfera_decorativa.ts` (nuevo)
- **Done cuando:** ídem T-031.
- **Estimado:** 45 min
- **Depende de:** T-021

### T-034 [PARALELIZABLE] Concept geo: `cubo_basico`

- **Componente:** C-310
- **Descripción:** Box parametrizable + material configurable. Params: `size` (vec3), `material` (string).
- **Archivos:** `packages/synth/src/concepts/cubo_basico.ts` (nuevo)
- **Done cuando:** ídem T-031.
- **Estimado:** 30 min
- **Depende de:** T-021

### T-035 [PARALELIZABLE] Smoke test visual cada concept nuevo (10 materiales + 4 geo)

- **Componente:** validación D-3
- **Descripción:** Una escena `packages/examples/public/scenes/_concepts_showcase.m13` con todos los 14 conceptos lado a lado.
- **Archivos:** `packages/examples/public/scenes/_concepts_showcase.m13` (nuevo), registrar en `main.ts`
- **Done cuando:** Abrir el demo, seleccionar la escena, todos los conceptos visibles sin shader errors en DevTools console.
- **Estimado:** 60 min
- **Depende de:** T-025..T-034

### T-036 [PARALELIZABLE] Update `synth/README.md` con catálogo final de 14 conceptos

- **Componente:** C-803
- **Descripción:** Tabla actualizada con ID, categoría, descripción, params clave.
- **Archivos:** `packages/synth/README.md`
- **Done cuando:** README lista los 14 conceptos.
- **Estimado:** 30 min
- **Depende de:** T-035

---

## D-5 — 3 escenas formales

### T-037 [PARALELIZABLE] Escena `sala_galeria.m13`

- **Componente:** C-501
- **Descripción:** Galería minimalista: paredes yeso_blanco, piso marmol_blanco, ceiling yeso_blanco, esfera_decorativa, pedestal_marmol, ambient frío.
- **Archivos:** `packages/examples/public/scenes/sala_galeria.m13` (nuevo)
- **Done cuando:** Pesa <30KB, abre en demo, renderiza >60fps en Cerebro4 (medir con onFrame).
- **Estimado:** 45 min
- **Depende de:** T-035

### T-038 [PARALELIZABLE] Escena `cocina_industrial.m13`

- **Componente:** C-502
- **Descripción:** Cocina loft: pared_ladrillo_viejo, piso_concreto_industrial, lampara_colgante, isla con metal_bronce_pulido encima.
- **Archivos:** `packages/examples/public/scenes/cocina_industrial.m13` (nuevo)
- **Done cuando:** ídem T-037.
- **Estimado:** 45 min
- **Depende de:** T-035

### T-039 [PARALELIZABLE] Escena `oficina_neonodos.m13`

- **Componente:** C-503
- **Descripción:** Oficina con identidad NeoNodos: ambient.tint terracota, paredes yeso_blanco con manchas cálidas, piso madera, esfera dorada audio_reactive como pieza central.
- **Archivos:** `packages/examples/public/scenes/oficina_neonodos.m13` (nuevo)
- **Done cuando:** Identidad NeoNodos clara, pesa <30KB, >60fps.
- **Estimado:** 60 min
- **Depende de:** T-035

### T-040 Reconciliación de scene registry en `main.ts`

- **Componente:** C-504
- **Descripción:** Reemplazar `sala_basica`, `galeria_minimal`, `loft_industrial` por las 3 nuevas. Mantener `templo_mexica` como 4ta escena (audio reactivo). Eliminar los 3 .m13 viejos.
- **Archivos:** `packages/examples/src/main.ts`, eliminar `packages/examples/public/scenes/sala_basica.m13`, `galeria_minimal.m13`, `loft_industrial.m13`
- **Done cuando:** Demo arranca con 4 escenas: sala_galeria, cocina_industrial, oficina_neonodos, templo_mexica. Hotkeys 1-4 funcionan.
- **Estimado:** 30 min
- **Depende de:** T-037, T-038, T-039

### T-041 [PARALELIZABLE] FPS budget validation pass: las 4 escenas >60fps

- **Componente:** spec §8 criterio
- **Descripción:** Abrir demo, navegar cada escena 30s, registrar FPS min/avg/max en BITACORA. Si <60fps, registrar como issue y mitigar (reducir octaves del FBM en concept correspondiente).
- **Archivos:** `BITACORA_MOTOR13.md` (entrada)
- **Done cuando:** Tabla FPS por escena en BITACORA. Las 4 ≥60fps en Cerebro4. Si alguna no, plan de mitigación documentado.
- **Estimado:** 45 min
- **Depende de:** T-040

---

## D-4 — Editor Next.js + LLM

### T-042 [BLOQUEADOR] Scaffold `packages/editor/` con Next.js 14 + Tailwind + ESLint

- **Componente:** C-401
- **Descripción:** `pnpm create next-app packages/editor --typescript --tailwind --eslint --app --use-pnpm`. Configurar para workspace: name `@m13/editor`, link a `@m13/runtime` y `@m13/synth`. tsconfig.json estricto consistente con base.
- **Archivos:** `packages/editor/*` (estructura completa Next.js)
- **Done cuando:** `pnpm --filter @m13/editor dev` arranca en `localhost:3000`. Página default Next.js visible.
- **Estimado:** 60 min
- **Depende de:** T-035 (necesitamos synth completo para preview)

### T-043 Layout shell del editor (header + 3 zonas)

- **Componente:** C-402 (a)
- **Descripción:** `app/page.tsx` con flexbox layout: header con logo m13 + nombre escena + acciones; main split 50/50 con resizer drag; footer panel errores 20% alto.
- **Archivos:** `packages/editor/app/page.tsx`, `packages/editor/components/EditorShell.tsx` (nuevo), `packages/editor/components/Resizer.tsx`
- **Done cuando:** Shell visible, drag funciona, las 3 zonas placeholder.
- **Estimado:** 60 min
- **Depende de:** T-042

### T-044 Monaco YAML editor integrado

- **Componente:** C-402 (b)
- **Descripción:** Instalar `monaco-editor` + `@monaco-editor/react`. Componente `MonacoYaml` con sintaxis YAML, dark theme, font monoespaciada, contenido inicial = escena `sala_galeria.m13` cargada vía fetch.
- **Archivos:** `packages/editor/components/MonacoYaml.tsx` (nuevo), `packages/editor/lib/load-initial-scene.ts`
- **Done cuando:** Editor YAML carga escena inicial, sintaxis highlighted, editable.
- **Estimado:** 60 min
- **Depende de:** T-043

### T-045 [BLOQUEADOR] Preview WebGPU integrado con M13Engine

- **Componente:** C-403 (a)
- **Descripción:** Componente `Preview` con `<canvas>` que monta `M13Engine` en `useEffect`. Carga `currentYaml` como `engine.loadScene(yaml)`. Maneja errores con try/catch → propaga a `ErrorPanel`.
- **Archivos:** `packages/editor/components/Preview.tsx`, `packages/editor/lib/engine-instance.ts`
- **Done cuando:** Abrir editor → preview renderiza la escena inicial. Cambios en Monaco no reflejan aún (eso es T-046).
- **Estimado:** 90 min (frontera; dividir si crece)
- **Depende de:** T-044

### T-046 Live reload: YAML change → re-compile → re-render <500ms

- **Componente:** C-403 (b)
- **Descripción:** Debounce de 250ms en cambios de Monaco. Llamar `engine.loadScene(newYaml)` en background. Medir tiempo total con `performance.now()`, mostrar en HUD.
- **Archivos:** `packages/editor/components/MonacoYaml.tsx`, `packages/editor/components/Preview.tsx`
- **Done cuando:** Editar campo → re-render en pantalla en <500ms. HUD muestra ms.
- **Estimado:** 60 min
- **Depende de:** T-045, T-013

### T-047 Error panel + Zod path → Monaco markers

- **Componente:** C-404
- **Descripción:** Cuando `engine.loadScene` truena con `ZodError`, parsear path (e.g. `objects.0.position`) y mapear a línea YAML correspondiente. Mostrar marker rojo en Monaco con mensaje.
- **Archivos:** `packages/editor/components/ErrorPanel.tsx`, `packages/editor/lib/yaml-marker-bridge.ts` (parser line tracker)
- **Done cuando:** Romper YAML con error de tipo → marker en línea correcta, mensaje en panel.
- **Estimado:** 90 min (frontera; dividir)
- **Depende de:** T-046

### T-048 Panel "Natural language → .m13" UI

- **Componente:** C-405 (UI)
- **Descripción:** Componente `NLPrompt` con textarea + botón "Generate" + spinner + settings (API key, modo client/server).
- **Archivos:** `packages/editor/components/NLPrompt.tsx`, `packages/editor/components/SettingsPanel.tsx`
- **Done cuando:** UI visible, settings persisten en localStorage.
- **Estimado:** 60 min
- **Depende de:** T-043

### T-049 LLM client-side (Anthropic SDK browser)

- **Componente:** C-406
- **Descripción:** Modo client: usa API key del localStorage, llama directo a Anthropic API browser-safe. Manejo de errores (401 → "API key inválida", rate limit → "intenta de nuevo").
- **Archivos:** `packages/editor/lib/llm-client.ts`
- **Done cuando:** Click Generate con API key válida → request a Claude funciona, response parseable.
- **Estimado:** 60 min
- **Depende de:** T-048

### T-050 LLM server-side route + rate limit IP

- **Componente:** C-407
- **Descripción:** `app/api/llm/route.ts` POST handler, usa `ANTHROPIC_API_KEY` server, rate limit 10/min/IP con `lru-cache`. Body: `{prompt}` → response: `{m13Yaml, raw}`.
- **Archivos:** `packages/editor/app/api/llm/route.ts`, `packages/editor/lib/rate-limit.ts`
- **Done cuando:** `curl POST /api/llm` funciona. 11ª request en 1 min → 429.
- **Estimado:** 60 min
- **Depende de:** T-048

### T-051 [BLOQUEADOR] System prompt + few-shot examples + spec JSON Schema en contexto

- **Componente:** C-408 (a)
- **Descripción:** `lib/llm-system-prompt.ts` exporta system prompt maestro + array de 5 few-shot examples (user prompt en español → YAML válido). Incluye `m13-spec/v0.1.schema.json` minificado como contexto.
- **Archivos:** `packages/editor/lib/llm-system-prompt.ts`, `packages/editor/lib/few-shots.ts`
- **Done cuando:** Prompt total < 4000 tokens. Few-shots representan: sala minimalista, cocina industrial, espacio con audio reactivo, templo, oficina.
- **Estimado:** 90 min (frontera; dividir en system+spec | few-shots | validación tokens)
- **Depende de:** T-005

### T-052 [PARALELIZABLE] Suite de 30 prompts de evaluación LLM

- **Componente:** C-408 (b)
- **Descripción:** `packages/editor/__tests__/llm-eval.test.ts` con 30 prompts en español, cada uno con criterio: YAML parseable + valida contra Zod + renderiza sin shader error.
- **Archivos:** `packages/editor/__tests__/llm-eval.test.ts` (nuevo), `packages/editor/__tests__/prompts.json`
- **Done cuando:** `pnpm --filter @m13/editor test:llm` corre, reporta % de éxito. Objetivo >70%.
- **Estimado:** 60 min
- **Depende de:** T-051

### T-053 Iterar system prompt hasta >70% pass rate

- **Componente:** C-408 (c)
- **Descripción:** Si T-052 pass rate <70%, iterar few-shots + system prompt. Documentar cambios en BITACORA con D-XXX.
- **Archivos:** `packages/editor/lib/llm-system-prompt.ts`, `packages/editor/lib/few-shots.ts`
- **Done cuando:** Pass rate ≥70% sostenido en 3 corridas consecutivas.
- **Estimado:** 90 min (frontera; iterativo, puede requerir múltiples sesiones)
- **Depende de:** T-052

### T-054 Wire NL→m13: prompt → LLM → insert/replace YAML

- **Componente:** C-405 (wire)
- **Descripción:** Conectar `NLPrompt` botón Generate con `llm-client` (según modo), insertar resultado en Monaco (con confirmación si reemplaza contenido existente).
- **Archivos:** `packages/editor/components/NLPrompt.tsx`, `packages/editor/components/MonacoYaml.tsx`
- **Done cuando:** Prompt "Quiero una sala con paredes de mármol" → YAML insertado → preview renderiza.
- **Estimado:** 60 min
- **Depende de:** T-049, T-050, T-051

### T-055 [OPCIONAL] Export bundle .zip

- **Componente:** C-409
- **Descripción:** Botón "Export" → `lib/export-bundle.ts` genera `.zip` con: el `.m13` actual, `runtime.standalone.js` build, `index.html` mínimo que carga y renderiza la escena.
- **Archivos:** `packages/editor/lib/export-bundle.ts`, `packages/editor/components/ExportButton.tsx`, instalar `jszip`
- **Done cuando:** Descarga .zip, descomprimir, abrir `index.html` en otro tab → renderiza la escena sin servidor.
- **Estimado:** 90 min (frontera; dividir si crece) — **scope-cut candidate (plan §9 #1)**
- **Depende de:** T-046, T-015

### T-056 [OPCIONAL] Telemetría anónima opt-out a Supabase

- **Componente:** C-410
- **Descripción:** `lib/telemetry.ts` con función `track(event, props)`. Eventos: scene_loaded, scene_compiled, llm_prompt_submitted, llm_prompt_accepted, error. Toggle en settings (default off + banner). Insert a Supabase tabla `m13_editor_telemetry`.
- **Archivos:** `packages/editor/lib/telemetry.ts`, `packages/editor/components/SettingsPanel.tsx`
- **Done cuando:** Toggle ON envía evento a Supabase. OFF no envía nada. Test manual.
- **Estimado:** 60 min — **scope-cut candidate (plan §9 #2)**
- **Depende de:** T-043

### T-057 README editor + setup local + deploy CF Pages

- **Componente:** C-804
- **Descripción:** Guía: setup local, env vars, modo client/server, deploy a Cloudflare Pages con `wrangler`.
- **Archivos:** `packages/editor/README.md` (nuevo)
- **Done cuando:** Doc cubre los 4 pasos del workflow.
- **Estimado:** 45 min
- **Depende de:** T-054

---

## D-7 — Demo público

### T-058 Build de producción `@m13/examples` optimizado

- **Componente:** C-701
- **Descripción:** `pnpm --filter @m13/examples build` → `dist/`. Configurar Vite para tree-shaking máximo, code split por escena (lazy load .m13).
- **Archivos:** `packages/examples/vite.config.ts`
- **Done cuando:** `dist/` < 500KB total (HTML+CSS+JS, sin contar fonts/assets externos). `serve dist/` funciona.
- **Estimado:** 60 min
- **Depende de:** T-040

### T-059 [INFRA] Deploy a Cloudflare Pages — subdomain `motor13.neonodos.com`

- **Componente:** C-702
- **Descripción:** Crear proyecto CF Pages, push `dist/` o conectar GitHub. Configurar DNS CNAME `motor13` → CF Pages.
- **Archivos:** — (acción CF dashboard + DNS)
- **Done cuando:** URL pública responde 200, demo navegable.
- **Estimado:** 30 min
- **Depende de:** T-058

### T-060 [PARALELIZABLE] Generar QR + integrar en página

- **Componente:** C-703
- **Descripción:** QR PNG apuntando a la URL pública. Integrar en HUD del demo (esquina inferior derecha) con tooltip "Escanéame".
- **Archivos:** `packages/examples/public/qr.png`, `packages/examples/index.html`
- **Done cuando:** QR escaneable desde celular abre el demo.
- **Estimado:** 30 min
- **Depende de:** T-059

### T-061 Test en Quest 3 vía Tailscale

- **Componente:** C-704
- **Descripción:** Abrir URL pública o local desde browser del Quest 3 (vía Tailscale). Capturar FPS — objetivo ≥72fps en `sala_galeria.m13`. **Gato tiene Quest 3 a la mano (confirmado 2026-05-21) — incluido en MVP.**
- **Archivos:** captura en BITACORA
- **Done cuando:** Screenshot del Quest con FPS counter ≥72fps. Si falla, registrar en BITACORA y mitigar (reducir octaves de FBM en concepts caros) o documentar como gap.
- **Estimado:** 60 min (requiere Quest físico — disponible)
- **Depende de:** T-058

---

## D-6 — Benchmark vs Three.js/Unity

### T-062 [PARALELIZABLE] Crear escena equivalente en Three.js

- **Componente:** C-601 (Plan B activado por default — Unity diferido)
- **Descripción:** Build standalone Three.js que renderiza algo equivalente a `sala_galeria.m13`: cuarto con texturas, esfera, ambiente. Hospedar como página estática.
- **Archivos:** `tools/bench/threejs-comparison/` (nuevo)
- **Done cuando:** Three.js demo funciona en mismo browser que `m13`, comparable visualmente.
- **Estimado:** 90 min
- **Depende de:** T-037

### T-063 [PARALELIZABLE] Medir métricas: peso assets, tiempo carga, FPS, bundle, memoria

- **Componente:** C-602
- **Descripción:** Script de medición o instrumentación manual. Tabla con 5 métricas × 2 motores (m13 vs Three.js).
- **Archivos:** `docs/papers/phase-1-benchmark.md` (nuevo)
- **Done cuando:** Tabla completa con números reales medidos en mismo hardware.
- **Estimado:** 60 min
- **Depende de:** T-062, T-058

### T-064 Análisis y conclusiones del benchmark report

- **Componente:** C-603
- **Descripción:** Sección "Análisis" del MD: ratio de compresión semántica, validación de H1 (>10× reducción), narrativa para publicación.
- **Archivos:** `docs/papers/phase-1-benchmark.md`
- **Done cuando:** Doc cierra con conclusión clara: H1 validada o no, con números.
- **Estimado:** 60 min
- **Depende de:** T-063

---

## D-8 — Docs + Spec Fase 2

### T-065 [PARALELIZABLE] BITACORA — entrada de cierre de Fase 1

- **Componente:** C-801
- **Descripción:** Entrada `## Entrada NNN · YYYY-MM-DD · Cierre Fase 1` con resumen de lo entregado, métricas clave (FPS, KB, bundle, %LLM), decisiones acumuladas.
- **Archivos:** `BITACORA_MOTOR13.md`
- **Done cuando:** Entrada escrita después del último merge de Fase 1.
- **Estimado:** 45 min
- **Depende de:** T-064

### T-066 [PARALELIZABLE] Spec Fase 2 drafted

- **Componente:** C-805
- **Descripción:** `docs/spec/phase-2-spec.md`. Sigue template del spec Fase 1 (12 secciones). Tema: detalle continuo Sonido 13 (foveation + subdivisión microtonal de raymarching steps).
- **Archivos:** `docs/spec/phase-2-spec.md` (nuevo)
- **Done cuando:** Spec con goal, hipótesis H2.x, FR/NFR, deliverables, success criteria, riesgos. Sin plan/tasks aún (eso es trabajo de Fase 2).
- **Estimado:** 90 min (frontera; dividir si crece)
- **Depende de:** T-064

### T-067 [PARALELIZABLE] Actualizar CLAUDE.md con cierre Fase 1

- **Componente:** C-806
- **Descripción:** Marcar Fase 1 como ✅ COMPLETED en la tabla de fases. Agregar decisiones D-100..D-110 a la sección "Decisiones técnicas registradas". Actualizar "Próximos pasos prioritarios" para Fase 2.
- **Archivos:** `CLAUDE.md`
- **Done cuando:** CLAUDE.md refleja estado real al cierre.
- **Estimado:** 30 min
- **Depende de:** T-066

### T-068 [BLOQUEADOR] Gate de cierre de Fase 1 — verificación de success criteria

- **Componente:** spec §8
- **Descripción:** Checklist final: las 4 escenas >60fps, escenas <50KB, editor live reload <500ms, LLM >70%, bundle <100KB, compile <200ms, persona no-técnica usa el editor. Si todo ✅ → Fase 1 cerrada.
- **Archivos:** registro en `BITACORA_MOTOR13.md`
- **Done cuando:** Tabla checklist con ✅/❌ por criterio. Si alguno ❌ → blocker registrado, decisión de Gato sobre cierre o reapertura.
- **Estimado:** 60 min
- **Depende de:** T-058, T-053, T-064, T-014, T-016

---

## Tasks adicionales no en deliverables principales

### T-069 [PARALELIZABLE] CI básico GitHub Actions: typecheck + test

- **Componente:** auxiliar
- **Descripción:** `.github/workflows/ci.yml` con job que corre `pnpm install`, `pnpm typecheck`, `pnpm test` en push/PR.
- **Archivos:** `.github/workflows/ci.yml` (nuevo)
- **Done cuando:** Push a `main` dispara CI verde.
- **Estimado:** 30 min
- **Depende de:** T-007

### T-070 [PARALELIZABLE] CI: size-limit check del bundle runtime

- **Componente:** C-207 (CI)
- **Descripción:** Job adicional que falla si bundle runtime > 100KB gzipped.
- **Archivos:** `.github/workflows/ci.yml`
- **Done cuando:** PR que crece el bundle >100KB falla CI.
- **Estimado:** 30 min
- **Depende de:** T-069, T-016

### T-071 [PARALELIZABLE] Lint/format: prettier + eslint config compartida monorepo

- **Componente:** auxiliar
- **Descripción:** `.prettierrc`, `.eslintrc.cjs` en raíz. Script `pnpm lint` + `pnpm format`. Quick pass para arreglar todo lo que arroje.
- **Archivos:** raíz + `package.json` scripts
- **Done cuando:** `pnpm lint` limpio. Commits futuros pasan pre-commit hook (opcional con `husky`).
- **Estimado:** 60 min
- **Depende de:** T-007

### T-072 [PARALELIZABLE] CHANGELOG.md inicial

- **Componente:** auxiliar
- **Descripción:** `CHANGELOG.md` con entrada `0.1.0 — 2026-XX-XX` listando todo lo entregado en Fase 1.
- **Archivos:** `CHANGELOG.md` (nuevo)
- **Done cuando:** Doc existe y se actualiza al cerrar la fase.
- **Estimado:** 30 min
- **Depende de:** T-068

### T-073 [PARALELIZABLE] Snapshot tests visuales (opcional)

- **Componente:** auxiliar
- **Descripción:** Playwright screenshot de las 4 escenas en CI, comparar con baseline. Falla si pixel diff >5%.
- **Archivos:** `tools/visual-regression/` (nuevo)
- **Done cuando:** Playwright corre en CI, baseline establecido. — **scope-cut candidate**
- **Estimado:** 90 min
- **Depende de:** T-069

### T-074 [PARALELIZABLE] Documentar troubleshooting del editor

- **Componente:** docs aux
- **Descripción:** Sección "Troubleshooting" en `packages/editor/README.md`: WebGPU no disponible, API key inválida, scene won't render, LLM timeout.
- **Archivos:** `packages/editor/README.md`
- **Done cuando:** 5+ casos documentados con solución.
- **Estimado:** 45 min
- **Depende de:** T-057

### T-075 Auditoría de seguridad básica del editor (LLM proxy)

- **Componente:** R9 del plan
- **Descripción:** Validar: rate limit funciona, no se leakea API key server al cliente, CORS configurado correcto, input sanitizado, no SSRF en LLM call.
- **Archivos:** registro en `BITACORA_MOTOR13.md`
- **Done cuando:** Checklist OWASP-like para LLM apps cubierto, sin findings críticos.
- **Estimado:** 60 min
- **Depende de:** T-050

### T-076 [PARALELIZABLE] Cron job: alerta si Supabase de telemetría se llena (opcional)

- **Componente:** C-410 opcional
- **Descripción:** Si T-056 se hace, agregar cron en `phi` que avise cuando tabla >100k rows o se acerca al free tier limit.
- **Archivos:** `phi` agent definition
- **Done cuando:** Cron registrado. — **scope-cut candidate**
- **Estimado:** 30 min
- **Depende de:** T-056

### T-077 [PARALELIZABLE] Smoke test post-deploy (URL pública)

- **Componente:** auxiliar
- **Descripción:** Script que cURL la URL pública y verifica que HTTP 200 + tamaño esperado + página contiene "m13". Correr en cron 6h.
- **Archivos:** `tools/smoke-deploy.sh` (nuevo), registrar en phi
- **Done cuando:** Script existe y reporta verde por al menos 24h. — **scope-cut candidate**
- **Estimado:** 45 min
- **Depende de:** T-059

### T-078 Sesión visual con Gato para validar decision gate (items 1-2 del spec §12)

- **Componente:** decision gate
- **Descripción:** Abrir VNC o invitar a Gato a `localhost:5173` y validar: FPS aceptable + estética viable. Si OK → marcar gate como aprobado en BITACORA. Si no → blocker + plan de mitigación.
- **Archivos:** `BITACORA_MOTOR13.md`
- **Done cuando:** Gato firma OK o NO.
- **Estimado:** 30 min
- **Depende de:** T-041 (mejor si las 3 escenas formales ya están)

---

## Mapa de dependencias (resumen)

```
T-000 ✅
  │
  ├─→ T-001..T-006 (D-1 spec) ────────────────┐
  │                  │                          │
  │                  │ T-005 schema gen ───────┼─→ T-051 system prompt LLM
  │                  │                          │
  │                  ▼                          │
  │              T-007 vitest setup            │
  │              ├─→ T-008,T-009 parser tests  │
  │              ├─→ T-010,T-012 compiler tests│
  │              ├─→ T-011 determinism ────────┼─→ T-013 cache, T-014 bench
  │              │                              │
  │              ▼                              │
  │           T-015,T-016 bundle ───────────────┼─→ T-055 export bundle
  │                                              │
  │           T-017 Concept interface ──────────┤
  │            ├─→ T-018,T-019,T-020 params propagation
  │            ├─→ T-021,T-022 kind:concept + manifest
  │            ├─→ T-025..T-030 6 materiales [PARALELIZABLE]
  │            └─→ T-031..T-034 4 geo [PARALELIZABLE depende T-021]
  │                                                  │
  │                                                  ▼
  │                                          T-035 showcase + T-036 README
  │                                                  │
  │                                                  ▼
  │                                          T-037..T-040 3+1 escenas
  │                                                  │
  │                                                  ▼
  │                                          T-041 FPS validation
  │                                                  │
  │                                                  ▼
  │                                          T-042 scaffold editor ─→ T-043..T-057
  │                                                                      │
  │                                                                      ▼
  │                                                              T-058 build prod
  │                                                                      │
  │                                                                      ▼
  │                                                              T-059 deploy → T-060 QR
  │                                                                      │
  │                                                                      ▼
  │                                                              T-062..T-064 benchmark
  │                                                                      │
  │                                                                      ▼
  │                                                              T-065..T-068 cierre + spec2
  │
  └─→ T-069..T-077 CI/lint/changelog/etc. [PARALELIZABLE en cualquier punto]
```

**Critical path:** T-000 → T-001 → T-002 → T-005 → T-007 → T-011 → T-017 → T-021 → T-031..T-034 (paralelo) → T-035 → T-037..T-039 (paralelo) → T-040 → T-041 → T-042 → T-045 → T-046 → T-051 → T-053 → T-058 → T-068.

---

## Orden de ejecución sugerido (semanas estimadas a 15-20 h/sem)

| Semana | Tasks | Bloque |
|---|---|---|
| 1 | T-001..T-016 | D-1 spec + D-2 setup tests baseline + bundle |
| 2 | T-017..T-024 + T-069..T-071 | infra Concept extendida + params + CI/lint |
| 3 | T-025..T-036 (mayoría paralelo) | 14 conceptos completos |
| 4 | T-037..T-041 + T-042..T-047 | 3 escenas + editor shell+monaco+preview+errors |
| 5 | T-048..T-057 | NL→m13 + iteración prompts + export + deploy editor |
| 6 | T-058..T-068 + T-072..T-078 | demo público + benchmark + cierre |

---

## Checklist de gating per-task

Antes de marcar una task `[x]`:

- [ ] `pnpm typecheck` limpio
- [ ] `pnpm test` verde (si la task agregó/modificó tests)
- [ ] `pnpm dev` sigue arrancando sin errores en consola del browser
- [ ] BITACORA entry agregada con qué se hizo y decisiones D-XXX si hubo
- [ ] Commit semántico chico (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:` con scope)
- [ ] Si tocó shaders o uniform layout: WGSL + renderer + UNIFORM_BYTES sincronizados (D-108)

---

*Fin del task breakdown de Fase 1. Cualquier ajuste durante la implementación se registra en BITACORA con código D-XXX nuevo y, si invalida una task, se marca como `[skipped]` en este doc.*
