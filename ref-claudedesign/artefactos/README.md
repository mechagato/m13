# Artefactos reutilizables — referencia para desarrollos NeoNodos

Recursos de UI/visualización de alta calidad (origen: artifacts de diseño) que Gato
decidió conservar como **biblioteca de referencia reutilizable** para el resto de los
desarrollos NeoNodos. Objetivo: vernos superiores a la competencia y estandarizar
calidad/estilo. Clasificación y destino decididos por Gato el 2026-06-25.

> El objetivo final es reunirlos en **un solo HTML de referencia** con la identidad de
> marca NeoNodos aplicada, para invocarlos bajo demanda en cualquier proyecto.

| Carpeta | Qué es | Uso previsto | ¿m13? |
|---|---|---|---|
| `globo/` | Atlas 3D interactivo (Three.js 0.149 + globe.gl + `countries.geojson`). Drag/zoom/hover, países por color, loader "Cargando Atlas" | **Artefacto "vista de mapa"** estandarizado para cualquier desarrollo que requiera mapa/globo | **Candidato a m13** (esfera procedural + atmósfera). Requiere capacidad futura: coloreado de superficie por datos lat/lon. Hoy globe.gl gana en precisión GeoJSON |
| `cosmic/` | Presentación animada (React + `animations.jsx`), 11 escenas, stats de IA | **Motor de presentaciones / informes visuales** para redes y difusión de proyectos. Reutilizable | m13 como **fondo 3D embebido** entre escenas |
| `spinners/` | 20 spinners/loaders "IA pensando" (CSS + canvas 2D) | **Recurso para UIs de chat/IA**: que se vea profesional mientras la IA piensa | No aplica (2D puro) |
| `chat/` | Showroom de 6 estilos de animación de chat-agente (React + CSS) | **Recurso para UIs de chat** (igual que spinners) | No aplica (UI pura) |

## Pendientes de adaptación (cuando Gato lo pida)

- **`cosmic/`** → re-colorear a la **identidad de marca NeoNodos** (brand `#E85D3B` y tokens
  del design-system) manteniendo calidad/formato/estilo. Es el requisito mínimo antes de
  usarlo en producción para redes/informes.
- **`globo/`** → cuando m13 tenga coloreado de superficie por datos, recrear como escena m13
  (esfera SDF + atmósfera/fresnel + nubes) para superar a globe.gl en estética. Ver gap en
  la bitácora / memoria del companion.
- **`spinners/` + `chat/`** → extraer los componentes a la biblioteca de UI cuando se necesiten
  en un frontend conversacional.

## No reutilizables (referencia aparte)

- `_flowcad-bound/CAD Designer Kit v2.html` — shell CAD con Three.js. **No es artefacto
  reutilizable**: va al proyecto **FlowCAD** (Gato lo usará ahí + ediciones propias). Su pieza
  mecánica es el showcase objetivo de m13 vía CSG (capacidad post-Fase 2). Se deja aquí solo
  como referencia hasta migrarlo a `flowcad`.
- CAD Designer Kit v1 — **descartado** por Gato (no se usa).

## Notas técnicas

- `globo/` carga `countries.geojson` localmente (con fallback a CDN); se incluye también en
  `example/datasets/` que es la ruta alterna que el HTML busca.
- `cosmic/Cosmic AI Animation.html` depende de `animations.jsx` (incluido en la misma carpeta).
- `_screenshots/` — capturas de referencia de todos los artefactos.
- Fuente original: `ref-claudedesign/Materialpara-phi&m13 (1).zip`.
