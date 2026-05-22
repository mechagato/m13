import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Concept } from '@m13/synth';

/**
 * T-018 — Tests del compiler para PROPAGACIÓN DE PARAMS desde .m13 al WGSL.
 *
 * Estrategia: mockeamos `@m13/synth` antes de importar el compiler para
 * inyectar conceptos sintéticos que SÍ declaran `paramsSchema`. Esto permite
 * ejercitar la rama de params sin tocar los 8 conceptos del bootstrap.
 *
 * Cuando T-029 (metal_bronce_pulido) y otros agreguen paramsSchema real,
 * estos tests siguen siendo el ground truth del contrato compiler↔synth.
 */

// ---- Conceptos sintéticos para testear params ----
const goldMetalConcept: Concept = {
  id: 'metal_dorado_pulido',
  category: 'object',
  description: 'gold metal con roughness param (test fixture)',
  wgsl: `fn mat_metal_dorado_pulido(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  let r = matParams.metal_dorado_pulido_roughness;
  return vec3<f32>(1.0 - r, 0.84 - r * 0.3, 0.0);
}`,
  paramsSchema: z.object({
    roughness: z.number().min(0).max(1),
    shimmer: z.number().min(0).max(1),
  }),
  defaults: { roughness: 0.3, shimmer: 0.5 },
};

const plainConcept: Concept = {
  id: 'pared_yeso_blanco',
  category: 'wall',
  description: 'yeso sin params (test fixture)',
  wgsl: `fn mat_pared_yeso_blanco(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  return vec3<f32>(0.95);
}`,
};

const floorConcept: Concept = {
  id: 'piso_madera_envejecida',
  category: 'floor',
  description: 'piso sin params (test fixture)',
  wgsl: `fn mat_piso_madera_envejecida(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> {
  return vec3<f32>(0.4, 0.25, 0.15);
}`,
};

// Mock del synth registry — DEBE ir antes de los imports del compiler (vi.mock se hoistea).
vi.mock('@m13/synth', () => {
  const registry: Record<string, Concept> = {
    metal_dorado_pulido: goldMetalConcept,
    pared_yeso_blanco: plainConcept,
    piso_madera_envejecida: floorConcept,
  };
  return {
    getConcept: (id: string) => registry[id],
    listConcepts: () => Object.values(registry),
  };
});

describe('compiler — propagación de params (T-018)', () => {
  it('escena sin params: matParams vacío + WGSL sin struct MatParams', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: sin_params
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);

    expect(compiled.matParams.totalFloats).toBe(0);
    expect(compiled.matParams.slots).toEqual([]);
    expect(compiled.matParams.values.length).toBe(0);
    expect(compiled.wgsl).not.toContain('struct MatParams');
  });

  it('concepto con paramsSchema usado SIN params → defaults aplicados al layout', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: defaults_only
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: gold
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material: metal_dorado_pulido
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);

    // metal_dorado_pulido tiene 2 params (roughness, shimmer) → 2 slots
    expect(compiled.matParams.totalFloats).toBe(2);
    expect(compiled.matParams.slots).toHaveLength(2);
    expect(compiled.matParams.byKey['metal_dorado_pulido']).toEqual({
      roughness: 0,
      shimmer: 1,
    });
    // Defaults aplicados
    expect(compiled.matParams.values[0]).toBeCloseTo(0.3); // roughness default
    expect(compiled.matParams.values[1]).toBeCloseTo(0.5); // shimmer default
  });

  it('user provee params válidos → overrides los defaults', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: con_override
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: gold
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material:
      concept: metal_dorado_pulido
      params:
        roughness: 0.8
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);

    expect(compiled.matParams.values[0]).toBeCloseTo(0.8); // roughness overrideado
    expect(compiled.matParams.values[1]).toBeCloseTo(0.5); // shimmer del default
  });

  it('WGSL incluye struct MatParams con todos los campos esperados', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: con_struct
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: gold
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material:
      concept: metal_dorado_pulido
      params:
        roughness: 0.4
        shimmer: 0.9
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);

    expect(compiled.wgsl).toContain('struct MatParams');
    expect(compiled.wgsl).toContain('metal_dorado_pulido_roughness: f32');
    expect(compiled.wgsl).toContain('metal_dorado_pulido_shimmer: f32');
    expect(compiled.wgsl).toContain('@group(0) @binding(1) var<uniform> matParams: MatParams;');
  });

  it('params para concepto SIN paramsSchema → error claro', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: params_invalidos
walls:
  concept: pared_yeso_blanco
  params:
    foo: 1.0
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    const scene = parseScene(yaml);
    expect(() => compileScene(scene)).toThrow(
      /\[m13\/compiler\] Concepto "pared_yeso_blanco" no declara paramsSchema/,
    );
  });

  it('params que no validan contra paramsSchema → error con path Zod', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: validacion
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: gold
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material:
      concept: metal_dorado_pulido
      params:
        roughness: 5.0
`;
    const scene = parseScene(yaml);
    expect(() => compileScene(scene)).toThrow(
      /\[m13\/compiler\] params inválidos para concepto "metal_dorado_pulido"/,
    );
  });

  it('layout es determinista — slots ordenados por (conceptId asc, paramName asc)', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: orden
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: g
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material: metal_dorado_pulido
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);
    expect(compiled.matParams.slots.map((s) => `${s.conceptId}.${s.paramName}`)).toEqual([
      'metal_dorado_pulido.roughness',
      'metal_dorado_pulido.shimmer',
    ]);
  });

  it('matParams.values es un Float32Array de longitud totalFloats', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: float32
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: g
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material: metal_dorado_pulido
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);
    expect(compiled.matParams.values).toBeInstanceOf(Float32Array);
    expect(compiled.matParams.values.length).toBe(compiled.matParams.totalFloats);
  });

  // ============================================
  // T-020 — Tests E2E del flow de params
  // ============================================

  it('T-020: misma estructura + params DISTINTOS → mismo WGSL, valores distintos', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene, hashWgsl } = await import('../index.js');

    const yamlBase = (roughness: number, shimmer: number) => `
version: "0.1"
name: param_test
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: gold
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material:
      concept: metal_dorado_pulido
      params:
        roughness: ${roughness}
        shimmer: ${shimmer}
`;
    const compiledA = compileScene(parseScene(yamlBase(0.1, 0.2)));
    const compiledB = compileScene(parseScene(yamlBase(0.9, 0.8)));

    // El WGSL es idéntico — los valores viven en uniforms, no se hardcodean
    expect(compiledA.wgsl).toBe(compiledB.wgsl);
    // Y el hash también coincide → el caché de shaders es válido
    const hashA = await hashWgsl(compiledA.wgsl);
    const hashB = await hashWgsl(compiledB.wgsl);
    expect(hashA).toBe(hashB);

    // Pero los Float32Array son distintos
    expect(compiledA.matParams.values[0]).toBeCloseTo(0.1);
    expect(compiledB.matParams.values[0]).toBeCloseTo(0.9);
    expect(compiledA.matParams.values[1]).toBeCloseTo(0.2);
    expect(compiledB.matParams.values[1]).toBeCloseTo(0.8);
  });

  it('T-020: params en wall/floor/ceiling también se propagan (no solo objects)', async () => {
    // Caso edge: si la pared usa material parametrizable (no en bootstrap, pero arquitectónicamente válido).
    // Para esto re-mockeamos el concepto del wall para que tenga paramsSchema.
    vi.resetModules();
    const wallWithParams: Concept = {
      ...plainConcept,
      paramsSchema: z.object({ tint: z.number().min(0).max(1) }),
      defaults: { tint: 0.5 },
    };
    vi.doMock('@m13/synth', () => ({
      getConcept: (id: string) =>
        id === 'pared_yeso_blanco'
          ? wallWithParams
          : id === 'piso_madera_envejecida'
            ? floorConcept
            : id === 'metal_dorado_pulido'
              ? goldMetalConcept
              : undefined,
      listConcepts: () => [wallWithParams, floorConcept, goldMetalConcept],
    }));

    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');

    const yaml = `
version: "0.1"
name: wall_params
walls:
  concept: pared_yeso_blanco
  params:
    tint: 0.85
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    const compiled = compileScene(parseScene(yaml));
    expect(compiled.matParams.byKey['pared_yeso_blanco']).toBeDefined();
    expect(compiled.matParams.byKey['pared_yeso_blanco']?.tint).toBeDefined();
    const tintIdx = compiled.matParams.byKey['pared_yeso_blanco']!.tint!;
    expect(compiled.matParams.values[tintIdx]).toBeCloseTo(0.85);
  });
});
