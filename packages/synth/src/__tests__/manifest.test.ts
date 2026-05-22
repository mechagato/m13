import { describe, it, expect } from 'vitest';
import {
  getConcept,
  listConcepts,
  listConceptsByCategory,
  listManifests,
  type Concept,
  type ConceptManifest,
} from '../index.js';

/**
 * T-017 — Tests de la interface extendida `Concept` + manifest.
 *
 * Verifica:
 *   - Todos los conceptos registrados tienen `manifest()` adjuntado por el registry
 *   - El manifest devuelve metadata serializable y consistente con el raw concept
 *   - `listManifests()` produce un array de manifests
 *   - Los 8 conceptos del bootstrap siguen accesibles y sin paramsSchema (compat)
 */

const ALL_BOOTSTRAP_IDS = [
  'pared_yeso_blanco',
  'pared_ladrillo_viejo',
  'piso_madera_envejecida',
  'piso_concreto_industrial',
  'metal_dorado_pulido',
  'marmol_blanco_vetas',
  'piedra_volcanica',
  'cuero_vintage',
];

describe('synth — Concept interface extendida + manifest (T-017)', () => {
  it('listConcepts retorna los 8 conceptos del bootstrap', () => {
    const ids = listConcepts().map((c) => c.id).sort();
    expect(ids).toEqual([...ALL_BOOTSTRAP_IDS].sort());
  });

  it('cada concepto tiene manifest() callable adjuntado por el registry', () => {
    const concepts = listConcepts();
    expect(concepts.length).toBeGreaterThan(0);
    for (const c of concepts) {
      expect(c.manifest).toBeDefined();
      expect(typeof c.manifest).toBe('function');
    }
  });

  it('listConcepts().every(c => c.manifest) === true (criterio del task)', () => {
    expect(listConcepts().every((c) => typeof c.manifest === 'function')).toBe(true);
  });

  it('manifest() retorna metadata consistente con el concepto raw', () => {
    const c = getConcept('pared_yeso_blanco');
    expect(c).toBeDefined();
    const m = c!.manifest!();
    expect(m.id).toBe('pared_yeso_blanco');
    expect(m.category).toBe('wall');
    expect(m.description).toMatch(/yeso/i);
    expect(m.hasGeometricSDF).toBe(false);
    expect(m.hasParams).toBe(false);
    expect(m.defaults).toBeUndefined();
  });

  it('manifest es serializable (JSON.stringify no lanza)', () => {
    for (const c of listConcepts()) {
      const m = c.manifest!();
      const json = JSON.stringify(m);
      const parsed = JSON.parse(json) as ConceptManifest;
      expect(parsed.id).toBe(c.id);
      expect(parsed.category).toBe(c.category);
    }
  });

  it('listManifests() devuelve un array completo de manifests', () => {
    const manifests = listManifests();
    expect(manifests).toHaveLength(ALL_BOOTSTRAP_IDS.length);
    expect(manifests.every((m) => typeof m.id === 'string')).toBe(true);
    expect(manifests.every((m) => typeof m.category === 'string')).toBe(true);
  });

  it('Los 8 conceptos bootstrap no tienen paramsSchema ni defaults (compat)', () => {
    for (const c of listConcepts()) {
      expect(c.paramsSchema, `${c.id} no debe declarar paramsSchema en v0.1 bootstrap`).toBeUndefined();
      expect(c.defaults, `${c.id} no debe declarar defaults en v0.1 bootstrap`).toBeUndefined();
      expect(c.wgslSdf, `${c.id} no debe declarar wgslSdf (no es geo concept)`).toBeUndefined();
      expect(c.manifest!().hasGeometricSDF).toBe(false);
      expect(c.manifest!().hasParams).toBe(false);
    }
  });

  it('ConceptCategory acepta `object_geo` como valor válido', () => {
    // Test de tipo: un concept con category 'object_geo' debe compilar.
    const fakeGeo: Concept = {
      id: 'test_geo',
      category: 'object_geo',
      description: 'test',
      wgsl: 'fn mat_test_geo() {}',
      wgslSdf: 'fn sdf_test_geo() -> f32 { return 0.0; }',
    };
    expect(fakeGeo.category).toBe('object_geo');
    expect(fakeGeo.wgslSdf).toBeDefined();
  });

  it('listConceptsByCategory mantiene compat con el bootstrap', () => {
    const walls = listConceptsByCategory('wall');
    // wall + universal son visibles para wall
    expect(walls.length).toBeGreaterThanOrEqual(2);
    expect(walls.every((c) => c.category === 'wall' || c.category === 'universal')).toBe(true);
  });

  it('getConcept retorna undefined para id desconocido', () => {
    expect(getConcept('concepto_no_existente')).toBeUndefined();
  });
});
