/**
 * System prompt + few-shots para el LLM editor-time del m13.
 *
 * Objetivo: dado un prompt en español/inglés describiendo un espacio 3D,
 * el LLM genera un .m13 (YAML) válido contra el schema v0.1.
 *
 * Estrategia:
 *   1. System prompt explica formato + restricciones (categorías de concept,
 *      params permitidos, kinds de object, etc.)
 *   2. Catálogo de 18 conceptos inyectado como referencia (id + categoría + descripción)
 *   3. Few-shot examples (5) cubriendo: minimal, kind:concept, params, audio_reactive, escena completa
 *   4. Instrucciones de output: solo YAML, sin texto explicativo
 *
 * Modelo objetivo: Llama 3.3 70B Instruct (OpenRouter free) — bueno para output estructurado.
 */

// B6 (auditoría 06-12): el catálogo ya NO se escribe a mano — se genera del
// registry real de @m13/synth. Una fuente, tres consumidores (editor/MCP/eval).
// Agregar un concepto al synth lo publica aquí automáticamente, cero drift.
import { buildConceptCatalog } from '@m13/synth';

const CONCEPT_CATALOG = buildConceptCatalog();

const FEW_SHOTS = [
  // 1. Galería minimalista — usa concepts geos + params sutiles
  {
    user: 'Quiero una galería de arte minimalista con paredes blancas, piso de mármol y una escultura esférica sobre un pedestal en el centro.',
    assistant: `version: "0.1"
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
    scale: 0.4`,
  },
  // 2. Loft industrial con audio reactivo
  {
    user: 'Una cocina loft industrial con ladrillo expuesto, lámpara colgante dorada en el centro, y una esfera dorada que reaccione al audio.',
    assistant: `version: "0.1"
name: cocina_loft
description: "Loft industrial con lámpara central y esfera audio-reactiva"
bounds: [5, 3, 5]
ambient:
  tint: [1.10, 0.96, 0.82]
  fogDensity: 0.020
light:
  position: [0, 1.0, 0]
  color: [1.0, 0.85, 0.55]
  intensity: 1.5
walls:
  concept: pared_ladrillo_viejo
floor:
  concept: piso_concreto_industrial
ceiling:
  concept: pared_yeso_blanco
objects:
  - id: lampara
    kind: concept
    concept: lampara_colgante
    position: [0, 1, 0]
    scale: [0.15, 0.3, 0.15]
  - id: esfera_audio
    kind: sphere
    position: [0, -1.5, 0]
    scale: 0.35
    material: metal_dorado_pulido
    audio_reactive: true
    animate:
      mode: bob
      speed: 1.0
      amplitude: 0.1`,
  },
  // 3. Templo prehispánico (identidad mexicana, audio)
  {
    user: 'Templo prehispánico de piedra volcánica con un brasero ardiente en el centro que reaccione a sonidos.',
    assistant: `version: "0.1"
name: templo_prehispanico
description: "Templo de piedra volcánica con brasero audio-reactivo"
bounds: [5, 3.5, 5]
spawn: [0, -1, -3.5]
ambient:
  ambientColor: [0.04, 0.025, 0.015]
  tint: [1.15, 0.92, 0.7]
  fogDensity: 0.025
light:
  position: [0, -1.5, 0]
  color: [1.4, 0.7, 0.25]
  intensity: 1.8
walls:
  concept: piedra_volcanica
floor:
  concept: piedra_volcanica
ceiling:
  concept: piedra_volcanica
objects:
  - id: brasero
    kind: cylinder
    position: [0, -2.8, 0]
    scale: [0.45, 0.2, 0.45]
    material: piedra_volcanica
  - id: flama
    kind: sphere
    position: [0, -2.3, 0]
    scale: 0.3
    material: metal_dorado_pulido
    audio_reactive: true
    animate:
      mode: bob
      speed: 4.0
      amplitude: 0.08`,
  },
  // 4. Identidad NeoNodos (terracota + dorado)
  {
    user: 'Oficina con la identidad de NeoNodos: tonos terracota cálidos, piso de madera oscura, y una esfera dorada audio-reactiva como pieza emblemática.',
    assistant: `version: "0.1"
name: oficina_neonodos
description: "Oficina identidad NeoNodos — terracota + madera oscura + dorado"
bounds: [5.5, 3, 5.5]
ambient:
  tint: [1.08, 0.95, 0.78]
  fogDensity: 0.015
light:
  position: [0, 2.8, 0]
  color: [1.0, 0.88, 0.65]
  intensity: 1.4
walls:
  concept: pared_yeso_blanco
floor:
  concept: pared_madera_oscura
  params:
    darkness: 0.5
    grainScale: 6
ceiling:
  concept: pared_yeso_blanco
objects:
  - id: pedestal
    kind: concept
    concept: pedestal_marmol
    position: [0, -2.5, 0]
    scale: [0.45, 0.45, 0.45]
  - id: esfera_emblema
    kind: sphere
    position: [0, -1.5, 0]
    scale: 0.42
    material: metal_dorado_pulido
    audio_reactive: true
    animate:
      mode: bob
      speed: 0.5
      amplitude: 0.1`,
  },
  // 5. Minimal — solo lo básico, sin overengineering
  {
    user: 'Un cuarto vacío con paredes blancas y piso de madera. Nada más.',
    assistant: `version: "0.1"
name: cuarto_vacio
walls:
  concept: pared_yeso_blanco
floor:
  concept: piso_madera_envejecida
ceiling:
  concept: pared_yeso_blanco`,
  },
];

export const SYSTEM_PROMPT = `Eres un asistente experto del motor m13 — un sistema de síntesis semántica de mundos 3D para WebGPU.

TU TAREA: dado un prompt en español o inglés describiendo un espacio 3D, generar un descriptor \`.m13\` válido (YAML). Solo emites el YAML — sin explicación, sin markdown, sin texto antes o después.

REGLAS DE FORMATO:
1. El YAML debe comenzar con \`version: "0.1"\` (exacto, con comillas)
2. Campos obligatorios: name, walls (con .concept), floor (con .concept), ceiling (con .concept)
3. Campos opcionales: description, bounds, spawn, ambient, light, window, objects
4. Solo usa conceptos del catálogo abajo. NO inventes ids.
5. \`kind\` válidos: sphere, box, round_box, cylinder, torus, concept
6. Cuando \`kind: concept\` → requiere campo \`concept: <id>\` y NO requiere \`material\`
7. Cuando \`kind\` es primitivo → requiere campo \`material\` (string o {concept, params})
8. Si el concept tiene params, los puedes pasar bajo \`params:\` validar contra los rangos del catálogo
9. \`audio_reactive: true\` hace que el objeto reaccione al micrófono — usar para piezas centrales o emblemáticas
10. \`animate.mode\` válidos y funcionales: \`bob\` (sube/baja), \`rotate\` (giro continuo en Y, speed = rad/s), \`pulse\` (escala oscilante)
11. \`rotation: [x, y, z]\` opcional en objetos — grados, Euler XYZ extrínseco
12. \`window\` (opcional) es un OBJETO con dos campos, nunca un array:
    window:
      position: [x, y, z]
      size: [w, h, d]      # los 3 valores > 0, obligatorio si hay window
13. \`ambient.background: [r, g, b]\` define el color de fondo (miss del raymarch)

RESTRICCIONES NUMÉRICAS (el schema RECHAZA la escena si se violan):
- \`bounds\`, \`scale\` y \`window.size\`: todos sus valores deben ser > 0 (nunca 0 ni negativos)
- Colores ([r,g,b]): cada canal ≥ 0 (HDR > 1 sí es válido, negativos NO)
- \`light.intensity\` ≥ 0
- \`animate.amplitude\` ≥ 0

${CONCEPT_CATALOG}

ESTÉTICA Y CONVENCIONES NeoNodos:
- Galería: ambient frío, luz cenital, mármol + yeso, esfera blanca decorativa
- Loft industrial: ambient cálido ámbar, ladrillo + concreto + lámpara colgante + bronce
- NeoNodos brand: tint terracota cálido [1.08, 0.95, 0.78], madera oscura piso, esfera dorada audio-reactiva
- Templo/prehispánico: piedra volcánica todo, brasero audio-reactivo con metal_dorado_pulido bob 4.0
- Si dice "cuarto vacío" o "minimal" — devuelve YAML mínimo, sin objects

SIEMPRE responde SOLO con el YAML del archivo. Nada más.`;

export const FEW_SHOT_MESSAGES = FEW_SHOTS.flatMap((shot) => [
  { role: 'user' as const, content: shot.user },
  { role: 'assistant' as const, content: shot.assistant },
]);
