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

const EXTRA_GEO_IDS = [
  'patin_quad',
  'patin_disco',
  'patin_alas',
  'patin_viejo',
  'patin_racing',
  'patin_triciclo',
];
const ALL_IDS = [...BOOTSTRAP_IDS, ...D3_MATERIAL_IDS, ...D3_GEO_IDS, ...EXTRA_GEO_IDS];
const TOTAL_COUNT = ALL_IDS.length; // 24 — el detalle continuo (T-224) migró los 4
// conceptos del showcase a fbm_detail; el prototipo piedra_volcanica_s13 se retiró.

describe('synth — Concept registry y manifest', () => {
  // ============================================
  // T-017 — Registry & interface
  // ============================================

  it('listConcepts retorna los 24 conceptos del catálogo', () => {
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

  it('listManifests() devuelve un array completo de manifests (catálogo completo)', () => {
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

  it('pedestal_marmol, lampara_colgante y la familia patín declaran params (esfera/cubo no)', () => {
    expect(getConcept('pedestal_marmol')!.paramsSchema).toBeDefined();
    expect(getConcept('lampara_colgante')!.paramsSchema).toBeDefined();
    for (const id of EXTRA_GEO_IDS) {
      const c = getConcept(id)!;
      expect(c.paramsSchema, `${id} params`).toBeDefined();
      expect(c.wgslSdf, `${id} sdf`).toContain(`sdf_${id}`);
      expect(c.category).toBe('object_geo');
    }
    expect(getConcept('patin_quad')!.seed).toBe(1019);
    expect(getConcept('patin_disco')!.seed).toBe(1020);
    expect(getConcept('patin_alas')!.seed).toBe(1021);
    expect(getConcept('patin_viejo')!.seed).toBe(1022);
    expect(getConcept('patin_racing')!.seed).toBe(1023);
    expect(getConcept('patin_triciclo')!.seed).toBe(1024);
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
  // FR-2.2 — material signature + procedural seed
  // ============================================

  it('FR-2.2: cada concepto declara signature con rangos válidos (0-1)', () => {
    for (const c of listConcepts()) {
      const s = c.signature;
      expect(s, `${c.id} debe declarar signature`).toBeDefined();
      expect(s.baseColor).toHaveLength(3);
      for (const ch of s.baseColor) {
        expect(ch, `${c.id} baseColor canal fuera de rango`).toBeGreaterThanOrEqual(0);
        expect(ch, `${c.id} baseColor canal fuera de rango`).toBeLessThanOrEqual(1);
      }
      for (const [name, v] of [
        ['roughness', s.roughness],
        ['normalVariation', s.normalVariation],
        ['audioReactivity', s.audioReactivity],
      ] as const) {
        expect(v, `${c.id}.${name} fuera de rango`).toBeGreaterThanOrEqual(0);
        expect(v, `${c.id}.${name} fuera de rango`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('FR-2.2: cada concepto declara seed entero único', () => {
    const seeds = listConcepts().map((c) => c.seed);
    for (const seed of seeds) {
      expect(Number.isInteger(seed)).toBe(true);
    }
    expect(new Set(seeds).size).toBe(TOTAL_COUNT);
  });

  it('FR-2.2: el manifest propaga signature y seed (serializables)', () => {
    for (const c of listConcepts()) {
      const m = c.manifest!();
      expect(m.signature).toEqual(c.signature);
      expect(m.seed).toBe(c.seed);
      const parsed = JSON.parse(JSON.stringify(m)) as ConceptManifest;
      expect(parsed.signature).toEqual(c.signature);
      expect(parsed.seed).toBe(c.seed);
    }
  });

  // B11 (auditoría 06-12): el mapa está CONGELADO — agregar un concepto nuevo
  // NO renumera a los existentes (eso rompía el determinismo: banda_transportadora
  // habría renumerado 16 de 18). Conceptos nuevos: agregar AQUÍ con el siguiente
  // número libre (1019+).
  const FROZEN_SEEDS: Record<string, number> = {
    cubo_basico: 1001,
    cuero_vintage: 1002,
    esfera_decorativa: 1003,
    lampara_colgante: 1004,
    marmol_blanco_vetas: 1005,
    metal_bronce_pulido: 1006,
    metal_dorado_pulido: 1007,
    metal_oxidado: 1008,
    pared_concreto_pulido: 1009,
    pared_ladrillo_viejo: 1010,
    pared_madera_oscura: 1011,
    pared_yeso_blanco: 1012,
    patin_quad: 1019,
    patin_disco: 1020,
    patin_alas: 1021,
    patin_viejo: 1022,
    patin_racing: 1023,
    patin_triciclo: 1024,
    pedestal_marmol: 1013,
    piedra_volcanica: 1014,
    piso_concreto_industrial: 1015,
    piso_madera_envejecida: 1016,
    piso_marmol_blanco: 1017,
    vidrio_esmerilado: 1018,
  };

  it('FR-2.2/B11: seeds únicos y CONGELADOS — los existentes nunca se renumeran', () => {
    const seen = new Set<number>();
    for (const c of listConcepts()) {
      expect(seen.has(c.seed), `seed ${c.seed} duplicado (${c.id})`).toBe(false);
      seen.add(c.seed);
      const frozen = FROZEN_SEEDS[c.id];
      if (frozen !== undefined) {
        expect(c.seed, `${c.id} debe conservar su seed congelado ${frozen}`).toBe(frozen);
      } else {
        // concepto nuevo: número fuera del rango congelado, y hay que agregarlo al mapa
        expect(c.seed, `${c.id} es nuevo — su seed debe ser >= 1019 y agregarse a FROZEN_SEEDS`).toBeGreaterThanOrEqual(1019);
      }
    }
  });

  it('FR-2.2: audioReactivity refleja el uso real de audioAmp en el WGSL', () => {
    // metal_dorado_pulido y pared_ladrillo_viejo usan audioAmp de forma significativa
    expect(getConcept('metal_dorado_pulido')!.signature.audioReactivity).toBeGreaterThan(0);
    expect(getConcept('pared_ladrillo_viejo')!.signature.audioReactivity).toBeGreaterThan(0);
    // los demás lo ignoran
    expect(getConcept('pared_yeso_blanco')!.signature.audioReactivity).toBe(0);
    expect(getConcept('cubo_basico')!.signature.audioReactivity).toBe(0);
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
      signature: { baseColor: [0.5, 0.5, 0.5], roughness: 0.5, normalVariation: 0, audioReactivity: 0 },
      seed: 9999,
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
