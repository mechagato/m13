import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { Concept } from '@m13/synth';

/**
 * T-020 — Tests E2E del engine cuando hay matParams.
 *
 * Cubre el bug fix de T-019/T-020: si el shader es el mismo pero los params
 * cambian, el cache hit del shader NO debe impedir actualizar el matParamsBuffer.
 *
 * Estrategia: mockeamos `@m13/synth` (concept con paramsSchema) Y el renderer
 * (capturamos llamadas a `initRenderer` y `writeMatParams`).
 */

// Mock del registry de synth para inyectar un concepto con params.
const goldConcept: Concept = {
  id: 'metal_dorado_pulido',
  category: 'object',
  description: 'gold con params (test fixture)',
  // FR-2.2 — fixture: signature/seed dummy, requeridos por la interface Concept
  signature: { baseColor: [0.5, 0.5, 0.5], roughness: 0.5, normalVariation: 0, audioReactivity: 0 },
  seed: 9001,
  wgsl: 'fn mat_metal_dorado_pulido(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> { return vec3<f32>(matParams.metal_dorado_pulido_roughness); }',
  paramsSchema: z.object({ roughness: z.number().min(0).max(1) }),
  defaults: { roughness: 0.5 },
};
const plainWall: Concept = {
  id: 'pared_yeso_blanco',
  category: 'wall',
  description: 'plain wall',
  // FR-2.2 — fixture: signature/seed dummy, requeridos por la interface Concept
  signature: { baseColor: [0.5, 0.5, 0.5], roughness: 0.5, normalVariation: 0, audioReactivity: 0 },
  seed: 9002,
  wgsl: 'fn mat_pared_yeso_blanco(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> { return vec3<f32>(0.95); }',
};
const plainFloor: Concept = {
  id: 'piso_madera_envejecida',
  category: 'floor',
  description: 'plain floor',
  // FR-2.2 — fixture: signature/seed dummy, requeridos por la interface Concept
  signature: { baseColor: [0.5, 0.5, 0.5], roughness: 0.5, normalVariation: 0, audioReactivity: 0 },
  seed: 9003,
  wgsl: 'fn mat_piso_madera_envejecida(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> { return vec3<f32>(0.4, 0.25, 0.15); }',
};

vi.mock('@m13/synth', () => {
  const registry: Record<string, Concept> = {
    metal_dorado_pulido: goldConcept,
    pared_yeso_blanco: plainWall,
    piso_madera_envejecida: plainFloor,
  };
  return {
    getConcept: (id: string) => registry[id],
    listConcepts: () => Object.values(registry),
  };
});

// Mock del renderer con tracking de llamadas (API D-3004).
vi.mock('../renderer/index.js', () => ({
  initRendererCore: vi.fn().mockImplementation(async () => ({
    device: {} as GPUDevice,
    context: {} as GPUCanvasContext,
    format: 'bgra8unorm' as GPUTextureFormat,
    uniformBuffer: {} as GPUBuffer,
    canvas: {} as HTMLCanvasElement,
  })),
  buildSceneResources: vi.fn().mockImplementation(async () => ({
    pipeline: {} as GPURenderPipeline,
    matParamsBuffer: {} as GPUBuffer, // simulamos que se creó porque hay params
    bindGroup: {} as GPUBindGroup,
  })),
  destroySceneResources: vi.fn(),
  destroyRendererCore: vi.fn(),
  renderFrame: vi.fn(),
  writeUniforms: vi.fn(),
  writeMatParams: vi.fn(),
}));

describe('M13Engine — matParams cache hit/miss (T-020)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sceneYaml = (roughness: number): string => `
version: "0.1"
name: gold_test
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
`;

  it('primera carga con params: buildSceneResources 1×, writeMatParams 0× (el writeBuffer va dentro del build)', async () => {
    const { M13Engine } = await import('../engine.js');
    const { buildSceneResources, writeMatParams } = await import('../renderer/index.js');
    const engine = new M13Engine({} as HTMLCanvasElement);

    await engine.loadScene(sceneYaml(0.3));

    expect(buildSceneResources).toHaveBeenCalledTimes(1);
    expect(writeMatParams).toHaveBeenCalledTimes(0);
    expect(engine.getLastLoadInfo()?.reusedPipeline).toBe(false);
  });

  it('cache hit + params cambiados: buildSceneResources NO se vuelve a llamar, writeMatParams SÍ', async () => {
    const { M13Engine } = await import('../engine.js');
    const { buildSceneResources, writeMatParams } = await import('../renderer/index.js');
    const engine = new M13Engine({} as HTMLCanvasElement);

    await engine.loadScene(sceneYaml(0.3));
    expect(buildSceneResources).toHaveBeenCalledTimes(1);

    // Cargar misma estructura pero con roughness distinto.
    // Mismo WGSL (T-020 verifica que es idéntico) → cache hit.
    // Pero values del Float32Array son distintos → writeMatParams debe llamarse.
    await engine.loadScene(sceneYaml(0.9));

    expect(buildSceneResources).toHaveBeenCalledTimes(1); // no recreado
    expect(writeMatParams).toHaveBeenCalledTimes(1);
    expect(engine.getLastLoadInfo()?.reusedPipeline).toBe(true);

    // El Float32Array pasado debe tener el nuevo valor 0.9 en slot 0
    const lastCall = (writeMatParams as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const passedValues = lastCall![1] as Float32Array;
    expect(passedValues[0]).toBeCloseTo(0.9);
  });

  it('cargar 5 veces la misma escena (mismos params): 1 build + 4 writeMatParams', async () => {
    const { M13Engine } = await import('../engine.js');
    const { buildSceneResources, writeMatParams } = await import('../renderer/index.js');
    const engine = new M13Engine({} as HTMLCanvasElement);

    for (let i = 0; i < 5; i++) {
      await engine.loadScene(sceneYaml(0.5));
    }

    expect(buildSceneResources).toHaveBeenCalledTimes(1);
    // writeMatParams se llama en cada cache hit (4 después del primer init)
    expect(writeMatParams).toHaveBeenCalledTimes(4);
  });
});
