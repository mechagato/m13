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
 * Tests de la interface extendida `Concept` + manifest.
 *
 * Cubre:
 *   - T-017 — interface extendida con paramsSchema, defaults, wgslSdf, manifest()
 *   - T-022 — paramsJsonSchema en el manifest vía zod-to-json-schema
 *   - T-025..T-034 — catálogo D-3 con 10 conceptos nuevos (params + geo)
 */

// 8 conceptos del bootstrap original — sin params, sin SDF geométrico
const BOOTSTRAP_IDS = [
  'pared_yeso_blanco',
  'pared_ladrillo_viejo',
  'piso_madera_envejecida',
  'piso_concreto_industrial',
  'metal_dorado_pulido',
  'marmol_blanco_vetas',
  'piedra_volcanica',
  'cuero_vintage',
];

// 10 conceptos D-3 — todos tienen paramsSchema (salvo los geo simples), 4 son geos
const D3_MATERIAL_IDS = [
  'pared_concreto_pulido',
  'pared_madera_oscura',
  'piso_marmol_blanco',
  'metal_oxidado',
  'metal_bronce_pulido',
  'vidrio_esmerilado',
];

const D3_GEO_IDS = [
  'pedestal_marmol',
  'lampara_colgante',
  'esfera_decorativa',
  'cubo_basico',
];

const ALL_IDS = [...BOOTSTRAP_IDS, ...D3_MATERIAL_IDS, ...D3_GEO_IDS];
const TOTAL_COUNT = ALL_IDS.length; // 18

describe('synth — Concept registry y manifest', () => {
  // ============================================
  // T-017 — Registry & interface
  // ============================================

  it('listConcepts retorna los 18 conceptos del catálogo Fase 1', () => {
    const ids = listConcepts().map((c) => c.id).sort();
    expect(ids).toEqual([...ALL_IDS].sort());
    expect(listConcepts()).toHaveLength(TOTAL_COUNT);
  });

  it('cada concepto tiene manifest() callable adjuntado por el registry', () => {
    const concepts = listConcepts();
    expect(concepts.length).toBe(TOTAL_COUNT);
    for (const c of concepts) {
      expect(c.manifest).toBeDefined();
      expect(typeof c.manifest).toBe('function');
    }
  });

  it('listConcepts().every(c => c.manifest) === true (criterio del task T-017)', () => {
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

  it('listManifests() devuelve un array completo de manifests (18 entradas)', () => {
    const manifests = listManifests();
    expect(manifests).toHaveLength(TOTAL_COUNT);
    expect(manifests.every((m) => typeof m.id === 'string')).toBe(true);
    expect(manifests.every((m) => typeof m.category === 'string')).toBe(true);
  });

  // ============================================
  // Bootstrap (8) — sin params, sin SDF
  // ============================================

  it('Los 8 conceptos bootstrap NO tienen paramsSchema, defaults ni wgslSdf', () => {
    for (const id of BOOTSTRAP_IDS) {
      const c = getConcept(id);
      expect(c, `${id} debe estar registrado`).toBeDefined();
      expect(c!.paramsSchema, `${id} bootstrap no debe declarar paramsSchema`).toBeUndefined();
      expect(c!.defaults, `${id} bootstrap no debe declarar defaults`).toBeUndefined();
      expect(c!.wgslSdf, `${id} bootstrap no es geo concept`).toBeUndefined();
      const m = c!.manifest!();
      expect(m.hasGeometricSDF).toBe(false);
      expect(m.hasParams).toBe(false);
      expect(m.paramsJsonSchema).toBeUndefined();
    }
  });

  // ============================================
  // D-3 materiales (6) — todos con paramsSchema + defaults
  // ============================================

  it('Los 6 materiales nuevos de D-3 declaran paramsSchema con defaults', () => {
    for (const id of D3_MATERIAL_IDS) {
      const c = getConcept(id);
      expect(c, `${id} debe estar registrado`).toBeDefined();
      expect(c!.paramsSchema, `${id} debe declarar paramsSchema`).toBeDefined();
      expect(c!.defaults, `${id} debe declarar defaults`).toBeDefined();
      expect(c!.wgslSdf, `${id} es material, no debe declarar wgslSdf`).toBeUndefined();
      const m = c!.manifest!();
      expect(m.hasParams).toBe(true);
      expect(m.hasGeometricSDF).toBe(false);
      expect(m.paramsJsonSchema, `${id} debe exponer paramsJsonSchema`).toBeDefined();
      expect(m.defaults).toEqual(c!.defaults);
    }
  });

  // ============================================
  // D-3 geo (4) — todos con wgslSdf + category 'object_geo'
  // ============================================

  it('Los 4 conceptos geométricos de D-3 declaran wgslSdf y categoría object_geo', () => {
    for (const id of D3_GEO_IDS) {
      const c = getConcept(id);
      expect(c, `${id} debe estar registrado`).toBeDefined();
      expect(c!.category, `${id} debe ser categoría object_geo`).toBe('object_geo');
      expect(c!.wgslSdf, `${id} debe declarar wgslSdf`).toBeDefined();
      expect(c!.wgslSdf!).toContain(`sdf_${id}`);
      const m = c!.manifest!();
      expect(m.hasGeometricSDF).toBe(true);
    }
  });

  it('pedestal_marmol y lampara_colgante declaran params (otros geos no)', () => {
    expect(getConcept('pedestal_marmol')!.paramsSchema).toBeDefined();
    expect(getConcept('lampara_colgante')!.paramsSchema).toBeDefined();
    // esfera_decorativa y cubo_basico no necesitan params en v0.1 (usan scale del object)
    expect(getConcept('esfera_decorativa')!.paramsSchema).toBeUndefined();
    expect(getConcept('cubo_basico')!.paramsSchema).toBeUndefined();
  });

  // ============================================
  // T-022 — paramsJsonSchema
  // ============================================

  it('T-022: el paramsJsonSchema es JSON-serializable y refleja las restricciones Zod', () => {
    const c = getConcept('metal_oxidado');
    expect(c).toBeDefined();
    const m = c!.manifest!();
    expect(m.paramsJsonSchema).toBeDefined();
    const json = JSON.stringify(m.paramsJsonSchema);
    expect(() => JSON.parse(json)).not.toThrow();
    // El schema referencia el campo `rustAmount`
    expect(json).toContain('rustAmount');
    // Con sus restricciones Zod (.min(0).max(1))
    expect(json).toContain('"minimum":0');
    expect(json).toContain('"maximum":1');
  });

  it('T-022: cuando un concept declara paramsSchema, su manifest expone paramsJsonSchema', () => {
    for (const id of D3_MATERIAL_IDS) {
      const m = getConcept(id)!.manifest!();
      expect(m.paramsJsonSchema).toBeDefined();
    }
  });

  // ============================================
  // ConceptCategory `object_geo`
  // ============================================

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

  // ============================================
  // listConceptsByCategory
  // ============================================

  it('listConceptsByCategory mantiene compat y refleja crecimiento del catálogo', () => {
    const walls = listConceptsByCategory('wall');
    // 4 walls (yeso, ladrillo, concreto_pulido, madera_oscura) + 2 universal (marmol, piedra)
    expect(walls.length).toBeGreaterThanOrEqual(6);
    expect(walls.every((c) => c.category === 'wall' || c.category === 'universal')).toBe(true);
  });

  it('getConcept retorna undefined para id desconocido', () => {
    expect(getConcept('concepto_no_existente')).toBeUndefined();
  });
});
