/**
 * Guía de autoría del formato .m13 para LLMs — tool get_m13_format_guide.
 *
 * Adaptada del system prompt del editor (packages/editor/lib/system-prompt.ts,
 * 100% pass rate en el eval T-052/053). No se importa directo desde ahí para no
 * acoplar el MCP al package Next.js del editor; en cambio, las REGLAS se replican
 * aquí y el CATÁLOGO de conceptos se genera dinámicamente desde @m13/synth en
 * cada llamada — la parte que driftea (los conceptos) nunca puede driftear.
 */

import { buildConceptCatalog as buildConceptCatalogShared } from '@m13/synth';
import { SUPPORTED_VERSION } from '@m13/runtime';

// ============================================================
// Catálogo dinámico — generado desde el registry real
// ============================================================

// B6 (auditoría 06-12): catálogo compartido desde @m13/synth — una fuente
// para editor, MCP y eval. El builder local se eliminó.
const buildConceptCatalog = buildConceptCatalogShared;

// ============================================================
// Guía completa
// ============================================================

const EXAMPLE_MINIMAL = `version: "0.1"
name: cuarto_vacio
walls:
  concept: pared_yeso_blanco
floor:
  concept: piso_madera_envejecida
ceiling:
  concept: pared_yeso_blanco`;

const EXAMPLE_COMPLETE = `version: "0.1"
name: galeria_minimalista
description: "Galería minimalista con escultura esférica central"
bounds: [6, 3.5, 6]
spawn: [0, 0, -4]
ambient:
  ambientColor: [0.18, 0.19, 0.21]
  fogDensity: 0.010
light:
  position: [0, 3, 0]
  color: [1.0, 1.0, 1.05]
  intensity: 1.2
walls:
  concept: pared_yeso_blanco
floor:
  concept: piso_marmol_blanco
  params:
    veinIntensity: 0.3
ceiling:
  concept: pared_yeso_blanco
objects:
  - id: pedestal
    kind: concept
    concept: pedestal_marmol
    position: [0, -2.5, 0]
    scale: [0.4, 0.4, 0.4]
  - id: escultura
    kind: concept
    concept: esfera_decorativa
    position: [0, -1.5, 0]
    scale: 0.4
  - id: esfera_audio
    kind: sphere
    position: [1.5, -1.5, 1]
    scale: 0.35
    material: metal_dorado_pulido
    audio_reactive: true
    animate:
      mode: bob
      speed: 1.0
      amplitude: 0.1`;

/**
 * Construye la guía de autoría .m13 completa. El catálogo de conceptos se
 * resuelve en el momento de la llamada — siempre refleja el registry real.
 */
export function buildFormatGuide(): string {
  return `# Guía de autoría del formato .m13 (v${SUPPORTED_VERSION})

Un archivo .m13 es un descriptor YAML semántico de un espacio 3D habitable.
El motor m13 lo sintetiza en tiempo real con SDF raymarching sobre WebGPU —
sin assets, sin red, 100% local en el dispositivo del usuario.

## REGLAS DE FORMATO

1. El YAML debe comenzar con \`version: "${SUPPORTED_VERSION}"\` (exacto, con comillas)
2. Campos obligatorios: name, walls (con .concept), floor (con .concept), ceiling (con .concept)
3. Campos opcionales: description, bounds, spawn, ambient, light, window, objects
4. Solo usa conceptos del catálogo abajo. NO inventes ids.
5. \`kind\` válidos en objects: sphere, box, round_box, cylinder, torus, concept
6. Cuando \`kind: concept\` → requiere campo \`concept: <id>\` (categoría object_geo) y NO requiere \`material\`
7. Cuando \`kind\` es primitivo → requiere campo \`material\` (string o {concept, params})
8. Si el concept tiene params, los puedes pasar bajo \`params:\` respetando los rangos del catálogo
9. \`audio_reactive: true\` hace que el objeto reaccione al micrófono — úsalo para piezas centrales o emblemáticas
10. \`animate.mode\` válidos y funcionales: \`bob\` (sube/baja), \`rotate\` (giro continuo en Y, speed = rad/s), \`pulse\` (escala oscilante)
11. \`rotation: [x, y, z]\` opcional en objetos — grados, Euler XYZ extrínseco
12. \`window\` (opcional) es un OBJETO con dos campos, nunca un array:
    window:
      position: [x, y, z]
      size: [w, h, d]      # los 3 valores > 0, obligatorio si hay window
13. \`ambient.background: [r, g, b]\` define el color de fondo (miss del raymarch)

## RESTRICCIONES NUMÉRICAS (el schema RECHAZA la escena si se violan)

- \`bounds\`, \`scale\` y \`window.size\`: todos sus valores deben ser > 0 (nunca 0 ni negativos)
- Colores ([r,g,b]): cada canal ≥ 0 (HDR > 1 sí es válido, negativos NO)
- \`light.intensity\` ≥ 0
- \`animate.amplitude\` ≥ 0

## CONCEPTOS DISPONIBLES (id · categoría · descripción · params)

${buildConceptCatalog()}

Notas de categorías:
- wall/floor/ceiling: para las superficies del cuarto
- universal: sirve en cualquier superficie u objeto
- object: material para objetos primitivos
- object_geo: concepto geométrico — se usa con \`kind: concept\`

## ESTÉTICA Y CONVENCIONES NeoNodos

- Galería: ambient frío, luz cenital, mármol + yeso, esfera blanca decorativa
- Loft industrial: ambient cálido ámbar, ladrillo + concreto + lámpara colgante + bronce
- NeoNodos brand: tint terracota cálido [1.08, 0.95, 0.78], madera oscura piso, esfera dorada audio-reactiva
- Templo/prehispánico: piedra volcánica todo, brasero audio-reactivo con metal_dorado_pulido bob 4.0
- Si piden "cuarto vacío" o "minimal" — YAML mínimo, sin objects

## EJEMPLO MÍNIMO

\`\`\`yaml
${EXAMPLE_MINIMAL}
\`\`\`

## EJEMPLO COMPLETO

\`\`\`yaml
${EXAMPLE_COMPLETE}
\`\`\`

## FLUJO RECOMENDADO

1. Escribe el YAML siguiendo esta guía
2. Valídalo con el tool \`validate_m13_scene\` — si falla, corrige con el mensaje de error exacto
3. Compártelo con \`share_m13_scene\` — el link abre el mundo 3D caminable en el navegador (WASD + mouse)`;
}
