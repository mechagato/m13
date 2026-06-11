/// <reference types="vite/client" />
/**
 * Cliente LLM opcional para el tab "Crear".
 *
 * Constitution §3: LLM SOLO en editor-time / demo-time, NUNCA en el runtime
 * del motor. Este módulo es parte de la app demo, no del motor.
 *
 * Configuración del endpoint (en orden de prioridad):
 *   1. localStorage.m13_llm_url
 *   2. import.meta.env.VITE_PHI_LLM_URL
 * Token: localStorage.m13_llm_token ?? 'phi-dev-local'
 *
 * Si no hay endpoint configurado → la UI cae al generador paramétrico local
 * (ver generator.ts) con nota honesta de "modo demo".
 */

// ============================================
// System prompt — DUPLICADO de packages/editor/lib/system-prompt.ts
// (el editor es un package Next.js fuera del include de este tsconfig;
// importar cross-package rompería el build de Vite/tsc. Si cambias el
// prompt del editor, sincroniza aquí.)
// ============================================
const CONCEPT_CATALOG = `
CONCEPTOS DISPONIBLES (id · categoría · descripción):

Bootstrap (sin params):
- pared_yeso_blanco · wall · Yeso blanco neutral
- pared_ladrillo_viejo · wall · Ladrillo rojizo audio-reactivo
- piso_madera_envejecida · floor · Madera con vetas senoidales
- piso_concreto_industrial · floor · Concreto pulido speckled
- marmol_blanco_vetas · universal · Mármol blanco con vetas
- piedra_volcanica · universal · Piedra oscura prehispánica
- metal_dorado_pulido · object · Dorado mate audio-reactivo (la "esfera m13")
- cuero_vintage · object · Cuero envejecido

Con params editables:
- pared_concreto_pulido · wall · params={darkness:0..1, roughness:0..1}
- pared_madera_oscura · wall · params={darkness:0..1, grainScale:1..20}
- piso_marmol_blanco · floor · params={veinIntensity:0..1}
- metal_oxidado · object · params={rustAmount:0..1}
- metal_bronce_pulido · object · params={shimmer:0..1}
- vidrio_esmerilado · object · params={clarity:0..1}

Geométricos (kind: concept):
- pedestal_marmol · object_geo · params={cornerRadius:0..0.5} · base para esculturas
- lampara_colgante · object_geo · params={glowIntensity:0..2, length:0.05..2} · luz cálida emisiva
- esfera_decorativa · object_geo · sin params · sphere blanco con iridiscencia
- cubo_basico · object_geo · sin params · box gris neutral
`.trim();

const SYSTEM_PROMPT = `Eres un asistente experto del motor m13 — un sistema de síntesis semántica de mundos 3D para WebGPU.

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

// ============================================
// Endpoint config
// ============================================
export function getLlmUrl(): string | null {
  try {
    const fromStorage = window.localStorage.getItem('m13_llm_url');
    if (fromStorage) return fromStorage.replace(/\/$/, '');
  } catch {
    /* localStorage bloqueado (modo incógnito estricto) */
  }
  const fromEnv = import.meta.env.VITE_PHI_LLM_URL as string | undefined;
  return fromEnv ? fromEnv.replace(/\/$/, '') : null;
}

function getLlmToken(): string {
  try {
    return window.localStorage.getItem('m13_llm_token') ?? 'phi-dev-local';
  } catch {
    return 'phi-dev-local';
  }
}

/** true si hay endpoint LLM configurado — la UI lo usa para el copy honesto. */
export function hasLlmEndpoint(): boolean {
  return getLlmUrl() !== null;
}

// ============================================
// Llamada al gateway (formato phi-llm-gateway, mismo que el editor)
// ============================================
interface GatewayResponse {
  content: Array<{ type: string; text: string }>;
}

/** Extrae el YAML del texto del LLM (fence ```yaml o texto crudo). */
export function extractYaml(text: string): string {
  const fenceMatch = text.match(/```(?:yaml|m13)?\s*\n([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => /^(version|name|bounds|walls|floor|ceiling):/i.test(l.trim()));
  if (startIdx >= 0) return lines.slice(startIdx).join('\n').trim();
  return text.trim();
}

/**
 * Genera un .m13 desde un prompt libre usando el endpoint LLM configurado.
 * Lanza Error si no hay endpoint o si el gateway falla — el caller decide
 * el fallback (generador local).
 */
export async function generateWithLlm(prompt: string): Promise<string> {
  const url = getLlmUrl();
  if (!url) throw new Error('Sin endpoint LLM configurado');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(`${url}/llm/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getLlmToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'auto',
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        project_id: 'm13-demo',
        cache: true,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('El endpoint LLM no respondió en 60s.');
    }
    throw new Error('No se pudo conectar con el endpoint LLM.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`El endpoint LLM devolvió ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as GatewayResponse;
  const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
  const yaml = extractYaml(text);
  if (!yaml.includes('version')) throw new Error('El LLM no devolvió YAML válido.');
  return yaml;
}
