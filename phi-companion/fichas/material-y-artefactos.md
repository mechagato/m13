---
name: material-y-artefactos
description: Material de referencia (HTMLs) recibido 2026-06-25, su clasificación y destino.
metadata: {type: project}
---

# Material de referencia y artefactos reutilizables (2026-06-25)

Gato pasó un ZIP (`ref-claudedesign/Materialpara-phi&m13 (1).zip`) con 6 HTMLs de diseño +
`animations.jsx` + `countries.geojson`. Analizados y clasificados. Ubicados en
`ref-claudedesign/artefactos/` (decisión de Gato: "carpeta en m13"). README ahí.

## Destino por archivo (decidido por Gato)
- **CAD Designer Kit v2** → **FlowCAD** (Gato lo usará ahí + ediciones). Es el showcase objetivo
  de m13 vía CSG. Guardado en `artefactos/_flowcad-bound/` hasta migrar a repo flowcad.
- **CAD Designer Kit v1** → descartado (no se usa).
- **Globo Interactivo** (`artefactos/globo/`) → artefacto "vista de mapa" reutilizable. Candidato
  a m13 cuando exista coloreado de superficie por datos. Hoy Three.js+globe.gl.
- **Cosmic AI Animation** (`artefactos/cosmic/`) → motor de presentaciones/informes visuales para
  redes. **Pendiente: re-colorear a identidad NeoNodos** (brand `#E85D3B` + design-system) antes de
  producción. Invocar bajo demanda cuando Gato diga "ve por el Cosmic".
- **AI Thinking Spinners** (`artefactos/spinners/`) + **Chat Agent Showroom** (`artefactos/chat/`)
  → recursos para UIs de chat/IA ("se ve pro mientras la IA piensa"). No aplican a m13 (2D/UI).

## Visión a futuro
Reunir Globo + Cosmic + Spinners + Chat en **un solo HTML de referencia** con identidad de marca,
para invocarlos en cualquier desarrollo NeoNodos. Objetivo: vernos superiores a la competencia.

Relacionado: el gap CSG/CAD y la división de repos están en [[decisiones]].
