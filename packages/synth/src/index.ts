/**
 * @m13/synth — librería de conceptos materiales y geométricos procedurales.
 *
 * Cada concepto exporta:
 *  - una función WGSL `mat_<id>(p, n, audioAmp) -> vec3<f32>` para color material
 *  - opcionalmente una función WGSL `sdf_<id>(p, params)` cuando es geométrico
 *  - opcionalmente un Zod schema con sus parámetros editables
 *
 * El registry permite que el compilador resuelva conceptos por id, y que el
 * editor (D-4) introspecte sus manifests para mostrar UI de edición.
 */

import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ---- Bootstrap (8 conceptos originales) ----
import { paredYesoBlanco } from './concepts/pared_yeso_blanco.js';
import { paredLadrilloViejo } from './concepts/pared_ladrillo_viejo.js';
import { pisoMaderaEnvejecida } from './concepts/piso_madera_envejecida.js';
import { pisoConcretoIndustrial } from './concepts/piso_concreto_industrial.js';
import { metalDoradoPulido } from './concepts/metal_dorado_pulido.js';
import { marmolBlancoVetas } from './concepts/marmol_blanco_vetas.js';
import { piedraVolcanica } from './concepts/piedra_volcanica.js';
import { cueroVintage } from './concepts/cuero_vintage.js';

// ---- D-3 / Fase 1 (10 conceptos: 6 materiales + 4 geométricos) ----
import { paredConcretoPulido } from './concepts/pared_concreto_pulido.js';
import { paredMaderaOscura } from './concepts/pared_madera_oscura.js';
import { pisoMarmolBlanco } from './concepts/piso_marmol_blanco.js';
import { metalOxidado } from './concepts/metal_oxidado.js';
import { metalBroncePulido } from './concepts/metal_bronce_pulido.js';
import { vidrioEsmerilado } from './concepts/vidrio_esmerilado.js';
import { pedestalMarmol } from './concepts/pedestal_marmol.js';
import { lamparaColgante } from './concepts/lampara_colgante.js';
import { esferaDecorativa } from './concepts/esfera_decorativa.js';
import { cuboBasico } from './concepts/cubo_basico.js';

/**
 * Categorías válidas de un concepto. `object_geo` aplica a conceptos que
 * declaran su propia geometría SDF (vs. usar un primitivo + material).
 */
export type ConceptCategory =
  | 'wall'
  | 'floor'
  | 'ceiling'
  | 'object'
  | 'universal'
  | 'object_geo';

/**
 * Material signature (FR-2.2): caracterización declarativa del material que
 * el WGSL del concepto produce. Valores derivados HONESTAMENTE del código
 * WGSL real (constantes vec3, amplitudes de ruido, uso de audioAmp) — no
 * inventados. Sirve al editor/LLM para razonar sobre materiales sin parsear WGSL.
 */
export interface MaterialSignature {
  /** Color dominante RGB (0-1 aprox) que el WGSL realmente produce */
  baseColor: [number, number, number];
  /** Rugosidad estimada del material (0 = pulido espejo, 1 = totalmente rugoso) */
  roughness: number;
  /** Cuánto varía espacialmente la superficie (0 = plana, 1 = ruido/fbm de alta amplitud) */
  normalVariation: number;
  /** Cuánto responde el material a audioAmp (0 = lo ignora por completo) */
  audioReactivity: number;
}

/**
 * Concepto: unidad reutilizable de síntesis material o geométrica.
 *
 * Los conceptos básicos (los 8 del bootstrap) sólo declaran `wgsl` material.
 * Los conceptos extendidos pueden declarar:
 *  - `wgslSdf` para conceptos geométricos (T-021, kind: 'concept')
 *  - `paramsSchema` para parámetros editables validados por Zod
 *  - `defaults` para valores iniciales de los parámetros
 *
 * Todos los conceptos declaran (FR-2.2):
 *  - `signature` — material signature derivada del WGSL real
 *  - `seed` — procedural seed entero único y determinista por concepto
 *
 * El `manifest()` está siempre presente — lo adjunta el registry al registrar
 * cada concepto crudo. Devuelve metadata serializable para el editor.
 */
export interface Concept {
  /** Identificador único, usado en .m13 */
  id: string;
  /** Categoría del concepto */
  category: ConceptCategory;
  /** Descripción legible para humanos */
  description: string;
  /** Material signature (FR-2.2) — color base, roughness, variación, audio reactivity */
  signature: MaterialSignature;
  /**
   * Procedural seed (FR-2.2) — entero único por concepto, asignado secuencialmente
   * por orden alfabético de id (1001, 1002, ...). Reserva la base para variación
   * procedural por-instancia en Fase 2; el WGSL aún no lo consume (eso requiere
   * validación visual con GPU).
   */
  seed: number;
  /** Fragmento WGSL que define `fn mat_<id>(p, n, audioAmp) -> vec3<f32>` */
  wgsl: string;
  /** Fragmento WGSL opcional que define `fn sdf_<id>(p, ...) -> f32` (solo conceptos geométricos) */
  wgslSdf?: string;
  /** Schema Zod para validar `params` que el `.m13` puede pasar al concepto */
  paramsSchema?: z.ZodObject<z.ZodRawShape>;
  /** Valores por default de los parámetros (deben validar contra paramsSchema) */
  defaults?: Record<string, unknown>;
  /**
   * Manifest serializable del concepto. Adjuntado por el registry al cargar.
   * Para el editor (D-4) y telemetría.
   */
  manifest?: () => ConceptManifest;
}

/**
 * Metadata 100% JSON-serializable de un concepto. Apta para:
 *   - Editor (D-4): mostrar UI dinámica de params, validar el .m13 generado por LLM
 *   - LLM editor-time (T-051): inyectar como contexto del prompt sistema
 *   - Telemetría (T-056): catálogo de uso por concepto
 *   - Bundling/export (T-055): incluir en zips de escena standalone
 */
export interface ConceptManifest {
  id: string;
  category: ConceptCategory;
  description: string;
  /** Material signature (FR-2.2) — serializable, derivada del WGSL real */
  signature: MaterialSignature;
  /** Procedural seed (FR-2.2) — entero único determinista por concepto */
  seed: number;
  /** true si el concepto declara su propio SDF geométrico (no solo material) */
  hasGeometricSDF: boolean;
  /** true si el concepto acepta parámetros editables */
  hasParams: boolean;
  defaults?: Record<string, unknown>;
  /**
   * JSON Schema (draft-07) de los params editables. Solo presente cuando el
   * concepto declara `paramsSchema`. Convertido desde Zod con `zod-to-json-schema`.
   * Cuando esto está, `hasParams === true`.
   */
  paramsJsonSchema?: Record<string, unknown>;
}

// ============================================================
// Registry
// ============================================================

const RAW_CONCEPTS: Concept[] = [
  // Bootstrap (8)
  paredYesoBlanco,
  paredLadrilloViejo,
  pisoMaderaEnvejecida,
  pisoConcretoIndustrial,
  metalDoradoPulido,
  marmolBlancoVetas,
  piedraVolcanica,
  cueroVintage,
  // D-3 Fase 1 — materiales (6)
  paredConcretoPulido,
  paredMaderaOscura,
  pisoMarmolBlanco,
  metalOxidado,
  metalBroncePulido,
  vidrioEsmerilado,
  // D-3 Fase 1 — geométricos (4)
  pedestalMarmol,
  lamparaColgante,
  esferaDecorativa,
  cuboBasico,
];

/**
 * Envuelve un concepto raw con el método `manifest()` al registrarlo.
 * Esto permite que los archivos de concepts queden como objetos planos
 * (data-only) y el registry agrega el comportamiento.
 */
function attachManifest(raw: Concept): Concept {
  // Pre-computamos el JSON Schema una vez al registrar (el Zod schema es inmutable).
  // Si raw.paramsSchema es undefined, paramsJsonSchema queda undefined.
  const paramsJsonSchema = raw.paramsSchema
    ? (zodToJsonSchema(raw.paramsSchema, {
        name: `${raw.id}_params`,
        target: 'jsonSchema7',
        $refStrategy: 'none',
      }) as Record<string, unknown>)
    : undefined;

  return {
    ...raw,
    manifest: () => ({
      id: raw.id,
      category: raw.category,
      description: raw.description,
      signature: raw.signature,
      seed: raw.seed,
      hasGeometricSDF: raw.wgslSdf !== undefined,
      hasParams: raw.paramsSchema !== undefined,
      defaults: raw.defaults,
      paramsJsonSchema,
    }),
  };
}

const REGISTRY: Record<string, Concept> = Object.fromEntries(
  RAW_CONCEPTS.map((raw) => [raw.id, attachManifest(raw)]),
);

// ============================================================
// API pública
// ============================================================

export function getConcept(id: string): Concept | undefined {
  return REGISTRY[id];
}

export function listConcepts(): Concept[] {
  return Object.values(REGISTRY);
}

export function listConceptsByCategory(category: ConceptCategory): Concept[] {
  return listConcepts().filter((c) => c.category === category || c.category === 'universal');
}

/**
 * Lista todos los manifests del registry. Útil para que el editor
 * presente un catálogo, o para telemetría de uso de conceptos.
 */
export function listManifests(): ConceptManifest[] {
  return listConcepts().map((c) => c.manifest!());
}

// ============================================================
// Catálogo para prompts LLM (B6, auditoría 2026-06-12)
// UNA fuente generada del registry — consumida por el editor
// (system-prompt), el MCP (format-guide) y el eval. Antes el
// editor lo tenía escrito a mano y drifteaba.
// ============================================================

function renderParams(m: ConceptManifest): string {
  const schema = m.paramsJsonSchema as
    | { definitions?: Record<string, { properties?: Record<string, { minimum?: number; maximum?: number }> }> }
    | undefined;
  const def = schema?.definitions?.[`${m.id}_params`];
  if (!def?.properties) return '';
  const parts = Object.entries(def.properties).map(([name, p]) =>
    p.minimum !== undefined && p.maximum !== undefined ? `${name}:${p.minimum}..${p.maximum}` : name,
  );
  return ` · params={${parts.join(', ')}}`;
}

/**
 * Catálogo de conceptos en texto plano para system prompts de LLM.
 * Agrupa: materiales sin params / con params / geométricos (kind: concept).
 */
export function buildConceptCatalog(): string {
  const ms = listManifests();
  const geo = ms.filter((m) => m.hasGeometricSDF);
  const withParams = ms.filter((m) => !m.hasGeometricSDF && m.hasParams);
  const plain = ms.filter((m) => !m.hasGeometricSDF && !m.hasParams);
  const line = (m: ConceptManifest): string => `- ${m.id} · ${m.category} · ${m.description}${renderParams(m)}`;
  return [
    'CONCEPTOS DISPONIBLES (id · categoría · descripción):',
    '',
    'Materiales (walls/floor/ceiling/objects[].material):',
    ...plain.map(line),
    '',
    'Materiales con params editables:',
    ...withParams.map(line),
    '',
    'Geométricos (objects[] con kind: concept — geometría propia):',
    ...geo.map(line),
  ].join('\n');
}
