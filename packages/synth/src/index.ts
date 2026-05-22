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
 * Concepto: unidad reutilizable de síntesis material o geométrica.
 *
 * Los conceptos básicos (los 8 del bootstrap) sólo declaran `wgsl` material.
 * Los conceptos extendidos pueden declarar:
 *  - `wgslSdf` para conceptos geométricos (T-021, kind: 'concept')
 *  - `paramsSchema` para parámetros editables validados por Zod
 *  - `defaults` para valores iniciales de los parámetros
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
