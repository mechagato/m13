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

## 2026-06-26 — m13 ↔ FlowCAD: concluir POR SEPARADO (decisión de Gato)

**Hallazgo (revisé `~/neonodos-core/neocad`):** FlowCAD/NeoCAD va muy avanzado (~80% MVP) pero
**NO usa m13.** Renderiza con **CadQuery/OpenCascade (kernel CAD real) + Three.js (mallas)** —
genera mallas exactas y exporta STEP/STL. El `.m13` de FlowCAD es un *mesh JSON*, no las escenas
SDF de m13. La directiva vieja "m13 = render engine de FlowCAD" **ya no aplica**: para CAD de
fabricación, CadQuery (preciso, exporta) es superior al SDF de m13; forzarlo sería downgrade.

**Decisión de Gato (2026-06-26): concluir cada uno por separado.** FlowCAD cierra su MVP solo
(deploy + pulido + ensayo, lo lleva su sesión/companion-flowcad). m13 cierra el suyo (Chichén +
Quest). **El puente m13↔FlowCAD = post-cierre.**

**La jugada correcta para Innovafest (cuando se retome el puente):** m13 NO reemplaza el render de
FlowCAD; m13 es la **capa de visualización web/XR compartible** — toma el diseño de FlowCAD y lo
vuelve un link caminable en navegador/Quest sin instalar nada ("la URL es el mundo"). FlowCAD diseña
(preciso), m13 distribuye/visualiza. Cada uno hace lo que mejor hace.

**Nota:** los docs estratégicos de FlowCAD (READY_INVESTOR, ROADMAP, STRATEGY) son de MAYO (demo
inversor 21-may, cocinas-builder); el desarrollo de junio pivoteó a flowcad-desktop genérico (piezas
mecánicas). Su companion debería actualizarlos.
