# Tasks - Fase 4: splatting hibrido

**Estado:** BORRADOR. Requiere G4-1 de `docs/spec/phase-4-spec.md`.

| Task | Entrega | Gate |
|---|---|---|
| T-401 | Manifiesto de activo splat | hash, licencia, version y presupuesto validados |
| T-402 | ModelRegistry generico | cache, dedupe y descarte GPU sin leaks |
| T-403 | Schema `gaussian_splat` | parser estricto rechaza contratos invalidos |
| T-404 | MultiPipelineRenderer | pass SDF y pass splat con orden definido |
| T-405 | Composicion de profundidad | smoke WebGPU sin z-fighting en activo piloto |
| T-406 | Loader y fallback | fallo de red/hash/memoria conserva SDF funcional |
| T-407 | Benchmark y evidencia | memoria, carga, FPS medido y deploy trazable |

## Restricciones

- No ONNX, inferencia, entrenamiento o dataset neural.
- No activo sin licencia o consentimiento verificable.
- No afirmar soporte Quest antes de T-501/T-513.
- Ninguna tarea inicia antes de aprobar formato, activo y presupuesto G4-1.
