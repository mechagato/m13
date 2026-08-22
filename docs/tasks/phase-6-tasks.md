# Tasks - Fase 6: tiempo, replay determinista y Sabio Compositor

**Spec:** `docs/spec/phase-6-spec.md` · **Serie:** T-6xx · **Target:** 0.4.0
**Estado:** autorizada el 2026-07-27. Fase 3 permanece congelada. Produccion no trazable no es
base de implementacion: `main` y CI son la fuente canonica.

| Task | Entrega | Gate de terminado |
|---|---|---|
| T-601 | Modelo `.m13 v0.2`, migracion v0.1 -> v0.2 y parser estricto por version | ✅ v0.1 conserva hashes; v0.2 enruta y rechaza contrato invalido |
| T-602 | Tipos temporales, orden/cap de keyframes y easing `smooth` | ✅ pruebas de contrato, limites y orden canonico |
| T-603 | Compiler de transform keyframes a WGSL | ✅ position/rotation/scale y easing se emiten en WGSL; pruebas de determinismo y hashes v0.1 verdes |
| T-604 | Evento P1 `light_flash` sin side effects | ✅ schema v0.2 y pulso triangular acotado en WGSL; sin audio runtime |
| T-605 | `RecordController` 2D y formato `.m13replay` | ✅ muestreo fijo, JSON con hash, interpolacion angular y engine sin input vivo durante replay |
| T-606 | Carga/comparticion de replay con limite de bytes | ✅ `#scene=...&replay=...` limitado a 24 KiB; payload invalido no llega al runtime |
| T-607 | Demo `chichen_amanecer.m13` y controles del example | ✅ escena v0.2 en selector + test determinista; Quest/F5 PASS del mantenedor cubre confort general (amanecer 2D sigue smoke local) |
| T-608 | Sabio Compositor P2 editor-time | ✅ MCP/generador local compone prompt temporal a v0.2 y valida WGSL; runtime no llama LLM |
| T-609 | Validacion final, deploy trazable y evidencia | En cierre OSS 2026-08-22: suite CI local + docs honestos + MIT; deploy Pages a re-verificar tras push del SHA de cierre |

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
