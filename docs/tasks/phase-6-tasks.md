# Tasks - Fase 6: tiempo, replay determinista y Sabio Compositor

**Spec:** `docs/spec/phase-6-spec.md` · **Serie:** T-6xx · **Target:** 0.4.0
**Estado:** autorizada el 2026-07-27. Fase 3 permanece congelada. Produccion no trazable no es
base de implementacion: `main` y CI son la fuente canonica.

| Task | Entrega | Gate de terminado |
|---|---|---|
| T-601 | Modelo `.m13 v0.2`, migracion v0.1 -> v0.2 y parser estricto por version | v0.1 conserva hashes; v0.2 rechaza contrato invalido |
| T-602 | Tipos temporales, orden/cap de keyframes y easing `smooth` | pruebas de interpolacion, limites y no finitos |
| T-603 | Compiler de transform keyframes a WGSL | mismo tiempo produce WGSL/hash determinista; sin CPU por frame para transform |
| T-604 | Evento P1 `light_flash` sin side effects | evento determinista y fuera de runtime de audio real |
| T-605 | `RecordController` 2D y formato `.m13replay` | record -> export -> replay reproduce pose con interpolacion estable |
| T-606 | Carga/comparticion de replay con limite de bytes | payload invalido o sobredimensionado no llega al runtime |
| T-607 | Demo `chichen_amanecer.m13` y controles del example | animacion visible; v0.1 no regresa visualmente |
| T-608 | Sabio Compositor P2 editor-time | prompt/voz genera v0.2 valido; runtime no llama LLM |
| T-609 | Validacion final, deploy trazable y evidencia | coverage, lint, build, hashes, prueba visual y BITACORA |

## Orden obligatorio

1. T-601/T-602 antes de tocar WGSL.
2. T-603/T-604 antes de demo o Compositor.
3. T-605/T-606 antes de prometer replay compartible.
4. T-608 es P2: no bloquea el nucleo temporal ni justifica saltar tests.
5. T-609 requiere que el deploy se pueda asociar a SHA y que Fase 5 mantenga su evidencia separada.

## Fuera de alcance

- ONNX, dataset, entrenamiento, inferencia neural y licencia de Fase 3.
- Material temporal, fisica, particulas, audio runtime y multiplayer.
- Declarar FPS estereo o cerrar Fase 5 sin evidencia de Quest.
