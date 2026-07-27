# Spec Kit - Fase 4: Gaussian Splatting hibrido

**Estado:** BORRADOR para aprobacion. No autoriza implementacion.

## Objetivo

Combinar SDF semantico de M13 con capturas reales autorizadas representadas como
`kind: gaussian_splat`, conservando profundidad correcta, cache por hash y fallback seguro.

## Alcance inicial

- Un activo propio o con licencia verificable en formato documentado.
- `ModelRegistry` generico con hash, cache y descarte de recursos GPU.
- `MultiPipelineRenderer`: SDF + splat con composicion de profundidad.
- Schema v0.2 estricto, loader, contrato de memoria y smoke WebGPU real.

## Fuera de alcance

- ONNX, inferencia, entrenamiento, dataset neural o licencias de Fase 3.
- Edicion de splats, captura movil automatica, avatars, fisica y promesas de fotorealismo.

## Decisiones a aprobar

1. Formato: splat binario versionado, manifiesto JSON, SHA-256 y licencia.
2. Piloto: captura propia autorizada, sin rostros ni ubicacion sensible.
3. Desktop: 128 MiB GPU por splat, un activo visible, descarga maxima 32 MiB.
4. Quest: solo despues de evidencia T-501/T-513; sin afirmacion de soporte antes.
5. Calidad: profundidad estable contra SDF y fallback a SDF si la carga falla.

## Gates

- G4-1: spec, formato, licencia y activo piloto aprobados.
- G4-2: parser y registry rechazan hash, version o presupuesto invalidos.
- G4-3: SDF y splat componen profundidad correctamente en smoke WebGPU.
- G4-4: benchmark con memoria, tiempo de carga y FPS medido por plataforma.
- G4-5: evidencia visual y deploy asociado a SHA.

## Orden

Primero aprobar este kit; despues tareas T-4xx y solo entonces codigo de renderer. Fase 3 permanece congelada.
