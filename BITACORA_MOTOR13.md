# BITACORA · motor-13

> Log de sesiones de desarrollo del proyecto m13.
> Una entrada por sesión. Español mexicano informal. Sin maquillaje.

---

## Entrada 001 · 2026-05-21 · Bootstrap

**Duración:** ~1 sesión de planeación + producción de bootstrap
**Owner:** Gato
**Asistencia:** Claude Opus 4.7

### Contexto

Conversación de exploración con Gemini y ChatGPT sobre la idea de combinar el Sonido 13 de Julián Carrillo (microtonalismo) con compresión semántica de datos para crear un motor gráfico nuevo. Ambos LLMs dieron buen análisis conceptual pero ninguno aterrizó un plan ejecutable.

Decisión clave: NO intentar matar Unreal/Unity en su categoría. Atacar un nicho nuevo: motores de **síntesis local de mundos** para WebXR, donde el peso de assets y la portabilidad importan más que la compatibilidad con pipelines tradicionales.

### Lo que se hizo

1. Análisis honesto de las ideas de las dos conversaciones previas: separar lo que sí funciona hoy (SDFs, Gaussian Splatting, WebGPU, ONNX local) de lo que es humo o research de 10 años (LLM en runtime, MPM físicas universales, "generar mundos desde concepto puro").
2. Decisión de arquitectura: **runtime 100% local, cero nube**. LLM solo en editor-time.
3. Decisión de stack: WebGPU + TypeScript + WGSL como bases inamovibles.
4. Decisión de nombre: **m13** para todo (research y producto interno). Nombre comercial futuro pendiente.
5. Roadmap de 6 fases drafted: phase 0 (proof) → 1 (lenguaje .m13) → 2 (detalle continuo) → 3 (neural local) → 4 (splatting híbrido) → 5 (WebXR Quest 3) → 6 (tiempo + Sabio Compositor).
6. Constitution.md redactada con principios no negociables.
7. Demo Fase 0 producido: single-file HTML con WebGPU + raymarching SDF de un cuarto, materiales procedurales, soft shadows, AO, audio reactivo desde micrófono. Pesa 25KB total.
8. Spec de Fase 1 drafted.

### Decisiones tomadas

- **D-001:** El runtime nunca depende de internet activo. La nube es para storage, no para compute.
- **D-002:** WebGPU es la única API gráfica. No WebGL, no Canvas2D, no nativo.
- **D-003:** YAML como formato `.m13` v0.1 (no JSON, no TOML).
- **D-004:** Tres.js NO entra al runtime — solo en editor para gizmos/debug.
- **D-005:** El idioma para BITACORA, comentarios internos y decisiones es español mexicano. APIs públicas y READMEs en inglés.
- **D-006:** Cada fase es un Spec Kit completo (spec + plan + tasks + implement).
- **D-007:** El demo Fase 0 incluye audio reactivo desde mic como experimento Sonido 13 literal — si no aporta, se quita en Fase 2.

### Pendientes para próxima sesión

- [ ] Owner corre el demo Fase 0 y reporta FPS + impresión estética + reacción al audio reactivo
- [ ] Crear repo `mechagato/neonodos` submódulo `motor-13` en GitHub
- [ ] Commit inicial con constitution.md, README.md, BITACORA, m13-phase0.html
- [ ] Resolver Open Questions del spec Fase 1 (OQ-1 a OQ-4)
- [ ] Generar `docs/plans/phase-1-plan.md` a partir del spec
- [ ] Decidir hosting del demo público (Vercel probable)
- [ ] Definir si el editor LLM corre client-side o server-side

### Open questions abiertas

- ¿Confirmar Vite como build tool del runtime, o evaluar esbuild puro?
- ¿Monorepo con pnpm workspaces o multi-repo? Inclinación: monorepo.
- ¿Licencia abierta desde el inicio o mantener privado hasta Fase 3?

### Reflexiones

La parte más sólida del proyecto es la **distribución de carga GPU compute + NPU + RAM caché** que evita el cuello de botella de memory bandwidth de los engines tradicionales. Esa es la tesis técnica defendible.

La parte más arriesgada — y más interesante — es la subdivisión microtonal del detalle visual. Puede no producir nada perceptual, o puede generar una firma estética única. Apostamos por descubrirlo en Fase 2.

El audio reactivo en Fase 0 es un guiño literal a Carrillo. Si Gato lo usa con música y siente algo, esa rama se profundiza en Fase 6 (Sabio Compositor / escenas temporales).

---

## Entrada 002 · 2026-05-21 · Bootstrap aterrizado en Cerebro4 + plan Fase 1

**Duración:** ~1 sesión Claude Code en Cerebro4
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Gato bajó el bootstrap tar.gz a `NeoNodos_System/m13/`, pidió arrancar el proyecto siguiendo los 4 prompts del workflow Spec Kit (read+validate → plan → tasks → implement). Esta sesión cubre Prompt #1 (lectura+validación) y Prompt #2 (generación del plan).

### Lo que se hizo

1. Extracción del bootstrap (`tar --strip-components=1`) directamente en `m13/`.
2. `git init -b main` local + commit inicial `a34095e — feat: m13 v0.1.0 bootstrap`.
3. Lectura completa de `CLAUDE.md`, `constitution.md`, `docs/spec/phase-1-spec.md`, `BITACORA_MOTOR13.md`, `GETTING_STARTED.md`, `README.md`.
4. `pnpm install` ✅ (11s, 15 paquetes, pnpm 9.15.9, node 22, TS 5.9.3).
5. `pnpm typecheck` ❌ inicial: 1 error en `@m13/synth` (falta `@webgpu/types` en devDeps) + 2 errores en `@m13/runtime` por TS 5.9+ más estricto que la versión asumida por el bootstrap.
6. `pnpm dev` ✅ — Vite ready 315ms en `http://localhost:5173/`, transformación de runtime/synth/examples OK, scene .m13 servida 200 OK.
7. **Chore T-000 — Fix typecheck baseline:**
   - Agregar `@webgpu/types` a `packages/synth/package.json` devDependencies.
   - Quitar `type Concept` no usado de `packages/runtime/src/compiler/index.ts` (noUnusedLocals).
   - Tipar explícitamente `data: Uint8Array<ArrayBuffer> | null` y construir con `new Uint8Array(new ArrayBuffer(N))` en `packages/runtime/src/audio/mic-input.ts` para TS 5.7+ generic Uint8Array.
   - `pnpm install` + `pnpm typecheck` → todo limpio. `pnpm dev` sigue arrancando OK.
8. Audit read-only del código existente: parser/compiler/renderer/camera/audio/shaders/8 conceptos/4 escenas todo funcional — el bootstrap entregó un esqueleto sólido.
9. **Plan Fase 1 generado** en `docs/plans/phase-1-plan.md` (~600 líneas):
   - 8 deliverables D-1..D-8, 53 componentes técnicos C-XXX, 104-148h estimado
   - Camino crítico identificado, paralelización marcada para subagent-driven-development
   - 10 riesgos (5 del spec + 5 nuevos: R6..R10), 10 decisiones nuevas D-100..D-110
   - Open Questions OQ-1..OQ-4 del spec resueltas con inclinaciones del Constitution
   - Scope-cutting options priorizadas por si la fase amenaza deadline

### Decisiones tomadas

- **D-008:** TypeScript 5.9.3 es el baseline del runtime y synth. El bootstrap asumía 5.4 pero no había razón fuerte para pinear hacia atrás — los 2 errores se corrigieron forward-compatible.
- **D-009:** `git init` quedó dentro de `NeoNodos_System/m13/` (repo anidado del monorepo neonodos-core). Pendiente decidir si subir como repo independiente `mechagato/motor-13` o convivir como subcarpeta.
- **D-100 a D-110:** ver `docs/plans/phase-1-plan.md` §10.

### Lo que tronó

- TS 5.9.3 instalado por pnpm (semver `^5.4.5` lo permite) trajo 2 errores que el bootstrap original no veía. Se arreglaron sin pinear TS hacia atrás.
- Si pnpm en futuro instala TS más nuevo con más reglas estrictas, podría volver a romper. Mitigación documentada en R7 del plan.

### Pendientes para próxima sesión

- [ ] Gato aprueba el plan tal cual o pide modificaciones (sección §12 del plan)
- [ ] Si aprueba: ejecutar Prompt #3 — generar `docs/tasks/phase-1-tasks.md`
- [ ] Decidir si subir como repo independiente o mantener anidado
- [ ] Validación visual de las 4 escenas bootstrap en sesión interactiva (decision gate del spec §12, items 1-2)
- [ ] Hosting: comprar/configurar subdomain `m13.neonodos.com` (no urgente, primero D-4)

### Open questions abiertas

- ¿Repo independiente o subcarpeta de `mechagato/neonodos`? El Constitution dice `mechagato/neonodos/motor-13`, lo que sugiere submódulo o subcarpeta. Confirmar con Gato.
- ¿Test Quest 3 sí o no en Fase 1? NFR-7 lo requiere; si Gato no tiene el Quest disponible, mover a Fase 5.

### Reflexiones

El bootstrap está mejor de lo que esperaba — el compiler ya hace generación dinámica de WGSL deterministic-ish (falta C-204 para garantizarlo), el renderer ya tiene UNIFORM_BYTES correcto, el FlyCamera ya tiene bounds, el audio ya está conectado. Esto significa que la Fase 1 NO es "construir desde cero" sino **completar la spec** (D-1) + **multiplicar la librería** (D-3) + **agregar el editor** (D-4). El editor es el componente más pesado y más nuevo — 35% del esfuerzo total — y donde más riesgo hay (R10).

Si Gato aprueba el plan, recomiendo arrancar Prompt #3 con orden de tasks: spec formal primero (D-1), luego tests del runtime (D-2 parser/compiler), luego conceptos faltantes (D-3) en paralelo con escenas (D-5), después editor (D-4) que ya depende de todo lo anterior, y cierre con benchmark+demo+docs (D-6, D-7, D-8).

---

## Entrada 003 · 2026-05-21 · Tasks Fase 1 + D-1 cluster ejecutado

**Duración:** continuación de la sesión de Entrada 002
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Gato aprobó el plan Fase 1 y pidió arrancar Prompt #3 sin detenernos ("tu decide con lo mejor"). Esta entrada cubre la generación del task breakdown completo y la ejecución del primer cluster (D-1 — spec formal `.m13 v0.1`).

### Lo que se hizo

**Prompt #3 — task breakdown:**
1. Generado `docs/tasks/phase-1-tasks.md` con 78 tasks (T-000..T-078), ordenadas por camino crítico, con dependencias, complejidad 30-90 min cada una, etiquetas BLOQUEADOR/PARALELIZABLE/OPCIONAL/INFRA.
2. Mapa de dependencias y orden sugerido por semana (6 semanas en lugar de 5 del spec original).

**Decisiones operativas en autonomía (Gato dijo "no detenernos"):**
- **D-201:** Repo m13 queda anidado en `neonodos-core/NeoNodos_System/m13/` por ahora. Repo independiente `mechagato/motor-13` se decide al cerrar Fase 3 (alineado con Constitution §8.4 sobre licenciamiento).
- **D-202:** Subdominio `motor13.neonodos.com` se configura cuando llegue T-059 (deploy de demo público), no antes.
- **D-203:** Quest 3 confirmado disponible (Gato avisa mid-sesión) → T-061 mantiene Quest 3 test dentro del MVP Fase 1, no diferido a Fase 5.

**Cluster D-1 ejecutado (T-001..T-006):**

- **T-001..T-004:** Spec formal `m13-spec/v0.1.md` escrita (596 líneas, 13 secciones). Cubre: identidad, schema raíz, primitivos, conceptos (catálogo de 14 con categorías), superficies, objetos + animaciones, ambiente/luz/window, determinismo, validación pipeline, política de extensión y versionado, 3 ejemplos positivos (minimal/intermedio/templo_mexica), 3 contraejemplos (versión inválida, concepto inexistente, tipos rotos), apéndices con glosario y referencias cruzadas.
- **T-005:** Generador `tools/gen-json-schema.ts` con `zod-to-json-schema`. Script `pnpm gen:schema` produce `m13-spec/v0.1.schema.json` (6.90 KB, 277 líneas, draft-07). **Verificado determinista**: dos corridas consecutivas → diff zero.
- **T-006:** Parser actualizado:
  - Constante `SUPPORTED_VERSION = '0.1'` exportada.
  - Validación early: si `version !== '0.1'` → error claro `m13 v0.2 no soportado por este runtime`.
  - Warnings para campos desconocidos en el nivel raíz vs whitelist (`KNOWN_ROOT_KEYS`).
  - Tipo `ParseOptions { silent?: boolean }` para suprimir warnings cuando se requiera.
  - Smoke test 4/4 pass: versión inválida, campos extra (warning, no error), válido limpio (sin warnings), YAML estructural roto.

**Verificaciones:**
- `pnpm typecheck` ✅ limpio en 3 packages tras cada cambio.
- `pnpm dev` ✅ Vite ready 255ms, sigue sirviendo el demo.
- `pnpm gen:schema` ✅ determinista.

### Decisiones tomadas

- **D-201..D-203:** ver arriba.
- **D-204:** El JSON Schema usa `$refStrategy: 'root'` y `target: 'jsonSchema7'`. Es el formato que el editor LLM va a inyectar como contexto del prompt sistema (T-051).
- **D-205:** El parser separa validación de versión (early, error fuerte) de validación de schema (Zod, errores agregados) de política de extensión (warning, no fatal). Tres capas independientes.

### Lo que tronó

Nada estructural. Un solo tropezón menor: el package.json se modificó dos veces seguidas (zod-to-json-schema install + script gen:schema), tuve que releerlo entre Edits. Sin impacto.

### Pendientes para próxima sesión (siguiente cluster D-2)

- [ ] T-007 setup Vitest + coverage v8 ([BLOQUEADOR] del cluster D-2)
- [ ] T-008..T-012 tests parser + compiler + determinismo
- [ ] T-013 caché de shaders por hash
- [ ] T-014..T-016 benchmark compile-time + bundle size budget
- [ ] T-017 Concept interface extendida con `paramsSchema` (BLOQUEADOR del cluster D-3)

### Reflexiones

El cluster D-1 cerró rápido porque la mayoría es documentación + un generador trivial. La parte interesante del parser (warnings + version) es 50 líneas pero abre la puerta a la política de extensión completa. El JSON Schema de 6.9 KB es lo bastante chico para incluir en el contexto del LLM editor sin saturar el prompt (presupuesto T-051: <4000 tokens totales).

D-1 valida que el bootstrap original ya tenía el schema correctísimo — la spec formal es básicamente "explicar bonito lo que el código ya hace". Los siguientes clusters (D-2 runtime tests, D-3 conceptos) son donde empieza la implementación real. Mi recomendación: arrancar D-2 con T-007 (vitest) en la próxima sesión.

---

## Entrada 004 · 2026-05-21 · T-007 Vitest setup

**Duración:** sesión corta (~15 min Claude)
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Gato pidió arrancar T-007 (primer task del cluster D-2: runtime tests + extensión). Setup de Vitest + coverage v8 en el monorepo, baseline para que T-008..T-012 puedan escribir tests reales.

### Lo que se hizo

1. Intento inicial con `pnpm add -D vitest @vitest/coverage-v8` instaló v4.1.7 — peer dep warning porque Vitest 4 requiere Vite ≥6 y el proyecto está en Vite 5.4.21.
2. Downgrade a `vitest@^3.0.0` + `@vitest/coverage-v8@^3.0.0` (resolvió a 3.2.4) — compatibilidad limpia con Vite 5.
3. Creado `vitest.config.ts` en root con:
   - `include`: `packages/**/src/**/*.test.ts` y `packages/**/__tests__/**/*.test.ts` (cubre las convenciones del plan).
   - `passWithNoTests: true` para no romper CI antes de que existan tests.
   - Coverage v8: providers text/html/lcov, salida en `./coverage`, incluye runtime+synth, excluye tests/index/types.
   - Thresholds permisivos (0%) en T-007; D-2 (T-008..T-012) los subirá a 70%+ en parser y compiler.
4. Scripts en root: `test`, `test:watch`, `test:coverage`.
5. Scripts en `@m13/runtime`: `test`, `test:coverage` con `--root ../.. --dir packages/runtime` para filtrar.
6. `.gitignore` ya tenía `coverage/` listado — no se commitean los reportes generados.

### Verificaciones

- ✅ `pnpm test` → "No test files found, exiting with code 0" (passWithNoTests funciona).
- ✅ `pnpm test:coverage` → genera `coverage/index.html` (7.7 KB) + lcov.info + reportes por package. 0% coverage por ahora (esperado, sin tests).
- ✅ `pnpm typecheck` limpio.
- ✅ `pnpm dev` arranca Vite ready 281ms.

### Decisiones tomadas

- **D-301:** Pinear Vitest a v3.x (`^3.0.0`) hasta que upgrade a Vite 6 en alguna fase futura. Vitest 4 requiere Vite ≥6.
- **D-302:** Una sola `vitest.config.ts` en root (no per-package). Razón: KISS para monorepo chico; si crece, refactorizar a workspace mode después.
- **D-303:** Thresholds de coverage en 0% al inicio. T-008..T-012 los suben a parser/compiler ≥70% combinado, según NFR-6 del spec.

### Lo que tronó

Peer dep mismatch con vitest@4 vs vite@5 — atrapado y resuelto pre-commit. No llegó al typecheck/test fallido.

### Pendientes para próxima sesión (D-2 continúa)

- [ ] T-008 tests parser válidos (escena minimal, completa, defaults)
- [ ] T-009 tests parser errores (con path y mensaje)
- [ ] T-010 tests compiler (WGSL contiene fn esperadas)
- [ ] T-011 determinismo compiler (ordenar conceptsUsed + floats fijos)
- [ ] T-012 tests determinismo (100 corridas mismo SHA-256)

### Reflexiones

T-007 fue ejecutado en menos de los 45 min estimados. El peer dep de Vitest fue el único pelo en la sopa. Ahora hay baseline para escribir tests reales — los siguientes 5 tasks del cluster D-2 son los que de verdad mueven la calidad del runtime.

---

## Entrada 005 · 2026-05-21 · T-008 Tests parser válidos

**Duración:** sesión muy corta (~10 min Claude)
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Continuación del cluster D-2 tras T-007 (vitest baseline). T-008 escribe los primeros tests reales del parser, cubriendo casos válidos: minimal, completa, defaults, formas de material, scale, animate, silent option.

### Lo que se hizo

- Creado `packages/runtime/src/parser/__tests__/parser-valid.test.ts` con **11 tests** (excede los 6+ requeridos por la task):
  1. escena minimal aplica defaults
  2. defaults completos de `ambient`
  3. defaults completos de `light`
  4. escena completa con todos los campos opcionales
  5. material como string corto vs objeto extendido (equivalencia datos)
  6. scale como número uniforme vs vec3
  7. animate + audio_reactive
  8. campos opcionales no proporcionados quedan `undefined` / default
  9. `validateScene` acepta objeto JS directo (sin YAML)
  10. opción `{silent: true}` suprime warning
  11. sin silent, campo desconocido al root emite warning con path

- Spy de `console.warn` aislado por test con `beforeEach/afterEach`.
- Test runs: 11 passed, 0 failed, 572ms total (43ms para los tests, resto es setup de Vitest).

### Verificaciones

- ✅ `pnpm test` → **11/11 pass**.
- ✅ Coverage parser: **100% líneas / 100% branches / 100% funciones / 100% statements** (excede el ≥50% requerido por T-008 y ya cumple el ≥85% que pedía T-009 combinado).
- ✅ `pnpm typecheck` limpio (tests excluidos por tsconfig.base `**/*.test.ts`).
- ⚠️ T-009 (tests parser errores) sigue pendiente — aunque coverage ya está en 100%, los tests negativos validan el FORMATO de los mensajes de error, no sólo que las líneas se ejecuten. Sigue siendo valioso ejecutarlos.

### Decisiones tomadas

- **D-401:** Tests del parser se organizan en archivos por intención: `parser-valid.test.ts` (felices), `parser-errors.test.ts` (T-009). Razón: facilita lectura y permite correr selectivamente.
- **D-402:** Usamos `vi.spyOn(console, 'warn')` en lugar de `console.warn = jest.fn()` style. Es el patrón Vitest canónico, ya con restore automático con `mockRestore()`.

### Lo que tronó

Nada. Test run limpio en la primera corrida.

### Pendientes para próxima sesión (D-2 sigue)

- [ ] T-009 tests parser errores (versión inválida, tipos rotos, YAML inválido, mensajes con path)
- [ ] T-010 tests compiler output (WGSL contiene `fn map`, `fn material`, `fn mat_<id>`)
- [ ] T-011 determinismo formal del compiler (orden + floats fijos)
- [ ] T-012 determinismo en 100 corridas mismo SHA-256

### Reflexiones

T-008 cayó en mucho menos tiempo que el estimado (60 min → ~10 min). Cubrir 100% del parser con 11 tests sugiere que el parser está sano y bien tipado. La parte "lenta" de los siguientes tasks va a ser el compiler (más rama, más estado) y el setup de determinismo (T-011 requiere refactor del codegen para floats fijos + sort).

---

## Entrada 006 · 2026-05-21 · T-009 Tests parser errores

**Duración:** ~8 min Claude
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Cluster D-2 sigue avanzando. Tras T-008 (11 tests felices, parser 100% coverage), T-009 cubre los errores: YAML roto, versionado, schema, mensajes con path.

### Lo que se hizo

Creado `packages/runtime/src/parser/__tests__/parser-errors.test.ts` con **13 tests** (>6 requeridos):

1. YAML sintácticamente inválido → prefijo `[m13/parser] YAML inválido`
2. `version: "0.2"` → mensaje específico con la versión
3. `version: "1.0"` → mismo formato con número distinto
4. `name` faltante → error con path `name`
5. `walls` faltante → path `walls`
6. `bounds: [1, 2]` (solo 2 elementos) → path `bounds`
7. `objects[0]` sin `position` → path `objects.0.position`
8. `kind: tetraedro_inventado` (fuera de enum) → path `objects.0.kind`
9. `light.intensity: "muy fuerte"` (string en vez de número) → path `light.intensity`
10. `animate.mode: girar_estilo_libre` → path `objects.0.animate.mode`
11. Múltiples errores reportados juntos con bullets `· path — message`
12. `validateScene` rechaza objeto JS directo sin pasar por YAML
13. `validateScene(null)` no crashea, lanza error de schema

### Verificaciones

- ✅ `pnpm test` → **24/24 pass** (11 T-008 + 13 T-009), 568ms.
- ✅ Coverage parser: **100% mantenido** (líneas/branches/funciones/statements).
- ✅ `pnpm typecheck` limpio.

### Decisiones tomadas

- **D-501:** Tests con `expect(() => parseScene(yaml)).toThrow(/regex/)` para validación rápida del mensaje. Tests con `try/catch + expect(msg).toMatch()` cuando se valida estructura del mensaje (múltiples paths).
- **D-502:** No se testea "concept inexistente al material" porque eso es responsabilidad del **compiler**, no del parser. La task original lo mencionaba — se ajusta a la realidad del código y se documentará en el test del compiler (T-010).
- **D-503:** No se testea `intensity` negativa porque el schema NO tiene `min(0)` — un `intensity: -1` es VÁLIDO. Sería un cambio de schema, no de tests. Si Gato quiere restringir, abrir issue para v0.2.

### Lo que tronó

Nada. 13/13 en la primera corrida. Los path assertions con regex (`objects\.0\.position`) requirieron escape correcto del punto — atrapado al escribir, no en runtime.

### Pendientes para próxima sesión

- [ ] T-010 tests compiler output (verificar fn map, fn material, fn mat_<id>, conceptsUsed)
- [ ] T-011 determinismo formal del compiler (sort + floats fijos)
- [ ] T-012 determinismo 100 corridas SHA-256

### Reflexiones

T-009 confirmó tres cosas: (1) el parser cumple su contrato — todos los errores tienen path y prefijo. (2) la separación versión-antes-de-Zod del T-006 funciona porque los tests de versionado pasan limpios. (3) el agregador de bullets `· path — message` es legible para humanos y greppable por tests.

Con 24 tests verdes y parser 100% cubierto, el cluster D-2 puede pasar al compiler con confianza de que el upstream está sólido.

---

## Entrada 007 · 2026-05-21 · T-010 Tests compiler output

**Duración:** ~15 min Claude (con fix de config en medio)
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Tercer task del cluster D-2. Después de 24 tests de parser, ahora se cubre el compiler con 12 tests que ejercen las 4 escenas reales del demo y validan el codegen WGSL.

### Lo que se hizo

**Tests del compiler** — `packages/runtime/src/compiler/__tests__/compiler-output.test.ts` con 12 tests:

1. `sala_basica`: 5 conceptos referenciados + fn map/material/vs/fs presentes
2. `galeria_minimal`: dedup de conceptos compartidos (yeso ceiling/walls = 1 fn)
3. `loft_industrial`: 6 conceptos únicos incluyendo cuero_vintage
4. `templo_mexica`: solo 2 conceptos únicos pese a 6 referencias
5. `concepto inexistente` → error `[m13/compiler] Concepto desconocido: "pared_inventada"` (el caso que NO podía testear el parser)
6. window cut: WGSL incluye `opSub(room, windowCut)` para sala_basica
7. animate bob: WGSL incluye `sin(u.time * 2.5) * 0.3`
8. audio_reactive: WGSL inyecta `u.audioAmp`
9. escena sin objects: map() solo el cuarto, sin `let obj0 =`
10. bloques canónicos: struct Uniforms, sdBox, fbm, raymarch, calcNormal, softShadow, calcAO, shade
11. WGSL > 4 KB en escena con varios conceptos
12. cobertura de los 5 `kind` primitivos (sphere/box/round_box/cylinder/torus) — para llegar al 100% del compiler

**Fixes de configuración:**

- **`vitest.config.ts`**: el exclude original `**/index.ts` eliminaba archivos de lógica real (parser/index.ts, compiler/index.ts) del reporte. Se afina a sólo barrel exports top-level (`packages/runtime/src/index.ts`, `packages/synth/src/index.ts`).
- **`packages/runtime/tsconfig.json`** y **`packages/synth/tsconfig.json`**: agregar `**/*.test.ts` y `**/__tests__/**` al `exclude` porque el override perdía la exclusión heredada del base. Sin esto, tsc trataba de typechear los tests (que importan `node:fs` etc. sin tipos de node).

### Verificaciones

- ✅ `pnpm test` → **36/36 pass** (24 parser + 12 compiler), 728ms total.
- ✅ Coverage compiler: **100% líneas / 96.42% branches / 100% funciones / 100% statements** (excede el >50% de T-010 y el >70% combinado de T-012).
- ✅ Parser sigue **100%** en todas las dimensiones.
- ✅ `pnpm typecheck` limpio en los 3 packages tras los fixes de tsconfig.

### Decisiones tomadas

- **D-601:** Tests cargan archivos `.m13` reales del demo vía `readFileSync` desde `packages/examples/public/scenes/`. Razón: testear los snapshots reales que el demo usa, no fixtures sintéticos. Path resuelto con `import.meta.url` + `fileURLToPath`.
- **D-602:** El tsconfig de cada package debe heredar el exclude del base — si lo override, debe re-incluir `**/*.test.ts` y `**/__tests__/**`. Es una regla del monorepo que se aplicará en futuros packages (editor en D-4).
- **D-603:** El exclude de coverage en vitest.config.ts es más quirúrgico ahora: solo barrel exports top-level (que son re-exports puros). Per-directory index.ts (parser/index.ts, compiler/index.ts) que tienen lógica real SÍ se miden.

### Lo que tronó

Dos cosas atrapadas y arregladas mid-task:
1. Coverage del compiler salía como excluida (cero archivos en el reporte) porque mi exclude del config era demasiado amplio (`**/index.ts`).
2. Typecheck se rompió tras agregar el test que importa `node:fs/url/path` — el tsconfig del runtime estaba override-eando el exclude del base. Fix mecánico.

Ninguno llegó al commit final.

### Pendientes para próxima sesión (cierre del cluster D-2)

- [ ] T-011 determinismo formal del compiler (sort conceptsUsed + floats con `.toFixed(6)` o equivalente)
- [ ] T-012 test SHA-256 estable en 100 corridas
- [ ] T-013 caché de shaders en engine
- [ ] T-014..T-016 benchmark + bundle size

### Reflexiones

Llegamos a **100% del compiler con 12 tests** mientras los esperaba en 70%. El compiler resultó más "atestable" de lo que parecía — la naturaleza determinista del codegen ayuda. Las ramas no cubiertas (la única era `kind: box`) son fáciles de cazar con un test adicional.

Los tests cargan escenas REALES (.m13 del demo) en lugar de fixtures sintéticos. Esto significa que cualquier regresión en `parseScene`/`compileScene` que rompa el demo, se detecta en los tests. Adicionalmente, si Gato edita una escena del demo y rompe el contrato, el test fallará — un safety net útil.

Cluster D-2 lleva 36 tests verdes y los dos archivos centrales (parser, compiler) en 100% / 100%. Falta determinismo (T-011/T-012) y luego caché/bench/bundle. Aún ágil.

---

## Entrada 008 · 2026-05-21 · T-011 Compiler determinism + bug fix

**Duración:** ~12 min Claude
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

T-011 es el [BLOQUEADOR] del cluster D-2: hace el compiler determinista byte-por-byte para que T-012 (test 100 corridas mismo SHA-256) y T-013 (caché de shaders por hash) puedan funcionar. Cambio quirúrgico en `packages/runtime/src/compiler/index.ts`.

### Lo que se hizo

**Refactor `compiler/index.ts`:**

1. **Helper `f(n: number): string`** — formatea todo número como literal float WGSL con 6 decimales fijos. Reemplaza ruido tipo `0.300000000004` por `0.300000` estable.
2. **`collectConceptIds()` ordenado lexicográficamente** con `[...set].sort()`. Antes dependía del orden de inserción al Set (walls/floor/ceiling/objects). Ahora `marmol < metal < pared < piedra` siempre.
3. **`generateMapFunction`**: `bx/by/bz` del bound, `wx/wy/wz` + `sx/sy/sz` del window — todos vía `f()`.
4. **`generateObjectSdf`**: `px/py/pz` posición, `sx/sy/sz` escala, `r` radio, `speed` y `amplitude` de animate — todos vía `f()`.
5. **`generateMaterialFunction`**: `by * 0.83` threshold del piso, `px/py/pz` y `r = scale * 1.4` por objeto — todos vía `f()`.
6. **Refactor del yOffset**: ahora se construye con array `yOffsetParts` que se joinea con `' + '`. Funciona en las 4 combinaciones (sin nada, bob solo, audio solo, bob+audio).

**Bug fix pre-existente atrapado y corregido:**

- Antes: para esfera NO audio-reactiva, output era `sdSphere(..., 0.45 0.0)` — dos floats con espacio sin operador → **WGSL inválido**. Probablemente fallaba silenciosamente al cargar la galería (la esfera no animada `escultura_esfera`).
- Después: default de `extraR` cambió de `'0.0'` a `'+ 0.0'` → output `sdSphere(..., 0.450000 + 0.0)` → válido y semánticamente idéntico al deseado.
- Verificado en `galeria_minimal` que la esfera ahora compila correctamente.

**Test ajustado (T-010):**

- Una assertion que verificaba `sin(u.time * 2.5) * 0.3` ahora valida `sin(u.time * 2.500000) * 0.300000` (formato determinista).

### Verificaciones

- ✅ `pnpm test` → **36/36 pass** (24 parser + 12 compiler).
- ✅ Smoke de determinismo manual: 10 compileScene de `sala_basica.m13` → **1 hash SHA-256 único** (`247dd359...`). Confirma que T-011 cumple su contrato.
- ✅ `pnpm typecheck` limpio.
- ✅ `pnpm dev` Vite ready 259ms.
- ✅ Inspección visual del WGSL de `galeria_minimal.m13` muestra `0.450000 + 0.0` en lugar del antiguo `0.45 0.0` roto.

### Decisiones tomadas

- **D-701:** `n.toFixed(6)` es el formato canónico para todos los float WGSL generados por el compiler. 6 decimales suficiente para precisión perceptual + estabilidad ante ruido binario de IEEE 754.
- **D-702:** Floats hardcodeados en el codegen (audio constants `0.05`, `0.1`, AO radius `0.05` del roundbox) se dejan como literales — son código fuente, no datos dinámicos. Su determinismo viene de que están en el código TS estático.
- **D-703:** El bug de la esfera no-audio-reactiva era PRE-EXISTENTE del bootstrap. Se documenta como fix incidental (no inventado por T-011). Ahora la galería renderea su `escultura_esfera` correctamente.
- **D-704:** Refactor del `yOffset` a array+join elimina la duplicación del case "bob + audio" donde se hacía `${yOffset} + u.audioAmp * 0.1` con string concat manual. La nueva forma es más legible y a prueba de futuros modes (rotate, pulse).

### Lo que tronó

Un solo test rompió como esperado (la regex literal de `2.5` y `0.3` antes del `.toFixed(6)`). Se actualizó la regex a la versión determinista. Comportamiento esperado del refactor — no es un "rompimiento" real, es contrato actualizado.

### Pendientes para próxima sesión

- [ ] T-012 test compiler determinismo 100 corridas (paralelizable, ya tengo el patrón del smoke manual)
- [ ] T-013 caché de shaders en M13Engine por hash SHA-256 (depende de T-012)
- [ ] T-014 benchmark compile-time
- [ ] T-015/T-016 bundle size budget

### Reflexiones

T-011 cayó rápido porque el codegen era pequeño. El bug del `extraR = '0.0'` fue una sorpresa agradable — lo encontré porque al planear el refactor inspeccioné el output con un script efímero. Si no hubiese hecho esa inspección, habría aplicado `f()` mecánicamente y el bug habría sobrevivido (porque `f(0.0)` = `'0.000000'`, sigue siendo dos floats sin operador entre).

Moraleja para futuros refactors del compiler: **siempre inspeccionar el output WGSL antes y después del cambio**, no solo confiar en que los tests pasen. Los tests actuales validan presencia de substrings, no validez sintáctica de WGSL.

La opción T-073 del task breakdown (snapshot tests visuales con Playwright) ahora suena mejor porque atraparía bugs como éste — el shader inválido haría que el render falle. Para Fase 1 sigue siendo OPCIONAL pero subo su prioridad.

---

## Entrada 009 · 2026-05-21 · T-012 Test determinismo SHA-256

**Duración:** ~5 min Claude
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Test formal del contrato de determinismo implementado por T-011. Cierra el cluster de tests del compiler (T-010 estructura + T-011 implementación + T-012 verificación).

### Lo que se hizo

Nuevo archivo `packages/runtime/src/compiler/__tests__/compiler-determinism.test.ts` con **7 tests**:

1. **100 corridas de `sala_basica` → 1 hash SHA-256 único** (377ms total = 3.77ms por compile).
2. **100 corridas × 4 escenas demo → 1 hash único por escena** (4 hashes distintos entre escenas, 1 hash estable dentro de cada una). 400 compilaciones en 714ms.
3. **Control negativo:** las 4 escenas distintas producen 4 hashes distintos (no colisiones).
4. **`conceptsUsed` siempre ordenado lexicográficamente** en 20 corridas — valida el `.sort()` del T-011.
5. **Floats con 6 decimales fijos**, sin ruido IEEE 754 (verifica que `0.1` no se escapa como `0.10000000000000001`).
6. **Pureza funcional**: dos YAMLs con whitespace/comments distintos pero schema equivalente → mismo hash. Confirma que parser+compiler no son sensibles a presentación.
7. **Test DOCUMENTAL**: orden de `objects[]` SÍ afecta el output. Si el autor reordena el array, el shader cambia (índices `obj0..objN` se reasignan). Decisión consciente — si se quiere ortogonalidad sobre orden, abrir issue para v0.2.

### Verificaciones

- ✅ `pnpm test` → **43/43 pass** (24 parser + 12 compiler-output + 7 determinismo). Duración 1.83s.
- ✅ Coverage compiler: **100% líneas / 96.96% branches / 100% funciones** (subió ligeramente desde 96.42% de branches por las nuevas rutas que ejercitan los tests).
- ✅ Parser sigue 100%.
- ✅ `pnpm typecheck` limpio.

### Decisiones tomadas

- **D-801:** Tests usan `node:crypto.createHash('sha256')` para hash. Misma librería que usará M13Engine en T-013 (caché de pipelines) — consistencia entre test y producción.
- **D-802:** Iteraciones por test: 100 según el spec/plan. Performance lo permite (~4ms por compile en Cerebro4). No necesario reducir.
- **D-803:** Documentamos explícitamente que `objects[]` order matters (test #7). Es una garantía intencional: el autor controla la asignación de índices `obj<N>` y el orden en `opUnion`. Si se quisiera ortogonalidad, sería un cambio del compiler (sort por `id`) en v0.2.
- **D-804:** Helper `hashWgsl(yamlText)` privado del test file. No exportamos al runtime porque T-013 lo hará de manera más integrada con la API del engine.

### Lo que tronó

Nada. Tests verdes a la primera. El smoke manual previo (en T-011) ya había validado el patrón — los tests son su contraparte formal.

### Pendientes para próxima sesión

- [ ] T-013 caché de shaders en M13Engine por hash SHA-256 (depende directamente de T-012)
- [ ] T-014 benchmark compile-time: 50 objetos en <200ms (ya tenemos métrica preliminar de 3.77ms por compile pequeño)
- [ ] T-015/T-016 bundle size budget
- [ ] T-017 [BLOQUEADOR] extender Concept interface con paramsSchema (abre D-3)

### Reflexiones

T-012 cayó en 5 minutos porque T-011 ya había hecho el trabajo duro (sort + toFixed). Esto valida la cadena del plan: T-010 expone la estructura, T-011 garantiza el contrato, T-012 lo blinda con tests automatizados.

Performance secundaria: **3.77ms por compileScene en escena de 2 objects (sala_basica)**. Si esto escala linealmente con número de objetos, una escena de 50 objects estaría en ~100ms — dentro del budget de 200ms del T-014/spec H1.3. Pero la métrica real la mediremos en T-014 con un benchmark dedicado.

Coverage del compiler subió de 96.42% a **96.96% de branches** porque el test #7 (yaml con vs sin objects[] reverse) ejercita rutas con múltiples objetos en orden distinto. Cerca del 100% conceptual. Las ramas restantes (3.04%) probablemente son del switch-case sin fallthrough — irrelevante a efectos prácticos.

Cluster D-2 puede ahora avanzar al lado runtime/engine (T-013 caché). El compiler está listo para conectarse al pipeline con confianza.

---

## Entrada 010 · 2026-05-21 · T-013 Shader pipeline cache

**Duración:** ~12 min Claude
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Con determinismo blindado (T-011/T-012), ahora se puede aprovechar el contrato: misma escena → mismo WGSL → mismo hash → reuso del pipeline GPU. T-013 implementa el caché en `M13Engine.loadScene` para evitar el costo de `initRenderer` (incluye `createShaderModule` + `createRenderPipeline`, dominantes del re-load).

### Lo que se hizo

**1. Helper `hashWgsl` en compiler (cross-platform):**

```ts
export async function hashWgsl(wgsl: string): Promise<string> {
  const buf = new TextEncoder().encode(wgsl);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

Funciona en navegador (Web Crypto API) y Node 15+ (`crypto.subtle` global). Hex de 64 chars.

**2. Cache en `M13Engine.loadScene`:**

- Nuevo campo privado `lastWgslHash: string | null`.
- Nuevo campo privado `lastLoadInfo: SceneLoadInfo | null` (diagnóstico).
- Tras `compileScene`, computa `hashWgsl(compiled.wgsl)`. Si coincide con `lastWgslHash` y ya hay renderer, **skip `initRenderer`** y mantén `this.renderer` previo.
- API pública para diagnóstico:
  - `getWgslHash(): string | null`
  - `getLastLoadInfo(): SceneLoadInfo | null` → `{ wgslHash, reusedPipeline }`

**3. Tests del cache:** `packages/runtime/src/__tests__/engine-cache.test.ts` con 6 tests:

1. Primera carga: cache miss, `initRenderer` llamado 1×.
2. Re-carga misma escena: cache hit, `initRenderer` NO llamado de nuevo.
3. Escena distinta tras una previa: cache miss, `initRenderer` 2×.
4. A → B → A: 3 init calls (cache solo retiene la ÚLTIMA, no LRU multi-entry).
5. 10 corridas misma escena: 1 init + 9 hits.
6. Estado inicial: `getWgslHash()` y `getLastLoadInfo()` null antes de loadScene.

Mockeo con `vi.mock('../renderer/index.js')` para no depender de WebGPU en Node tests. Mock retorna un `RendererState` stubed.

### Verificaciones

- ✅ `pnpm test` → **49/49 pass** (24 parser + 12 compiler-output + 7 determinism + 6 engine-cache). 1.95s total.
- ✅ Coverage:
  - parser 100%
  - compiler 100% líneas / 97.14% branches / 100% funciones
  - engine 36.42% (la lógica de loadScene + cache cubierta; el resto — start/stop/tick — requiere WebGPU real y se difiere a T-073 snapshots visuales)
- ✅ `pnpm typecheck` limpio.
- ✅ `pnpm dev` Vite ready 255ms.

### Decisiones tomadas

- **D-901:** Hash con Web Crypto API (`crypto.subtle.digest`) en lugar de `node:crypto`. Razón: cross-platform — funciona idéntico en navegador y Node 15+. El runtime distribuible no puede importar `node:` modules.
- **D-902:** Cache es **single-entry** (solo retiene la última escena). Razón: cumple el criterio del task ("si el hash coincide con el último cargado, reusa"). Multi-entry LRU sería overengineering para Fase 1 — la mayoría de cambios son edición incremental del mismo YAML, no flipping entre N escenas.
- **D-903:** Test del cache mockea el renderer al nivel de módulo con `vi.mock`. La canvas se pasa como `{} as HTMLCanvasElement` porque solo `initRenderer` (mocked) la usaría. El engine NO toca canvas en loadScene directamente.
- **D-904:** API de diagnóstico (`getWgslHash`, `getLastLoadInfo`) pública desde el barrel `@m13/runtime`. Útil para:
  - El editor (D-4) puede mostrar el hash en el HUD para debug.
  - Tests futuros (T-014 benchmark, snapshot visual).
  - Telemetría opcional del editor (D-104 / C-410).

### Lo que tronó

Nada. El mock funcionó a la primera. Los 6 tests pasaron sin retries.

### Pendientes para próxima sesión

- [ ] T-014 benchmark compile-time (script `tools/bench-compile.ts`)
- [ ] T-015 bundle config + size-limit setup
- [ ] T-016 validar bundle <100KB gzipped, ajustar si excede
- [ ] T-017 [BLOQUEADOR] extender Concept con paramsSchema (abre D-3)

### Reflexiones

T-013 fue cómodo porque las piezas estaban listas: determinismo del compiler (T-011), tests del hash (T-012), API async ya existente en loadScene. Cero refactor del flujo público.

El criterio "manual" del task original ("console.time < 5ms para compile pipeline") lo reemplacé por un test automatizado más fuerte: si `initRenderer` no se llama, el costo del pipeline rebuild es cero por construcción. Un test que valida la INTENCIÓN del cache es más robusto que medir un threshold de ms (que varía por hardware).

Coverage del engine quedó en 36% — la lógica de `loadScene` está cubierta pero `start()`, `stop()`, `tick()`, `attachFlyCamera()`, `attachAudioInput()` requieren WebGPU + canvas real. Esto se valida en T-073 (snapshot visuales con Playwright) cuando exista. Por ahora, los tests de unidad cubren la parte determinista del engine — la parte de hardware se valida visualmente en navegador.

Para diagnóstico en el browser, ahora se puede hacer:
```ts
await engine.loadScene(yaml);
console.log(engine.getLastLoadInfo()); // { wgslHash: '...', reusedPipeline: false }
await engine.loadScene(yaml);
console.log(engine.getLastLoadInfo()); // { wgslHash: '...', reusedPipeline: true }
```

Cluster D-2 lleva 49 tests verdes, runtime con caché, baseline sólida. Falta benchmark (T-014) y bundle (T-015/T-016). Luego abre D-3.

---

## Entrada 011 · 2026-05-21 · T-014 Benchmark compile-time

**Duración:** ~10 min Claude (con 2 fixes intermedios de resolución de módulos)
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Última pieza del runtime "saludable" antes de cerrar el cluster D-2: validar empíricamente la hipótesis H1.3 del spec — "el parser + compilador `.m13` → shader corre en <200ms para escenas de hasta 50 objetos". T-014 produce el script y mide.

### Lo que se hizo

**1. Script `tools/bench-compile.ts`:**

- Genera escena sintética con N objetos random (mulberry32 PRNG sembrado para reproducibilidad).
- Mix de los 5 kinds primitivos: sphere/box/round_box/cylinder/torus.
- Materiales aleatorios del pool de conceptos `object` + `universal`.
- ~20% audio_reactive, ~30% animate bob — distribución realista.
- 5 warmup runs (descarta JIT cold start) + N mediciones (default 20).
- Reporte: min / median / mean / p95 / max. Exit 0 si p95 < 200ms, 1 si excede.
- CLI args: `--objects N`, `--runs M`, `--warmup K`.

**2. Script `pnpm bench:compile`** en root package.json.

**3. Workaround de YAML lib:** el bench se ejecuta desde root donde `yaml` no está como dep. Como YAML 1.2 es superset estricto de JSON, uso `JSON.stringify(scene, null, 2)` para producir input válido para parseScene. Cero deps nuevas.

**4. Fix root package.json:** agregado `"type": "module"`. Sin esto, tsx interpretaba bench-compile.ts como CJS y fallaba al resolver `@m13/synth` (referenciado via cadena de imports desde compiler).

### Resultados — Cerebro4 (i7-12700K, Ubuntu Server)

**Default (50 objetos, 20 corridas, YAML 18.88 KB):**
```
min    12.68 ms
median 15.72 ms
mean   15.70 ms
p95    21.18 ms   ← objetivo <200 ms
max    21.18 ms
```

**Stress (100 objetos, 30 corridas, YAML 37.17 KB):**
```
min    25.66 ms
median 27.33 ms
mean   27.43 ms
p95    29.02 ms
max    32.67 ms
```

**Veredicto:** **~9.5× por debajo del budget de spec para 50 objetos**. Incluso al doblar a 100 objetos, p95 sigue ~7× bajo budget. **H1.3 validada con margen amplio.**

### Verificaciones

- ✅ `pnpm bench:compile` → ✅ DENTRO DEL BUDGET (p95=21.18ms vs budget 200ms).
- ✅ `pnpm bench:compile -- --objects 100 --runs 30` → ✅ p95=29.02ms.
- ✅ `pnpm gen:schema` sigue funcionando tras "type": "module" del root.
- ✅ `pnpm test` → **49/49 pass** (sin regresiones).
- ✅ `pnpm typecheck` limpio.
- ✅ `pnpm dev` Vite ready 250ms.

### Decisiones tomadas

- **D-1001:** El bench mide **parse + compile combinados**, no por separado. Razón: `M13Engine.loadScene` los llama secuencialmente. Esa es la operación que el usuario percibe como "carga de escena".
- **D-1002:** PRNG sembrado (`mulberry32` con seed 42) para que el bench sea reproducible entre corridas. Útil para comparar antes/después de refactors sin variar el input.
- **D-1003:** YAML output con `JSON.stringify` en lugar de instalar `yaml` como dep del root. Razón: KISS, y aprovecha que YAML 1.2 ⊇ JSON. Documentado en el script.
- **D-1004:** Root package.json es ahora `"type": "module"`. Razón: tsx requiere ESM para resolver workspace links de packages que son `"type": "module"` (caso de `@m13/synth`). El cambio NO afecta a otros packages (cada uno declara su propio `"type"`).
- **D-1005:** Threshold del budget en `BUDGET_MS = 200` en el script. Si excediera, exit 1 (CI-friendly). Por ahora 9.5× margen.

### Lo que tronó

Dos errores de resolución mid-task:
1. **CJS vs ESM**: tsx leía bench-compile.ts como CJS porque root package.json no tenía `"type": "module"`. Cadena `import { getConcept } from '@m13/synth'` (en compiler) fallaba con `ERR_PACKAGE_PATH_NOT_EXPORTED`. Fix: agregar `"type": "module"` al root.
2. **yaml lib missing at root**: tras fix 1, `import { stringify } from 'yaml'` falló porque la lib está en runtime/synth pero no en root. Fix: usar JSON.stringify (superset YAML).

Ambos atrapados en el mismo intento, fixes pequeños, ninguno llegó al commit.

### Pendientes para próxima sesión (cierre del cluster D-2)

- [ ] T-015 vite config para library build del runtime
- [ ] T-016 size-limit + validar <100KB gzipped
- [ ] T-017 [BLOQUEADOR] extender Concept con paramsSchema (abre D-3 conceptos)
- [ ] T-018..T-022 propagación de params + manifest

### Reflexiones

H1.3 validada con margen amplio. El compiler es ~10× más rápido que el budget, lo que da espacio para:
- Conceptos con WGSL más pesado (D-3 podría meter neural materials sin temer al budget de compile).
- Crecimiento del codegen (D-3 agrega `kind: concept` con WGSL adicional, params propagation, etc).
- Escenas más complejas (100 objetos siguen estando en <30ms, así que escenas residenciales/comerciales reales — típicamente <30 objetos — son triviales).

El sub-bench de **100 objetos en 27ms median** sugiere que el cuello de botella futuro probablemente no es el compile, sino el shader compile en GPU (que NO medimos aquí; eso es del browser/driver y no nuestro). Cuando lleguemos a Quest 3 (T-061), ese sí será un dato relevante.

Los dos errores de resolución que tropecé son útiles para futuros tools en `tools/`: cualquier script que use `@m13/<package>` desde root debe ser ESM (afortunadamente ya es default tras el fix). Documentado para futura yo / Gato.

Cluster D-2 está a un paso de cerrar — solo falta T-015/T-016 (bundle) y abrir D-3.

---

## Entrada 012 · 2026-05-21 · T-015 + T-016 Library build + bundle budget

**Duración:** ~10 min Claude
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Cierre del cluster D-2: producir un bundle distribuible del runtime y verificar el budget de tamaño del NFR-3 (<100KB gzipped). T-015 (build pipeline) y T-016 (validación) se ejecutan juntos porque la métrica del bundle resulta dentro del budget en el primer try — no hay "ajuste" que hacer.

### Lo que se hizo

**1. `packages/runtime/vite.config.ts`** — Vite library mode:
- Entry: `src/index.ts`
- Output: `dist/m13-runtime.js` (ESM único)
- Format: ES module, target es2022
- Minify: esbuild
- Source map: generado pero no contado en el budget
- Alias workspace: `@m13/synth` → ruta relativa al source (Vite no resuelve workspace symlinks automáticamente en lib mode fuera del root)
- Externals: **ninguno** — el bundle incluye `@m13/synth`, `yaml`, `zod` (decisión D-1101)

**2. Scripts en `runtime/package.json`:**
- `build`: ahora `vite build` (antes `tsc`)
- `build:types`: separado para emitir `.d.ts` cuando se necesite (Fase 2+ al publicar a npm)
- `size`: `size-limit` (nuevo)

**3. `size-limit` instalado** como devDep del runtime + `@size-limit/preset-small-lib`. Configuración en `runtime/package.json`:
```json
"size-limit": [
  {
    "name": "@m13/runtime (ESM bundle, gzipped)",
    "path": "dist/m13-runtime.js",
    "limit": "100 KB",
    "gzip": true
  }
]
```

**4. `vite@^5.4.0`** agregado como devDep del runtime (no estaba presente como dep directa; venía como transitive de vitest).

### Resultados del bundle

| Métrica | Valor |
|---|---|
| Source TS bruto (runtime + synth) | ~25 KB |
| Bundle `dist/m13-runtime.js` (sin min) | **249.09 KB** |
| Bundle gzipped (vite report) | 61.23 KB |
| Bundle gzipped (size-limit, "with all deps") | **50.02 KB** |
| Budget NFR-3 | < 100 KB |
| **Headroom** | **50 KB libres** |
| Source map (no shipped) | 731 KB |

Tiempo de build: 1.14s.

### Verificaciones

- ✅ `pnpm --filter @m13/runtime build` → produce `dist/m13-runtime.js` (T-015 done).
- ✅ `pnpm --filter @m13/runtime size` → reporta 50.02 KB con dependencias, **DENTRO del budget** (T-016 done).
- ✅ `pnpm test` → 49/49 pass (sin regresiones).
- ✅ `pnpm typecheck` limpio en los 3 packages.
- ✅ `pnpm dev` Vite ready 259ms (sin impacto del nuevo vite.config en runtime — examples sigue usando el suyo).
- ✅ `dist/` ya está en `.gitignore` (no se commitean artefactos de build).

### Decisiones tomadas

- **D-1101:** **Bundle todo, no externalizar.** zod (~12 KB gz) + yaml (~20 KB gz tras tree-shaking de `parse`) + synth + runtime caben holgadamente en el budget. Externalizar obligaría al consumidor a instalar deps manualmente — rompe el principio "drop-in" del runtime y contradice §3.3 del Constitution (semantic-first, asset-light).
- **D-1102:** Build con Vite (no rollup directo ni tsup). Razón: Vite ya está en el stack, esbuild minify es rápido (1.14s para todo el bundle), alias config natural, source maps gratis.
- **D-1103:** `.d.ts` no se generan en el bundle output por ahora. El campo `types` del package.json sigue apuntando a `src/index.ts` y los workspace consumers (examples, editor en D-4) leen el TS source vía symlink. Cuando publiquemos a npm (Fase 3+), `build:types` genera `dist/types/*.d.ts` y se ajustan `main`/`types` del package.
- **D-1104:** Bundle minificado en producción con `esbuild`. No `terser`. Razón: esbuild es ~10× más rápido y la diferencia de tamaño final es marginal (<2%).
- **D-1105:** Source maps generados (`sourcemap: true`) y en `dist/` pero **no incluidos en el size budget**. Razón: son devtools, no van al runtime real. El consumidor que quiera debugear puede pedirlos por separado.

### Lo que tronó

Nada. El build pasó en el primer try, el size-limit reportó verde a la primera. Vite la levantó sin problemas tras el alias del `@m13/synth` (anticipé que el resolver no encontraría el workspace link en lib mode).

### Pendientes para próxima sesión (cierre del cluster D-2 + abrir D-3)

- [x] T-007..T-016 ✅ cluster D-2 completo
- [ ] **T-017 [BLOQUEADOR]** extender `Concept` interface con `paramsSchema` + `manifest()` (abre D-3 conceptos)
- [ ] T-018..T-022 propagación de params + soporte `kind: concept`

### Reflexiones

**Cluster D-2 cerrado.** Resumen del runtime:
- Parser: 100% cubierto, 24 tests
- Compiler: 100% cubierto, 12+7 tests, determinista byte-por-byte
- Engine: caché de pipeline GPU (49 tests total con renderer mockeado)
- Bench: parse+compile p95 = 21ms para 50 objetos (~10× bajo budget de 200ms)
- Bundle: 50KB gzipped (50% del budget de 100KB)

El runtime está listo para que D-3 (14 conceptos materiales + geométricos) y D-4 (editor) se construyan encima con confianza. La parte que NO está cubierta es el rendering real (renderer + camera + audio) — eso necesita WebGPU en navegador y se valida con T-073 (snapshot tests Playwright, scope-cut candidate) y manualmente con `pnpm dev` + abrir browser.

50KB gzipped es un número que vende fácil: una landing típica de Next.js sin SSR pesa más que el motor entero. Si T-066 (spec Fase 2) o T-064 (benchmark report) necesita un soundbite, este es bueno.

Próximo paso recomendado: **T-017** — abre el cluster D-3 (síntesis material). Es BLOQUEADOR porque sin paramsSchema en el Concept interface, no se pueden agregar los conceptos parametrizables de v0.1 (D-101).

---

## Entrada 013 · 2026-05-21 · T-017 Concept interface extendida + manifest

**Duración:** ~10 min Claude (+ desvío para explicar a Gato sobre Quest 3 scanning)
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Primera task del cluster D-3 y BLOQUEADOR del cluster: extender `Concept` interface para soportar parámetros editables (D-101) y conceptos geométricos (`object_geo`). Sin esto los 6 materiales y 4 geos faltantes (T-025..T-034) no pueden agregarse con su API completa.

Durante esta sesión Gato preguntó si el Quest 3 puede leer/escanear objetos (incluso una bodega) y rendererarlos en m13. Respondí con análisis honesto: sí pero NO en Fase 1 — alineable con Fase 4 (Gaussian Splatting) o Fase 5 (WebXR completo). El Quest 3 puede mapear espacios con Scene Mesh API pero resolución decimétrica, no LiDAR-grade. Recomendé mantener plan actual + considerar agregar conceptos `anaquel`, `rack`, `pasillo` al synth si surge requerimiento real de bodegas. Documentado en `respuesta-quest3` arriba (mensaje al usuario, no archivo).

### Lo que se hizo

**Extensiones a `packages/synth/src/index.ts`:**

1. **`ConceptCategory` expandida** con `'object_geo'` (conceptos con SDF propia).
2. **Interface `Concept`** agrega 4 campos opcionales:
   - `wgslSdf?: string` — para conceptos geométricos (T-021 lo usará)
   - `paramsSchema?: z.ZodObject<z.ZodRawShape>` — schema Zod de parámetros editables
   - `defaults?: Record<string, unknown>` — valores por default
   - `manifest?: () => ConceptManifest` — método adjuntado por el registry
3. **Nuevo tipo `ConceptManifest`** — metadata serializable: `{id, category, description, hasGeometricSDF, hasParams, defaults?}`. Diseño deliberadamente sin paramsSchema (Zod no es JSON-serializable directo); T-022 agregará `paramsJsonSchema` con `zod-to-json-schema`.
4. **`attachManifest()`** privado — wrapper que toma un concept raw y le adjunta el método `manifest()`. Permite que los 8 archivos de concepts queden como objetos planos sin tocar.
5. **REGISTRY rebuilt:** `RAW_CONCEPTS: Concept[]` (array) → `Object.fromEntries(...map(attachManifest))` → record por id.
6. **Nueva API pública `listManifests()`** — devuelve `ConceptManifest[]`.

**Tests** — `packages/synth/src/__tests__/manifest.test.ts` con 10 tests:

1. listConcepts retorna los 8 del bootstrap
2. cada concepto tiene `manifest()` callable
3. **criterio del task: `listConcepts().every(c => c.manifest) === true`** ✓
4. manifest() retorna metadata consistente con el raw
5. manifest es JSON-serializable
6. listManifests() devuelve array completo
7. los 8 del bootstrap NO declaran paramsSchema/defaults/wgslSdf (compat backward)
8. type ConceptCategory acepta 'object_geo'
9. listConceptsByCategory mantiene compat
10. getConcept retorna undefined para id inexistente

### Verificaciones

- ✅ `pnpm test` → **59/59 pass** (24 parser + 12+7 compiler + 6 engine + 10 synth-manifest).
- ✅ `pnpm typecheck` limpio en los 3 packages.
- ✅ `pnpm dev` Vite ready 265ms (sin cambio visible en demo — los 8 conceptos siguen renderizando igual).
- ✅ Los 8 archivos de `concepts/*.ts` quedaron sin tocar. Cero churn — todo el trabajo en `index.ts`.

### Decisiones tomadas

- **D-1201:** Los nuevos campos en `Concept` son **opcionales** (no required). Razón: backward compat con los 8 concepts existentes que no los declaran. Los concepts futuros (T-025..T-034) opt-in cuando los necesiten.
- **D-1202:** `manifest()` adjuntado por el registry, NO escrito a mano en cada concept. Razón: DRY — el mapping de raw→manifest es 5 líneas; replicarlas en 8 archivos sería ceremonia inútil.
- **D-1203:** `ConceptManifest` NO incluye `paramsSchema` (Zod). Razón: Zod no es JSON-serializable y queremos que el manifest se pueda mandar al editor LLM como context. T-022 agregará `paramsJsonSchema` con `zod-to-json-schema` (ya está como devDep del root).
- **D-1204:** `zod@^3.23.4` agregado como `dependency` (no devDependency) del `@m13/synth`. Razón: cuando concepts futuros declaren `paramsSchema: z.object({...})`, necesitan Zod en runtime.
- **D-1205:** `z.ZodObject<z.ZodRawShape>` como tipo del paramsSchema (no `z.ZodObject<any>`). Razón: más estricto, evita el ruido del `any` en strict mode. `ZodRawShape` permite cualquier shape concreto.
- **D-1206:** El método `manifest` queda como `manifest?` (optional) en la interface. Razón: aunque el registry siempre lo adjunta, declarando obligatorio rompería el typecheck de los archivos de concepts (que devuelven objetos sin manifest). El compilador no lo usa, así que el optional es seguro.

### Sobre la pregunta del Quest 3 scanning

Gato preguntó si Quest 3 puede leer objetos / una bodega completa y renderizar. Respuesta:

- **Quest 3 puede hacer:** passthrough video, Scene Understanding (planos), Scene Mesh (decimétrico, ~10cm), Spatial Anchors, hand/body tracking, WebXR Hit Test.
- **No tiene LiDAR.** Captura inferior a iPhone Pro + Polycam.
- **No encaja en Fase 1.** Sería Fase 4 (Gaussian Splatting híbrido) o Fase 5 (WebXR completo).
- **Caminos prácticos AHORA:**
  - Bodega abstracta configurable → agregar conceptos `anaquel`, `rack`, `pasillo`, `puerta` al synth (alineable con D-3 actual)
  - Bodega real foto-realista → Polycam/iPhone LiDAR (fuera de m13)
  - Captura aproximada in-situ → no es prioridad, mover a Fase 4-5

Gato no decidió aún si reordenar T-025..T-034 para incluir conceptos de bodega. Sigo con el plan actual.

### Lo que tronó

Nada. La extensión de interface con campos opcionales fue no-breaking, los 8 concepts siguieron compilando sin modificación, y los 10 tests pasaron a la primera.

### Pendientes para próxima sesión

- [ ] T-018 Compiler: leer params del object.material y propagarlos (parte a de C-208)
- [ ] T-019 Renderer: buffer MAT_PARAMS + struct WGSL (parte b)
- [ ] T-020 Test E2E param de concept altera output
- [ ] T-021 Compiler soporte `kind: concept` para conceptos geométricos
- [ ] T-022 Manifest JSON exportable (zod-to-json-schema)
- [ ] T-025..T-034 [PARALELIZABLES] los 14 conceptos del catálogo

### Reflexiones

T-017 fue el "ground work" típico antes de meter conceptos. El truco de adjuntar `manifest()` en el registry (vs. requerir que cada concept lo escriba) evitó tocar 8 archivos por 1 línea cada uno — ese tipo de cambios suele introducir bugs (typos, imports faltantes) y aquí no aplicaba.

Una pregunta abierta para T-018/T-019: el budget de uniforms del WGSL ahora es de 160 bytes (UNIFORM_BYTES en renderer). Agregar un buffer MAT_PARAMS aparte (256 bytes propuestos) es la propuesta del plan. Alternativa más invasiva: mover los uniforms variables a storage buffers. Para v0.1 sigo con la propuesta del plan (segundo buffer uniform).

El cluster D-3 ahora tiene su BLOQUEADOR (T-017) cerrado. Las próximas tasks T-018..T-022 son secuenciales (cada una depende de la anterior) y luego T-025..T-034 explotan en paralelo.

---

## Entrada 014 · 2026-05-21 · T-018 Compiler params propagation

**Duración:** ~15 min Claude
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Segunda task del cluster D-3. Con la interface `Concept` extendida (T-017), el compiler puede leer `paramsSchema` y propagar parámetros desde `.m13` hasta el WGSL. T-018 implementa el lado del compiler — T-019 hará el del renderer (buffer físico) y T-020 el E2E.

Gato confirmó "continuar con el orden que debe seguir" — sin reordenamientos por la pregunta del Quest 3. Sigo con catálogo del spec.

### Lo que se hizo

**Cambios en `packages/runtime/src/compiler/index.ts`:**

1. **Tipos nuevos exportados:**
   - `MatParamSlot { conceptId, paramName, index, value }` — un slot del buffer
   - `MatParamsLayout { totalFloats, slots, byKey, values: Float32Array }` — layout completo
   - `CompiledScene.matParams: MatParamsLayout` (nuevo campo)

2. **Helper `materialParamsOf(m)`:** extrae `params` del material en forma extendida (`{concept, params}`), retorna `undefined` para forma corta.

3. **Helper `buildMatParamsLayout(scene, concepts)`:**
   - Recolecta params por concept del scene (primer object con ese concept gana — conflictos silenciados sin warning para mantener determinismo).
   - Para cada concept usado:
     - Si NO tiene `paramsSchema` y el scene le pasó params → **error claro**.
     - Si tiene `paramsSchema`: merge `defaults` + `userParams` → validar con Zod → si falla, error con path.
     - Genera slots ordenados por `paramName` ASC.
   - Restricción v0.1: solo params tipo `number` (f32). Otros tipos → error.
   - Retorna `Float32Array` listo para escribir al buffer GPU (T-019).

4. **Helper `generateMatParamsStruct(layout)`:**
   - Emite `struct MatParams { conceptId_paramName: f32, ... };`
   - Emite `@group(0) @binding(1) var<uniform> matParams: MatParams;`
   - **Solo se llama si `totalFloats > 0`** — escenas sin params NO ven cambios en su WGSL (backward compat con los 8 conceptos del bootstrap).

5. **`compileScene` integrado:**
   - Llama `buildMatParamsLayout` antes de generar WGSL.
   - Inserta el bloque MatParams entre COMMON_WGSL y los concept WGSLs (cuando aplica).
   - Retorna `matParams` como parte de `CompiledScene`.

**Convención de nombres en WGSL:**
- Los conceptos referencian sus params como `matParams.<conceptId>_<paramName>`.
- Ej: `let r = matParams.metal_dorado_pulido_roughness;`.
- Underscore separator porque `.` no es válido en identificadores WGSL.

**Tests** — `packages/runtime/src/compiler/__tests__/compiler-params.test.ts` con **8 tests**:

Usando `vi.mock('@m13/synth')` para inyectar conceptos sintéticos con `paramsSchema`:

1. Escena sin params: `matParams.totalFloats === 0`, WGSL sin struct.
2. Concepto con paramsSchema usado sin user params → **defaults aplicados al layout**.
3. User params válidos → **overrides los defaults** (roughness 0.8 en lugar de 0.3).
4. WGSL incluye `struct MatParams` con todos los campos esperados.
5. Params para concepto SIN paramsSchema → **error claro** "no declara paramsSchema".
6. Params que no validan contra Zod → **error con path** "params inválidos para concepto".
7. Layout es determinista — slots ordenados por (conceptId asc, paramName asc).
8. `matParams.values` es `Float32Array` de longitud `totalFloats`.

### Verificaciones

- ✅ `pnpm test` → **67/67 pass** (24 parser + 12+7+8 compiler + 6 engine + 10 synth).
- ✅ `pnpm typecheck` limpio.
- ✅ **Backward compat:** las 4 escenas demo del bootstrap siguen produciendo el mismo hash SHA-256 (determinismo intacto). Cómo: ninguno de los 8 conceptos declara paramsSchema, así que `totalFloats === 0` y el WGSL no cambia.
- ✅ `pnpm dev` Vite ready 246ms.
- ✅ Bundle: `pnpm --filter @m13/runtime size` → **50.63 KB gzipped** (+0.61 KB vs T-016, ~51% del budget de 100 KB).

### Decisiones tomadas

- **D-1301:** **No emitir `struct MatParams` cuando `totalFloats === 0`.** WGSL no permite structs vacíos. Más importante: backward compat con los 8 conceptos del bootstrap — sus escenas siguen produciendo el mismo bytecode.
- **D-1302:** **Single-set-per-concept**. Si dos objects usan `metal_dorado_pulido` con params distintos, el primer object gana (silenciosamente). Razón: el SDF/raymarching evalúa el shader una vez por píxel, no per-instance. Per-object overrides requerirían instancing — overengineering para v0.1.
- **D-1303:** **v0.1 solo soporta `number` (f32) en params.** Otros tipos (`boolean`, `vec3`, enum) → error explícito. Razón: alineación WGSL más simple, suficiente para 90% de los casos de uso de los conceptos planeados (T-025..T-034 con `roughness`, `shimmer`, `darkness`, etc.).
- **D-1304:** **Conflictos de params silenciados sin warning.** Razón: emitir un warning rompería el determinismo de los tests SHA-256 (T-012). Si en el futuro hace falta diagnosticar conflictos, se puede agregar a `CompiledScene.warnings: string[]` sin afectar el hash del WGSL.
- **D-1305:** Slots indexados desde 0 globalmente (no por concepto). El indice es secuencial en el orden determinista. Esto simplifica el layout del buffer.
- **D-1306:** Defaults provienen exclusivamente de `concept.defaults` (Concept interface). NO se extraen automáticamente del Zod schema. Razón: cleaner API y menos magic — el author del concepto declara explícitamente los defaults.
- **D-1307:** `MatParamsLayout.values` como `Float32Array` (no `number[]`). Razón: directamente pasable a `device.queue.writeBuffer()` en T-019 sin conversión.

### Lo que tronó

Nada. La rama de backward compat fue lo más delicado — verifiqué con el test de determinismo (T-012) que las 4 escenas siguen produciendo el mismo hash. Si hubiera emitido el struct MatParams aún con cero campos, todas las escenas hubieran cambiado hash y roto el caché.

### Pendientes para próxima sesión

- [ ] T-019 Renderer: crear segundo uniform buffer + bind group entry para MAT_PARAMS
- [ ] T-020 Test E2E param de concept altera output visual
- [ ] T-021 Compiler soporte `kind: concept` para conceptos geométricos
- [ ] T-022 Manifest JSON con `zod-to-json-schema`
- [ ] T-025..T-034 [PARALELIZABLES] catálogo de 14 conceptos

### Reflexiones

T-018 fue el primer "feature creep" del cluster D-3 que probaba la nueva arquitectura. La pieza más nontrivial fue diseñar el layout determinista — los slots se ordenan por (conceptId, paramName) ambos ASC. Esto significa que agregar un nuevo concepto al synth NO cambia los offsets de los demás (siempre que su id sea único). Solo el nuevo concepto introduce slots adicionales. Caché-friendly.

El bundle subió 0.61 KB con la nueva lógica (validación Zod + struct generator + buildLayout). Si subimos ~3-5 KB por cada cluster grande de features, llegamos a Fase 1 cerrada con ~70-80 KB gzipped. Aún con margen.

Decisión clave en producción: **defaults SIEMPRE se aplican** aunque el user no provea params. Esto significa que si un concepto declara `paramsSchema` con `defaults`, los conceptos ya están "configurados" desde la primera vez que se usan. El user solo necesita interactuar si quiere desviarse.

Próxima: T-019 (renderer agrega el buffer) es la otra mitad de C-208. Con esos dos cerrados, los conceptos del T-025..T-034 pueden declarar paramsSchema sin que se rompa nada.

---

## Entrada 015 · 2026-05-21 · T-019 Renderer MAT_PARAMS buffer

**Duración:** ~12 min Claude
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Tercera task del cluster D-3 — pieza complementaria de T-018. Mientras T-018 hace que el compiler PRODUZCA el `MatParamsLayout` + struct WGSL, T-019 hace que el renderer CONSUMA esos datos: crea el segundo uniform buffer, lo escribe y lo bindea al pipeline.

### Lo que se hizo

**Cambios en `packages/runtime/src/renderer/index.ts`:**

1. **Constante `MAT_PARAMS_MAX_FLOATS = 64`** (= 256 bytes). Budget máximo del segundo uniform buffer. Si una escena excede, error claro al `initRenderer`.

2. **`RendererState.matParamsBuffer: GPUBuffer | null`** — nuevo campo. `null` si la escena no tiene params (backward compat con los 8 conceptos del bootstrap), `GPUBuffer` si tiene.

3. **Helper `alignedUniformSize(bytes)`** — redondea al múltiplo de 16 más cercano (WebGPU lo exige para uniform buffers, mínimo 16 bytes).

4. **En `initRenderer`:**
   - Si `compiled.matParams.totalFloats > 0`:
     - Valida budget (≤ 64 floats)
     - Crea `matParamsBuffer` con tamaño alineado
     - Escribe los valores iniciales del `Float32Array` vía `device.queue.writeBuffer(...values.buffer)` (usando `.buffer` para evitar el mismatch generic `Float32Array<ArrayBufferLike>` vs `<ArrayBuffer>` que TS 5.9 introduce — mismo workaround que T-006 para mic-input)
   - Si `totalFloats === 0`: salta todo el path, `matParamsBuffer = null`.

5. **Bind group dinámico:**
   - Siempre incluye `binding(0)` con `uniformBuffer`.
   - Solo agrega `binding(1)` con `matParamsBuffer` cuando existe.
   - El layout `'auto'` del pipeline se sincroniza con el shader (que el compiler de T-018 emitió condicionalmente).

6. **Nueva función pública `writeMatParams(state, values)`** — reescribe el buffer en runtime. Útil para editor live-update (D-4 T-046). No-op si `matParamsBuffer === null`. Exportada desde `@m13/runtime`.

**Sync con engine-cache.test.ts:**

- Mock de `initRenderer` actualizado para retornar `matParamsBuffer: null` (cumplir el nuevo type contract).
- Mock de `writeMatParams` añadido.

### Verificaciones

- ✅ `pnpm typecheck` limpio (tras fix del generic Float32Array con `.buffer`).
- ✅ `pnpm test` → **67/67 pass** (24 parser + 12+7+8 compiler + 6 engine + 10 synth).
- ✅ **Backward compat:** las 4 escenas demo siguen produciendo el mismo hash SHA-256 del WGSL (porque los 8 conceptos del bootstrap no declaran paramsSchema → totalFloats=0 → matParamsBuffer=null → mismo flujo que antes).
- ✅ `pnpm dev` Vite ready 251ms.
- ✅ Bundle: 50.87 KB gzipped (+0.24 KB vs T-018, **~51% del budget de 100 KB**).
- ⏳ **Verificación visual en navegador con WebGPU real diferida a T-020 (E2E) y T-078 (sesión visual con Gato).** El renderer no se puede unit-testear sin GPU; los tests existentes verifican la integración a nivel del engine, y el browser test requiere ojo humano.

### Decisiones tomadas

- **D-1401:** **Bind group dinámico** (binding(1) solo cuando hay params). Razón: el pipeline `layout: 'auto'` infiere el layout del shader. Si el shader no declara binding(1), el bind group tampoco debe incluirlo, o WebGPU lanza validation error. La condicionalidad evita sincronizar manualmente shader↔bind group.
- **D-1402:** **Budget 64 floats / 256 bytes** como hard limit (constante `MAT_PARAMS_MAX_FLOATS`). Razón: limita memoria + previene escenarios patológicos. 64 floats cubre ~6-10 conceptos con ~6-10 params cada uno, suficiente para el catálogo planeado (14 conceptos × 1-4 params típicamente = ~40 slots).
- **D-1403:** **Escribir matParams una sola vez al cargar la escena**, no per-frame. Razón: los valores son estáticos para una escena dada (no animan, vienen de defaults o user .m13). Per-frame writes serían waste. Para editor live-update, se expone `writeMatParams(state, values)` como API explícita.
- **D-1404:** **`writeBuffer` con `.buffer` + `byteOffset` + `byteLength`** en lugar de pasar el `Float32Array` directo. Razón: TS 5.9 hizo `Float32Array<T>` genérico, y el caso `Float32Array<ArrayBufferLike>` (default) no coincide con `Float32Array<ArrayBuffer>` que espera WebGPU. Pasar `.buffer` (un ArrayBuffer concreto) evita el mismatch. Mismo patrón que T-006 fix para mic-input.
- **D-1405:** **Buffer mínimo de 16 bytes** (aligned to 16). WebGPU lo exige para uniform buffers. Si una escena solo necesita 1 f32 (4 bytes), reservamos 16. Overhead despreciable.
- **D-1406:** **No emit `writeMatParams` per-frame.** El renderFrame loop sigue siendo: setPipeline + setBindGroup + draw(3) + submit. Sin cambios. matParams es "set and forget" hasta el próximo loadScene o llamada explícita a `writeMatParams`.

### Lo que tronó

Mismo problema de TS 5.9 generic que con T-006 — `Float32Array<ArrayBufferLike>` no asigna a `<ArrayBuffer>`. Resuelto pasando `.buffer` explícitamente. Patrón documentable para futuros usos: si pasas un typed array a una WebGPU/Web Crypto API moderna y TS se queja, pasa `.buffer` con offsets.

### Pendientes para próxima sesión

- [ ] T-020 Test E2E param de concept altera output visual (paralelizable)
- [ ] T-021 Compiler soporte `kind: concept` para conceptos geométricos
- [ ] T-022 Manifest JSON con `zod-to-json-schema`
- [ ] T-023..T-024 READMEs runtime+synth
- [ ] T-025..T-034 [PARALELIZABLES] catálogo de 14 conceptos

### Reflexiones

C-208 cerrado (T-018 + T-019). La arquitectura quedó: compiler describe el layout + emite WGSL → renderer crea el buffer + lo enlaza → concepts referencian `matParams.<id>_<param>` en sus WGSL. Cuando un concepto declara paramsSchema en T-025..T-034, todo el pipeline lo soporta sin más changes.

El bundle subió de 50.02 → 50.63 → 50.87 KB tras estos cambios (+0.85 KB total). Los próximos clusters (14 conceptos + editor en D-4) serán los que muevan la aguja del bundle más significativamente.

**Importante:** no se verificó la rama "renderiza con params" en navegador esta sesión. Los conceptos del bootstrap no tienen paramsSchema, así que activar la rama requiere agregar params a uno de ellos manualmente, o esperar a T-029 (metal_bronce_pulido). El test del flujo está en compiler-params.test.ts (T-018) y la integración con renderer se valida cuando T-020 (E2E) corra.

Tres tasks (T-017, T-018, T-019) cerradas en una sola sesión — el cluster D-3 avanza al ritmo previsto. Siguiente decision point: ¿hacer T-020 (E2E) o saltarse directo a T-025..T-034 (conceptos) y validar de paso? T-020 es paralelizable y verificable solo en browser, así que conviene ejecutar T-025..T-034 con conceptos que ya tengan paramsSchema, y T-020 se vuelve un by-product visible.

---

## Entrada 016 · 2026-05-21 · T-020 Test E2E params + bug fix en engine cache

**Duración:** ~15 min Claude (+ 2 Q&A con Gato sobre desktop nativo y "Roblox agentic")
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Cierre del flow C-208 (compiler + renderer + tests). T-020 originalmente especifica un test simple ("dos escenas con params distintos → WGSL substrings distintos"), pero la implementación que hice de T-018 (params como uniforms, NO baked en WGSL) hace que el WGSL sea idéntico para mismo shape + params distintos. Esto reveló un **bug latente** en `M13Engine.loadScene`: el cache hit del shader saltaba el `initRenderer` Y no escribía los nuevos valores al matParamsBuffer.

Gato hizo dos preguntas estratégicas en esta sesión:
1. **m13 como app desktop nativa** → respondida en BITACORA + chat: m13 ya es local-first, PWA recomendada para Fase 2, Tauri 2 para Fase 4-5 si surge demanda enterprise.
2. **m13 como base de "nuevo Roblox" con agentic systems** → respondida: factible pero requiere proyecto hermano "m13-platform" + ronda gigante de refactor (multiplayer, physics, characters, LLM local en runtime). Contradice Constitution §3.5 (determinismo en runtime) — necesita resolución. Recomendado: Vision Paper en Fase 4-5, no actionable en 2026 corto plazo. Camino comercial intermedio: B2B vertical (PLANVR con asistente IA, Cocinas Domus con voz, educativas para niños).

### Lo que se hizo

**1. Bug fix en `M13Engine.loadScene`:**

```typescript
if (!cacheHit) {
  this.renderer = await initRenderer(this.canvas, compiled);
  this.lastWgslHash = newHash;
} else if (this.renderer && compiled.matParams.totalFloats > 0) {
  // Cache hit del shader pero los VALORES de matParams pueden haber cambiado.
  writeMatParams(this.renderer, compiled.matParams.values);
}
```

Importación de `writeMatParams` agregada al engine.

**2. Tests E2E del flow params:**

Extendí `compiler-params.test.ts` con 2 tests T-020:
- **"Misma estructura + params DISTINTOS → mismo WGSL, valores distintos"**: compila dos escenas idénticas excepto roughness/shimmer values, verifica que `wgsl` y `hashWgsl` son IDÉNTICOS, pero `matParams.values[0..1]` difieren.
- **"Params en wall/floor/ceiling también se propagan"**: con `vi.resetModules` + `vi.doMock` re-mockeo `@m13/synth` para que `pared_yeso_blanco` tenga paramsSchema, valida que params en superficies del cuarto (no solo objects) también llegan al layout.

**3. Nuevo archivo `engine-matparams.test.ts` con 3 tests:**

Mock combinado de `@m13/synth` (concept gold con paramsSchema) + renderer (vi.fn para `initRenderer` y `writeMatParams`):
1. **Primera carga con params:** `initRenderer 1×`, `writeMatParams 0×` (el writeBuffer va dentro de initRenderer en la rama miss).
2. **Cache hit + params cambiados:** `initRenderer 1×` (no se vuelve a llamar), `writeMatParams 1×`. El Float32Array pasado contiene el nuevo valor.
3. **5 corridas misma escena:** `initRenderer 1×`, `writeMatParams 4×` (uno por cada cache hit).

### Verificaciones

- ✅ `pnpm test` → **72/72 pass** (24 parser + 12+7+10 compiler + 6+3 engine + 10 synth). +5 tests vs T-019.
- ✅ `pnpm typecheck` limpio.
- ✅ `pnpm dev` Vite ready 256ms.
- ✅ Backward compat: las 4 escenas demo del bootstrap sin params siguen produciendo el mismo hash. El nuevo `else if (totalFloats > 0)` queda inerte para ellas.

### Decisiones tomadas

- **D-1501:** Bug fix del cache hit es OBLIGATORIO en T-020 (no scope creep). Sin esto, los conceptos con params (T-025..T-034) NO podrían actualizar sus valores en runtime cuando el usuario edite el `.m13` en el editor (D-4). El test del bug es el principal entregable de T-020.
- **D-1502:** El test del párrafo "WGSL substrings distintos" del task original NO refleja la implementación real. La realidad es: **mismo WGSL, distinto Float32Array**. Es una propiedad MEJOR (cache-friendly, runtime-editable). El test re-interpreta el done criterion como "verificar que params se propagan correctamente E2E", lo que cumple ese intent.
- **D-1503:** `engine-matparams.test.ts` separado de `engine-cache.test.ts` para evitar combinar mocks de synth+renderer en el mismo archivo (los tests de cache existentes usan synth real). Mantenimiento más limpio.
- **D-1504:** `writeMatParams` se llama UNA vez por loadScene (en el cache hit), no per-frame. Justified by D-1403 — valores estáticos. El editor live-update (Fase 2 D-4) llamaría explícitamente `engine.updateMatParams(values)` (función futura) para refresh sin re-cargar la escena.

### Lo que tronó

Bug del cache hit identificado mid-task. Diseñé los tests para exponerlo intencionalmente — fue mejor descubrirlo aquí que en producción cuando T-029 lance metal_bronce_pulido con params. Patrón replicable: cuando agregues un nuevo flujo (params, instancing, etc), escribe primero el test "cambio de input X → cambio de output Y" para encontrar gaps de propagación.

### Pendientes para próxima sesión

- [ ] T-021 Compiler soporte `kind: concept` para conceptos geométricos
- [ ] T-022 Manifest JSON con `zod-to-json-schema`
- [ ] T-023..T-024 READMEs runtime+synth
- [ ] T-025..T-034 [PARALELIZABLES] catálogo de 14 conceptos

### Reflexiones

**El cluster D-3 lleva 4 tasks cerradas (T-017..T-020) en una sesión continua.** El motivo es que la arquitectura interface→compiler→renderer→test era sólida desde T-017 y cada task pone una pieza limpia encima sin refactor previo. T-021 (kind: concept) y T-022 (manifest JSON) son extensiones similares — probablemente otra sesión cortita.

Después de eso, T-025..T-034 (los 14 conceptos) son paralelizables y se podrían lanzar todos al mismo tiempo con subagent-driven-development. Pero antes vale la pena cerrar T-021/T-022 que son BLOQUEADORES para que los conceptos geométricos (`pedestal_marmol`, `lampara_colgante`, `esfera_decorativa`, `cubo_basico`) tengan dónde declarar su SDF.

Las Q&A de Gato sobre **desktop nativo** y **"Roblox agentic"** dejan dos vetas estratégicas para post-Fase 1:
- **PWA en Fase 2** — bajo costo, instalación de m13 como app desktop en 2 días de trabajo.
- **m13-platform Vision Paper en Fase 4-5** — alta visión a 18-24 meses, requiere decisión de scope.

Ambas son trabajos NUEVOS — no van a Fase 1. Registradas para futuro (BITACORA es archivo de records, no de planes activos).

---

## Entrada 017 · 2026-05-21 · T-021..T-024 + ideas futuras

**Duración:** ~25 min Claude (batch de 4 tasks + 2 Q&A largas con Gato)
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Sesión muy productiva — Gato pidió "dale con todas tus recomendaciones" tras T-020. Cerré T-021, T-022, T-023, T-024 + documenté dos ideas futuras (PWA Fase 2 + m13-platform post-éxito) en CLAUDE.md por petición explícita de Gato.

### Lo que se hizo

**1. CLAUDE.md — Sección "Ideas futuras (NO en scope Fase 1)":**

Documentadas dos ideas que NO están en plan actual pero merecen archivo:
- **Idea 1: PWA installable** — Fase 2, 2 días de trabajo. Manifest + service worker. Beneficio: m13 se instala como app desktop desde browser.
- **Idea 2: m13-platform (Roblox-killer agentic)** — POST-éxito de Fase 1-5, no comprometido. Requiere multiplayer + physics + characters + LLM local + resolución del Constitution §3.5. Por confirmación de Gato: "solo después de que m13 con lo que ya hay en el alcance sea exitoso".

**Caminos comerciales intermedios** registrados (no requieren m13-platform):
- PLANVR + asistente IA
- Cocinas Domus con voz
- Educativas con tutor IA en mundo 3D

**2. T-021 — Compiler `kind: concept` para conceptos geométricos:**

- **Schema:** `objectKindSchema` extendido con `'concept'`. `material` ahora opcional. `concept?: string` nuevo. `.superRefine()` enforza: kind:'concept' requiere `concept`, otros kinds requieren `material`.
- **Compiler:** nueva helper `effectiveConceptId(obj)` que resuelve el id según kind. `generateObjectSdf` ahora tiene case `'concept'` que delega a `sdf_<id>(localP, scale)`. WGSL output incluye sección "SDFs de conceptos geométricos" con todos los `wgslSdf` de los conceptos referenciados.
- **buildMatParamsLayout** actualizado para iterar superficies y objects con `material` definido (filter para excluir kind:concept).
- **Tests:** archivo nuevo `compiler-kind-concept.test.ts` con **9 tests** cubriendo: parser acepta kind:concept, rechaza sin concept, rechaza primitivo sin material, compiler genera sdf_<id>, incluye wgslSdf en output, usa material implícito del concept, conceptsUsed incluye el id, mix con primitivos, animate+audio_reactive funcionan.

**3. T-022 — Manifest JSON exportable:**

- Agregado `zod-to-json-schema@^3.23.0` como `dependency` de `@m13/synth`.
- `ConceptManifest` extendido con campo `paramsJsonSchema?: Record<string, unknown>` (JSON Schema draft-07).
- `attachManifest()` pre-computa el JSON Schema una vez al registrar (Zod schema inmutable).
- Tests: 2 nuevos en `manifest.test.ts`:
  - Conceptos sin paramsSchema NO incluyen paramsJsonSchema ni hasParams
  - `zodToJsonSchema` produce output serializable con los campos correctos

**4. T-023 — README `@m13/runtime`:**

Doc inglés, ~200 líneas. Cubre:
- Quick start con ejemplo de 4 líneas
- API completa: M13Engine class, parseScene, compileScene, hashWgsl, FlyCamera, MicAudioInput, writeMatParams
- Shader cache + determinism
- Architecture diagram (ASCII)
- Lo que NO hace v0.1 (polígonos, multiplayer, físicas)
- Bundle size: 50KB (pre-T-022) — ahora 56.79KB tras T-022

**5. T-024 — README `@m13/synth`:**

Doc inglés, ~250 líneas. Cubre:
- Catálogo bootstrap (8 conceptos) + categorías
- Tutorial paso-a-paso: crear nuevo concepto material en ≤ 30 min
  - Crear archivo + WGSL fn material
  - Registrar en index.ts
  - Usar en escena
  - Hacerlo parametrizable con paramsSchema
- Tutorial: crear concepto geométrico con `wgslSdf`
- Reglas del WGSL function (signature, pureza, lighting)
- API del manifest() y para qué sirve (editor UI, LLM context, exports, telemetría)
- Best practices (noise helpers, FBM ≤ 4 octaves, multi-scene testing, etc)
- Catalog roadmap Fase 1 (T-025..T-034)

### Verificaciones

- ✅ `pnpm typecheck` limpio en los 3 packages.
- ✅ `pnpm test` → **83/83 pass** (+ 11 nuevos vs T-020: 9 kind:concept + 2 manifest JSON Schema).
- ✅ Backward compat: 4 escenas demo siguen produciendo el mismo hash SHA-256.
- ✅ `pnpm --filter @m13/runtime build` → 1.25s, 281 KB raw.
- ✅ `pnpm --filter @m13/runtime size` → **56.79 KB gzipped** (+5.92 KB vs T-019 por `zod-to-json-schema`, ~57% del budget de 100 KB).

### Decisiones tomadas

- **D-1601:** Schema usa `superRefine()` con `addIssue()` para validación cruzada (kind:concept ↔ concept field). Más flexible que `refine()` simple porque permite diferenciar mensajes por kind.
- **D-1602:** Material `optional` en object schema. Type inference pierde precisión (M13Object ahora tiene material?), consumers deben checkear kind primero. Aceptable: la `superRefine` garantiza que en runtime el campo correcto siempre está presente.
- **D-1603:** `wgslSdf` signature acordada: `fn sdf_<id>(p: vec3<f32>, scale: vec3<f32>) -> f32`. Compiler hace la translación de posición y animación externamente vía `localP`. Si futuras animaciones afectan la forma (no solo posición), agregar params adicionales en v0.2.
- **D-1604:** Material implícito en `kind: 'concept'` — el concept geo provee su propio `mat_<id>()`. Si el user quiere override, sería un campo `material` futuro (no en v0.1). Mantenemos KISS.
- **D-1605:** `paramsJsonSchema` se PRE-COMPUTA al registrar el concept (en `attachManifest`), no por cada llamada a `manifest()`. Razón: Zod schema es inmutable; conversión es costosa (~ms); cache amortiza.
- **D-1606:** `zod-to-json-schema` agregado como **dependency** de synth (runtime). El bundle subió 5.92 KB. Justified porque es el camino crítico del editor LLM (T-051).
- **D-1607:** READMEs en inglés (Constitution §3.8). El audiencia objetivo es internacional (research papers, contribuidores externos en Fase 3+, publicación pública del demo).

### Lo que tronó

Nada. Cuatro tasks en cascada limpia. La parte más sutil fue el cambio de schema (material? opcional) — atajé verificando que todos los tests existentes pasaran (24 parser + 12+7+8+9+3 compiler + 12 manifest + 6+3 engine = 83 tests, todos verdes).

### Pendientes para próxima sesión

- [ ] T-020 ya cerrado en sesión anterior
- [ ] T-025..T-034 [PARALELIZABLES] catálogo de 14 conceptos — listo para arrancar
- [ ] T-035 smoke test visual de los 14 conceptos
- [ ] T-036 update synth README con catálogo final

### Reflexiones

**Cluster D-3 base completo.** Las 6 tasks core de infraestructura para conceptos están cerradas:
- T-017 Concept interface extendida
- T-018 compiler propaga params
- T-019 renderer MAT_PARAMS buffer
- T-020 E2E + bug fix
- T-021 kind:concept para geos
- T-022 manifest JSON exportable
- T-023 README runtime
- T-024 README synth

Lo que queda de D-3 son los conceptos en sí (T-025..T-034) — 10 archivos pequeños, paralelizables. Cada uno ~30-60 min según complejidad. La estructura está lista para que se agreguen sin tocar el motor.

**Sobre las ideas futuras documentadas:**

Bueno tenerlas en CLAUDE.md aunque NO se trabajen. Sirven como antídoto contra scope creep: si en una sesión futura yo (o cualquier agente) inventa rocketship features fuera de plan, basta con apuntar al doc y decir "eso está documentado pero está fuera de Fase 1". El PWA en particular está medio actionable — cuando llegue Fase 2 ya tenemos la primera idea sobre la mesa sin necesidad de re-pensar.

**Pregunta abierta para Gato:** T-025..T-034 son 10 tasks independientes (6 materiales + 4 geos). Se pueden lanzar con subagent-driven-development en paralelo (cada task = un subagent, hasta 4 a la vez para no saturar). ¿Quieres que arranque la paralelización en próxima sesión, o seguimos secuencialmente uno a uno?

---

## Entrada 018 · 2026-05-21 · T-025..T-036 catálogo D-3 completo + showcase

**Duración:** ~30 min Claude (con effort high según Gato)
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Cierre del cluster D-3. Tras tener toda la infraestructura (T-017..T-024 ya completados), agregamos los **10 conceptos restantes** del catálogo Fase 1 + escena showcase + README final. Gato dijo "dale con todas tus recomendaciones" y luego "sí continúa", confirmando paralelización masiva.

### Lo que se hizo

**10 nuevos conceptos (todos archivos pequeños, ~30-60 líneas cada uno):**

#### Materiales (T-025..T-030)

| ID | Params | Descripción |
|---|---|---|
| `pared_concreto_pulido` | darkness, roughness | Concreto pulido industrial (loft/oficina/parking) |
| `pared_madera_oscura` | darkness, grainScale | Madera oscura (despacho/biblioteca) |
| `piso_marmol_blanco` | veinIntensity | Mármol floor-optimized (galería/lobby) |
| `metal_oxidado` | rustAmount | Metal con óxido naranja (rústico) |
| `metal_bronce_pulido` | shimmer | Bronce con shimmer animado por `u.time` |
| `vidrio_esmerilado` | clarity | Vidrio esmerilado EMULADO (sin transmisión real, limitación v0.1) |

#### Geométricos (T-031..T-034)

| ID | Params | wgslSdf |
|---|---|---|
| `pedestal_marmol` | cornerRadius | round_box con cornerRadius parametrizable |
| `lampara_colgante` | glowIntensity, length | Cilindro emisivo inline (sin contribución real a luz de escena) |
| `esfera_decorativa` | — | Sphere simple (radius desde scale.x) |
| `cubo_basico` | — | Box puro (usa scale del object) |

**Registry actualizado** (`synth/src/index.ts`):
- 18 imports organizados por origen (bootstrap × 8, materiales D-3 × 6, geos D-3 × 4)
- `RAW_CONCEPTS` array de 18 elementos
- attachManifest sin cambios — pre-computa paramsJsonSchema para los 8 que ahora lo tienen

**Tests del manifest reescritos** — antes verificaban "8 conceptos sin params", ahora:
- `BOOTSTRAP_IDS` (8) — verifican que siguen SIN params, defaults, wgslSdf (compat backward)
- `D3_MATERIAL_IDS` (6) — verifican que TODOS declaran paramsSchema + defaults + paramsJsonSchema serializable
- `D3_GEO_IDS` (4) — verifican category 'object_geo' + wgslSdf con función `sdf_<id>`
- Total: 18 conceptos, TOTAL_COUNT validado en cada test
- Nuevo test específico T-022: verifica que el JSON Schema de un concepto (metal_oxidado) refleja correctamente las restricciones Zod (`minimum:0`, `maximum:1`)

**T-035 — Escena showcase `_concepts_showcase.m13`:**
- Cuarto grande 8×4×8 m, spawn en (0, 0, -6) para vista panorámica
- **18 conceptos referenciados en 1 escena** (validado por script de inspección):
  - Walls: pared_concreto_pulido con params (darkness 0.4, roughness 0.4)
  - Floor: piso_marmol_blanco (veinIntensity 0.4)
  - Ceiling: pared_yeso_blanco
  - 15 objetos en 4 filas: bootstrap × 4, D-3 materials × 4, D-3 geos × 4, bootstrap sobrantes × 3
- Comprobado en runtime: MAT_PARAMS 11 f32 slots, WGSL 17.4 KB, YAML 3.7 KB (< 30 KB budget de escena)
- Registrada en `examples/src/main.ts` como 5ta escena del selector. Hotkey 5.

**T-036 — README synth final:**
- Tabla "Phase 1 catalog (18 concepts)" reemplaza la antigua "Bootstrap catalog (8)"
- 3 sub-tablas: Bootstrap (8), D-3 materiales (6 con sus params), D-3 geos (4)
- Sección "Showcase scene" apunta al .m13 nuevo
- Sección "Catalog roadmap" actualizada: Phase 1 ✅ catalog complete, futuras fases enumeran extensiones (Phase 2 azulejo_talavera etc, Phase 3 neural, Phase 4 splatting).

### Verificaciones

- ✅ `pnpm typecheck` limpio en los 3 packages.
- ✅ `pnpm test` → **86/86 pass** (24 parser + 12+7+8+9+3 compiler + 6+3 engine + 15 synth — +3 vs T-022 por nuevos tests del catálogo).
- ✅ Determinismo: las 4 escenas demo siguen produciendo el mismo SHA-256 (nuevos conceptos no se referencian en demos viejos, hash igual).
- ✅ `pnpm dev` Vite ready 266ms. Escena showcase responde HTTP 200.
- ✅ Bundle: 58.64 KB gzipped (+1.85 KB vs T-022, ~59% del budget de 100 KB).
- ✅ `pnpm bench:compile` p95 22.31 ms para 50 objetos (~9× bajo budget de 200 ms — el growth de catálogo no afectó performance).
- ✅ Showcase compila con 18 conceptos, 11 slots MAT_PARAMS, sin errores.

### Decisiones tomadas

- **D-1701:** Los 6 materiales nuevos TODOS declaran paramsSchema + defaults. Razón: el catálogo es la oportunidad de demostrar el flow completo de T-018/T-019. Sin params, el catálogo sería visualmente idéntico al bootstrap.
- **D-1702:** 2 de los 4 geos declaran params (pedestal_marmol con cornerRadius, lampara_colgante con glowIntensity + length). Los otros 2 (esfera_decorativa, cubo_basico) NO necesitan — usan el `scale` del object directamente. Esto valida que `paramsSchema` es opcional incluso para geos.
- **D-1703:** Cada concept con sus params hardcodea las restricciones Zod (`.min(0).max(1)`). Esto se traduce automáticamente a JSON Schema con `minimum`/`maximum` para el editor LLM, sin escribir el JSON Schema a mano.
- **D-1704:** `vidrio_esmerilado` documenta su LIMITACIÓN (sin transmisión real) tanto en su comment header como en el README. Es un punto débil pero honesto — Fase 3-4 traerá la versión real con neural / splatting.
- **D-1705:** `lampara_colgante` también documenta limitación (no añade luz real a la escena, es solo apariencia HDR via `color * (1 + glow)`). Para luz real, workaround manual de mover `light.position` al scene.
- **D-1706:** Showcase incluye TODOS los 18 conceptos en 1 escena. Razón: si TODOS renderizan sin shader errors, el catálogo está sano. Decisión > tener 18 escenas mini que validen 1 cada una.
- **D-1707:** El showcase usa hotkey 5 (5ta opción), después de templo (4). Mantiene compat con muscle-memory: 1-4 son las 4 originales.
- **D-1708:** Tests del manifest se organizan por origen del concepto (BOOTSTRAP/D3_MATERIAL/D3_GEO). Más mantenible que mezclar — al agregar conceptos en Fase 2 basta con añadir un nuevo array constante + un test de "los X nuevos de Fase 2".

### Lo que tronó

- 4 tests del manifest fallaron tras agregar los nuevos conceptos (esperaban "todos sin params") — atrapado y reescrito el archivo de tests para reflejar la nueva realidad (bootstrap vs D-3 separados).
- `_concepts_showcase.m13` v1 tenía solo 15 conceptos referenciados — 3 bootstrap quedaron fuera. Agregué 3 objetos más para llegar a los 18. Atrapado por el script de inspección efímero antes de commitear.

### Pendientes para próxima sesión

**Cluster D-3 cerrado.** Avance:
- ✅ T-017 (interface)
- ✅ T-018 (compiler params)
- ✅ T-019 (renderer buffer)
- ✅ T-020 (E2E + bug fix)
- ✅ T-021 (kind:concept)
- ✅ T-022 (manifest JSON)
- ✅ T-023, T-024 (READMEs)
- ✅ T-025..T-034 (10 conceptos)
- ✅ T-035 (showcase)
- ✅ T-036 (README final)

**Siguientes clusters disponibles:**
- D-5 (escenas formales del spec: T-037 sala_galeria, T-038 cocina_industrial, T-039 oficina_neonodos, T-040 reconciliar registry, T-041 FPS validation)
- D-4 (editor Next.js + LLM — el más caro, 11 componentes)
- D-6 (benchmark vs Three.js)
- D-7 (demo público + Quest 3)
- D-8 (docs + spec Fase 2)

### Reflexiones

**El cluster D-3 está COMPLETO.** El motor m13 ahora tiene:
- 18 conceptos de síntesis material/geométrica funcionales y testeados
- Soporte completo de params editables vía Zod → uniforms WGSL
- Soporte de conceptos geométricos con SDF propio
- Manifest JSON exportable para el editor LLM
- Showcase visual + READMEs completos en inglés

**Cifras:**
- 86 tests verdes (de cero al inicio de Fase 1)
- 58.64 KB bundle gzipped (~59% del budget)
- p95 compile-time 22 ms para 50 objects (10× bajo budget)
- 0 regresiones en escenas demo originales

**Próxima decisión estratégica:** ¿qué cluster atacar?
- D-5 es rápido (3-4 escenas, ya tenemos los conceptos para construirlas)
- D-4 es el monstruo (editor + LLM) — mejor abordarlo después de D-5/D-7 para tener escenas reales que el editor pueda mostrar
- D-7 (demo público) requiere D-5 listo

Mi recomendación: **D-5 siguiente (rápido) → D-7 (demo público) → D-4 (editor) → D-6 (benchmark) → D-8 (cierre)**. Esta secuencia maximiza valor temprano (demo accesible) y deja el editor (riesgo más alto) cuando los demás están firmes.

Si Gato lo aprueba, próxima sesión = T-037 (sala_galeria.m13) — escena minimalista con yeso + mármol + esfera + pedestal.

---

## Entrada 019 · 2026-05-21 · D-5 completo — 3 escenas formales + reconciliación

**Duración:** ~20 min Claude (con effort high)
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Cluster D-5 cerrado en batch. Tras tener el catálogo de 18 conceptos (D-3 completo), construimos las 3 escenas formales del spec §4.5 que usan el nuevo catálogo, eliminamos las 3 escenas bootstrap obsoletas, reconciliamos el scene registry del demo, y validamos compile-time per-escena.

### Lo que se hizo

**T-037..T-039 — 3 escenas formales:**

| Escena | Identidad | Conceptos usados | Pieza emblemática |
|---|---|---|---|
| `sala_galeria.m13` | White-cube gallery / museo | 6 conceptos | esfera escultórica con iridiscencia sobre pedestal mármol |
| `cocina_industrial.m13` | Loft mexicano cocina | 8 conceptos | isla con tope de bronce + lámpara colgante dorada |
| `oficina_neonodos.m13` | Brand NeoNodos (terracota + dorado + madera) | 7 conceptos | esfera dorada audio-reactiva central + window cut |

Cada escena diseñada con:
- bounds y spawn pensados para vista compositiva
- ambient.tint con la paleta del concepto (cool gallery / warm loft / terracota corporate)
- light.color matching (cenital frío / ámbar / dorado cálido)
- objetos que combinan primitivos + `kind: concept` geos
- params usados activamente (sala_galeria usa veinIntensity, cocina usa shimmer y darkness, oficina usa varios)

**T-040 — Scene registry reconciliado:**

- **Eliminados:** `sala_basica.m13`, `galeria_minimal.m13`, `loft_industrial.m13` (las 3 escenas bootstrap originales).
- **Mantenido:** `templo_mexica.m13` (showcase del audio reactivo + identidad mexicana).
- **Conservado del cluster D-3:** `_concepts_showcase.m13` (vitrina de 18 conceptos).
- **`packages/examples/src/main.ts`** actualizado con el nuevo SCENES array de 5 entradas:
  1. galería (sala_galeria) — hotkey 1
  2. cocina (cocina_industrial) — hotkey 2
  3. oficina (oficina_neonodos) — hotkey 3
  4. templo (templo_mexica) — hotkey 4
  5. showcase (_concepts_showcase) — hotkey 5

**Refactor de tests por scene rename:**

Los tests de compiler-output (T-010), compiler-determinism (T-012) y engine-cache (T-013) referenciaban las 3 escenas bootstrap eliminadas. Reescritos:
- `compiler-output.test.ts`: 3 tests reescritos para sala_galeria, cocina_industrial, oficina_neonodos. Assertions de conceptos referenciados actualizadas a la nueva composición. Window cut test moved a oficina_neonodos (única de las 3 nuevas con window).
- `compiler-determinism.test.ts`: array de 4 escenas demo actualizado. 100-runs test ahora sobre sala_galeria.
- `engine-cache.test.ts`: A → B → A test usa sala_galeria/oficina_neonodos. 10-runs test usa cocina_industrial.

**T-041 — Validación compile-time per-escena:**

Script efímero (`/tmp/m13_scenes_validate.mjs`) midió cada escena con 5 warmups + 20 measurements:

| Escena | YAML KB | objs | conceptos | matFloats | WGSL KB | compile p95 (ms) |
|---|--:|--:|--:|--:|--:|--:|
| `sala_galeria` | 2.0 | 6 | 6 | 3 | 9.8 | 10.55 |
| `cocina_industrial` | 2.0 | 6 | 8 | 6 | 10.8 | 6.37 |
| `oficina_neonodos` | 2.6 | 6 | 7 | 7 | 10.9 | 5.57 |
| `templo_mexica` | 1.1 | 4 | 2 | 0 | 7.5 | 3.06 |
| `_concepts_showcase` | 3.7 | 15 | 18 | 11 | 17.0 | 6.34 |

Todas las escenas:
- ✅ < 4 KB de YAML (budget spec: < 30 KB → 7.5× holgura).
- ✅ < 11 ms compile p95 (budget spec H1.3: < 200 ms → ~19× holgura).
- ✅ < 18 KB de WGSL output (no hay budget pero útil para deploys).

### Verificaciones

- ✅ `pnpm test` → **86/86 pass** (tras reescritura de 9 tests por scene rename).
- ✅ `pnpm typecheck` limpio.
- ✅ `pnpm --filter @m13/runtime build` → 1.30s, 71.5 KB raw / 58.64 KB gzipped (sin cambio vs T-022 — los nuevos conceptos NO se importan al bundle del runtime, viven en synth y se compilan en runtime).
- ✅ `pnpm --filter @m13/runtime size` → 58.64 KB gzipped (~59% del budget).
- ✅ Determinismo: SHA-256 estable en 100 corridas por escena.
- ⏳ FPS real diferido a T-078 (sesión visual con Gato en VNC). Los compile-time numbers son la única validación posible desde Node.

### Decisiones tomadas

- **D-1801:** Eliminar las 3 escenas bootstrap (sala_basica, galeria_minimal, loft_industrial) en vez de mantenerlas. Razón: el plan T-040 lo pide explícitamente; las 3 nuevas las sustituyen funcionalmente; conservarlas crearía confusión sobre cuál es la "canónica". Se conservan en git history para referencia.
- **D-1802:** Mantener `templo_mexica.m13` y `_concepts_showcase.m13` además de las 3 nuevas. Razón: templo demuestra audio reactivo + identidad mexicana únicos; showcase es smoke test visual del catálogo. Total final: 5 escenas en el demo.
- **D-1803:** Window cut test movido a `oficina_neonodos` (única de las 3 nuevas con window — agregado deliberadamente como pieza arquitectónica de la escena: ventana al patio).
- **D-1804:** Validación FPS no se pudo medir desde Node (requiere WebGPU real). Se documenta compile-time como proxy y se difiere FPS visual a T-078. **Recomendación a Gato:** abrir el demo en localhost:5173 con Chrome+WebGPU, navegar las 5 escenas durante 30s cada una, verificar que el FPS counter del HUD ≥ 60. Si alguna < 60, registrar como issue y mitigar reduciendo octaves del FBM en el concept correspondiente.
- **D-1805:** `oficina_neonodos.tint` usa `[1.08, 0.95, 0.78]` (terracota cálida) en lugar del valor #E85D3B linear directo. Razón: tint es MULTIPLICATIVO sobre el color final ya tonemapado — un terracota puro saturaría las paredes blancas. El valor actual da una calidez "ambient warmth" sin saturar.

### Lo que tronó

- 15 tests fallaron tras borrar las 3 escenas bootstrap (ENOENT). Atrapado y arreglado en mismo turn — refactor de 3 archivos de tests con regex-based replace + ajustes específicos.

### Pendientes para próxima sesión

**Clusters Fase 1 restantes:**
- **D-7** (demo público + Quest 3 — T-058 build prod, T-059 deploy CF Pages, T-060 QR, T-061 Quest 3 test)
- **D-4** (editor Next.js + LLM — el monstruo: 11 componentes, ~32-44 h estimadas)
- **D-6** (benchmark vs Three.js — T-062..T-064)
- **D-8** (cierre + spec Fase 2 — T-065..T-068)
- **Tasks auxiliares paralelizables** (T-069 CI, T-070 size-limit CI, T-071 lint, T-072 changelog)

### Reflexiones

**Cluster D-5 cerrado en tiempo récord.** Las 5 escenas del demo final son:
1. **Galería** — minimal cool, profesional
2. **Cocina** — cálida, identidad mexicana de barrio loft
3. **Oficina** — brand NeoNodos puro
4. **Templo** — pieza emblemática con audio
5. **Showcase** — vitrina técnica de los 18 conceptos

Las 3 escenas nuevas demuestran **TODOS los features de Fase 1**:
- Materiales parametrizables (T-018) — sala_galeria.piso, oficina.floor con `darkness`
- Conceptos geométricos `kind:concept` (T-021) — pedestales en sala_galeria, oficina; lámparas en cocina, oficina; window cut en oficina
- Audio reactivo (preexistente) — esfera dorada en oficina_neonodos
- Animaciones bob (preexistente) — esfera escultórica en sala_galeria, esfera dorada en oficina

**Tiempo de compilación per-escena ~6-10ms**: el editor (D-4) en live-reload tendrá latencia trivial. El usuario edita YAML → re-compile → re-render en <50ms incluyendo round-trip via Vite. Excelente UX.

**Fase 1 muy cerca de cierre.** Lo que queda:
- D-4 editor (caro, único bloqueador real)
- D-7 demo público (mecánico — build + deploy + QR)
- D-6 benchmark (mecánico)
- D-8 docs cierre

Si Gato apruebra orden: D-7 next (demo público accesible) → D-4 (editor — la pieza más impactante para validar H5 del spec) → D-6/D-8 (cierre).

---

## Plantilla para entradas futuras

```
## Entrada NNN · YYYY-MM-DD · <título corto>

**Duración:** <tiempo>
**Owner:** <quién>
**Asistencia:** <Claude Code / Opus / ninguno>

### Contexto
<dónde estábamos>

### Lo que se hizo
<acciones concretas>

### Decisiones tomadas
- **D-NNN:** <decisión> — <razón>

### Lo que tronó
<qué falló y por qué>

### Pendientes para próxima sesión
- [ ] <task>

### Reflexiones
<observaciones libres>
```
