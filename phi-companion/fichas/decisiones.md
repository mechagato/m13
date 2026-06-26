---
name: decisiones
description: Bitácora de decisiones tomadas (por qué se hizo así).
metadata: {type: project}
---

# Decisiones

(Registra aquí las decisiones de diseño/arquitectura y su porqué, para no
re-litigarlas en cada sesión.)

## 2026-06-25 — Material de referencia + roadmap CSG (decididas por Gato)

- **CSG (operaciones booleanas en `.m13`) va DESPUÉS de Fase 2.** Es la capacidad que falta
  para el showcase CAD/FlowCAD de Innovafest (restar pocket/barrenos = `opSub`, fillets =
  `opSmoothUnion`). Hallazgo clave: el WGSL de esas operaciones **ya existe** en
  `runtime/src/shaders/common.ts:74-83` — hoy solo se usan internamente para recortar ventanas;
  falta exponerlas en el schema de objeto + que `generateMapFunction()` (compiler) las use.
  Primitivas (box/round_box/cylinder), rotación y escala ya están. Gusset→mirror y PBR metálico
  son gaps menores. **Por qué después:** Gato priorizó terminar Fase 2 (detalle continuo) primero.
  Cuando se abra, requiere su propio Spec Kit (toca schema+compiler+tests). Ver [[material-y-artefactos]].

- **División de repos para el showcase CAD:** la capacidad del motor (CSG) + la escena `.m13` de
  prueba viven en el repo **m13**; el shell CAD (UI, feature tree, ediciones de Gato) vive en
  **flowcad**, que ya consume m13 como bundle drop-in (D-2107). El motor no se ensucia de lógica CAD.

- **Globo Interactivo → "prepararse para que m13 lo haga".** Esfera ya existe; falta capacidad de
  coloreado de superficie por datos (lat/lon) + atmósfera/fresnel + nubes. Va DESPUÉS del CAD.

- **Easter eggs (notas.txt) en commit aislado `d4f4ba4`**, separados de Fase 2, por instrucción
  explícita de Gato ("solo estos 4 cambios"). Respetada la regla un-commit-un-cambio.

## 2026-06-26 — Decisiones de Fase 2 (barrida autopilot)

- **Detalle continuo como DEFAULT, toggle por SIGNO de `quality.w`:** continuousDetail on = octaveCap
  positivo, off = negativo. Elegido sobre agregar un campo al uniform (D-3002 fijó el layout). La
  auditoría señaló el riesgo de octaveCap=0 (-0 IEEE) → se clampa magnitud >=1.
- **`fbm_norm` + normalización de `fbm_continuous`:** sin normalizar, el rango crecía con las octavas →
  deriva de luminancia ("la pared cambia de tono al caminar"). Se normaliza por la suma de amplitudes.
  El modo fijo del A/B usa `fbm_norm` para comparar DETALLE, no brillo.
- **Modo exterior por AUSENCIA de walls/ceiling** (no un flag explícito): suelo plano + cielo. Las 10
  escenas interiores quedan byte-idénticas (sky/exterior gating estricto, F10).
- **Seeds = offset de dominio en el material** (no en la geometría): instancias hermanas, no clones.
- **Auditoría adversarial multi-agente ANTES de cada deploy de WGSL** (no puedo validar el render sin
  GPU). Workflow de 4 lentes refutando; aplicar fixes; deploy solo si 0 crit/high.
- **Pendiente clave: validación VISUAL de Gato** — todo lo visual (look del detalle continuo, Chichén
  Itzá, F6 Nyquist, micro-detalle) requiere su laptop con WebGPU; Cerebro4 (GT710) no renderiza WebGPU.
