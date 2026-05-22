/**
 * @m13/synth — librería de conceptos materiales procedurales.
 *
 * Cada concepto exporta una función WGSL `mat_<id>(p, n, audioAmp) -> vec3<f32>`
 * más metadatos. El registry permite que el compilador resuelva conceptos por id.
 */

import { paredYesoBlanco } from './concepts/pared_yeso_blanco.js';
import { paredLadrilloViejo } from './concepts/pared_ladrillo_viejo.js';
import { pisoMaderaEnvejecida } from './concepts/piso_madera_envejecida.js';
import { pisoConcretoIndustrial } from './concepts/piso_concreto_industrial.js';
import { metalDoradoPulido } from './concepts/metal_dorado_pulido.js';
import { marmolBlancoVetas } from './concepts/marmol_blanco_vetas.js';
import { piedraVolcanica } from './concepts/piedra_volcanica.js';
import { cueroVintage } from './concepts/cuero_vintage.js';

export interface Concept {
  /** Identificador único, usado en .m13 */
  id: string;
  /** Categoría: 'wall', 'floor', 'ceiling', 'object', 'universal' */
  category: ConceptCategory;
  /** Descripción legible para humanos */
  description: string;
  /** Fragmento WGSL que define `fn mat_<id>(p, n, audioAmp) -> vec3<f32>` */
  wgsl: string;
}

export type ConceptCategory = 'wall' | 'floor' | 'ceiling' | 'object' | 'universal';

const REGISTRY: Record<string, Concept> = {
  pared_yeso_blanco: paredYesoBlanco,
  pared_ladrillo_viejo: paredLadrilloViejo,
  piso_madera_envejecida: pisoMaderaEnvejecida,
  piso_concreto_industrial: pisoConcretoIndustrial,
  metal_dorado_pulido: metalDoradoPulido,
  marmol_blanco_vetas: marmolBlancoVetas,
  piedra_volcanica: piedraVolcanica,
  cuero_vintage: cueroVintage,
};

export function getConcept(id: string): Concept | undefined {
  return REGISTRY[id];
}

export function listConcepts(): Concept[] {
  return Object.values(REGISTRY);
}

export function listConceptsByCategory(category: ConceptCategory): Concept[] {
  return listConcepts().filter((c) => c.category === category || c.category === 'universal');
}
