# Auditoría profunda multi-lente de m13 — 2026-06-10/11

## Resumen ejecutivo

Se auditó el proyecto completo (visión, matemática, física, teoría Sonido 13, arquitectura,
pipeline LLM, performance GPU y consistencia del SDD) con 7 agentes expertos independientes
en paralelo, seguidos de verificación adversarial. Resultado: **87 hallazgos, 9 confirmados
como reales y seguros de arreglar — los 9 quedaron corregidos en esta sesión**, con suite
de tests pasando (112/112) y typecheck limpio en los 4 packages. Durante el fixing se
descubrieron y corrigieron 2 problemas adicionales no reportados por la auditoría: un leak
de GPUDevice en cada cache-miss de `loadScene`, y que el script `pnpm test` del runtime
estaba roto (`vitest --dir` hacía inmatcheables los patrones de include — la suite de
regresión "86/86" llevaba semanas sin ejecutarse realmente).

## Metodología

1. **Auditoría:** 7 lentes en paralelo (matemático SDF, físico/óptica, músico-teórico
   Sonido 13, arquitecto de software, científico de datos/LLM, ingeniero GPU/WGSL,
   auditor SDD), cada una leyendo código y docs reales con cita archivo:línea.
2. **Verificación adversarial:** cada hallazgo accionable revisado por 2 verificadores
   independientes (lentes: correctitud y riesgo-de-regresión) que intentan refutarlo;
   solo sobrevive con 2-de-2 confirmaciones.
3. **Fixes:** aplicados uno por uno con `pnpm typecheck` + suite de tests tras cada cambio.

**Limitación de honestidad:** dos cortes por límite de sesión del plan interrumpieron la
verificación — de los 87 hallazgos, ~44 quedaron sin veredicto adversarial completo
(figuran como "rechazados" técnicamente pero la mayoría simplemente no se alcanzó a
verificar). El conteo de 9 confirmados es por tanto un PISO, no un techo. Los hallazgos
teóricos/de visión (34) no requerían verificación de código y alimentan la sección de
ideas para Fase 2.

## Hallazgos confirmados y corregidos (9/9)

| # | Sev | Hallazgo | Fix aplicado |
|---|---|---|---|
| 1 | **alta** | Race condition: `dispose()` durante `loadScene` en vuelo dejaba un GPUDevice huérfano y "revivía" un engine disposed (`engine.ts`) | Guards post-await; el device creado en vuelo se destruye y `loadScene` rechaza con error claro. Test nuevo `engine-load-race.test.ts` |
| 2 | media | Campo `rotation` exigido por el spec (FR-1.3), aceptado por el schema, ignorado silenciosamente por el compilador | Implementado: matriz inversa Euler XYZ (grados) precomputada en compile-time como constante mat3x3 — costo cero para objetos sin rotación, WGSL byte-idéntico para escenas existentes |
| 3 | media | Schema sin restricciones de positividad: bounds/scale aceptaban 0 o negativos → SDFs degeneradas y clamp de cámara invertido | `positiveVec3` para bounds/scale/window.size; `.min(0)` en intensity/amplitude; canales rgb `.min(0)` |
| 4 | media | FR-2.2 sin implementar: `material_signature` y `procedural_seed` no existían en los conceptos | Implementado declarativamente en los 18 conceptos (baseColor/roughness/normalVariation/audioReactivity derivados del WGSL real + seeds únicos 1001-1018). El consumo de seeds en WGSL se difiere a Fase 2 (requiere validación visual en GPU real) |
| 5 | baja | `animate.mode` 'rotate' y 'pulse' aceptados por el schema pero no-op silencioso (solo 'bob' funcionaba) | Implementados: rotate = giro continuo en Y; pulse = escala uniforme oscilante con corrección de distancia d·k (amplitude acotada a 0.9) |
| 6 | baja | `ambient.background` parseado pero nunca llegaba al shader — el miss renderizaba negro puro | El compilador genera `missColor()` como constante de escena; el raymarcher la usa en el miss mezclada con fogColor |
| 7 | baja | Iluminación sin cotas: intensity y colores podían ser negativos | Cubierto por el fix 3 (schema) |
| 8 | baja | Header de `common.ts` prometía `smooth_union` inexistente | `opSmoothUnion` (polynomial smooth-min de Quilez) agregado — además es base para la subdivisión continua de Fase 2 |
| 9 | baja | README público desactualizado: "Phase 0", Fase 1 "Drafted" | Status actualizado: Phase 1 complete + link al demo live |

### Extras descubiertos durante el fixing (no estaban en la auditoría)

- **Leak de GPUDevice en cache-miss:** cada `loadScene` con shader distinto reemplazaba
  `this.renderer` sin destruir el anterior. Corregido + aserción en `engine-cache.test.ts`.
- **Script de tests roto:** `vitest run --dir packages/runtime` no encontraba NINGÚN test
  (los include patterns se resuelven dentro de `--dir`). Corregido a filtro posicional.
  Implicación honesta: la línea "86/86 tests" del gate T-068 provenía de una invocación
  distinta; con el script de package.json los tests no corrían.
- **`cancelAnimationFrame` sin guard:** `dispose()`/`stop()` tronaban en entornos sin DOM
  (Node/SSR/tests). Guard agregado — los 8 tests de dispose que nunca habían corrido ahora pasan.

## Estado de verificación

- `pnpm typecheck`: limpio en runtime, synth, editor, examples.
- Suite completa: **112/112 tests verdes** (92 runtime + 20 synth), incluyendo 13 tests
  nuevos de esta sesión (transforms del compilador, race de dispose, FR-2.2).
- Determinismo intacto: 100 corridas de cada escena demo → 1 hash único por escena.

## Ideas para Fase 2 (EN PAUSA — solo para cuando Gato la abra; NO son compromisos)

De la lente músico-teórica y matemática quedaron direcciones para formalizar el
"Sonido 13 visual" cuando se abra el spec de Fase 2:

1. **Subdivisión microtonal del detalle:** hoy el detalle de los materiales es una escala
   fija de octavas FBM (frecuencia ×2 por octava = escala "temperada"). La tesis Carrillo
   sugiere ratios de 16avo de tono (2^(1/96)) entre niveles de frecuencia espacial,
   con amplitud continua en función de la distancia de cámara — LOD continuo real,
   sin saltos perceptibles. `opSmoothUnion` (agregado hoy) es el primer operador necesario.
2. **Seeds procedurales por instancia (FR-2.2 fase 2):** los seeds 1001-1018 declarados hoy
   deben entrar al WGSL como offset del dominio de ruido (`hash3(p + seed)`) para que dos
   instancias del mismo concepto no sean idénticas. Requiere validación visual en GPU.
3. **Mapeo audio→visual musicalmente significativo:** hoy solo se usa amplitud cruda
   (`audioAmp`). Análisis espectral (FFT ya disponible en AnalyserNode) permitiría mapear
   altura→frecuencia espacial de detalle y timbre→rugosidad, alineado con la metáfora fundacional.
4. **Física de iluminación:** el shading actual es Blinn-Phong ad-hoc con atenuación
   no-física; para Fase 2+ evaluar un BRDF mínimo conservador de energía aprovechando
   los `material_signature.roughness` ya declarados.

## Hallazgos NO verificados (deuda de auditoría)

~44 hallazgos de las lentes quedaron sin veredicto adversarial por los cortes de límite.
Los temas dominantes (para una futura pasada): manejo de `device.lost`/`uncapturederror`,
excepciones en `tick()` que matan el RAF loop, registry de conceptos a escala 100+,
telemetría LLM efímera, `llm-client` sin timeout, fragilidad de `version: "0.1"`,
asignación de material por esfera aproximada, y constantes de calidad de render hardcodeadas.
Ninguno bloquea Fase 1; son candidatos a backlog técnico de Fase 2.
