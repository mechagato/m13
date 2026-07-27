import { describe, expect, it, vi } from 'vitest';

vi.mock('../renderer/index.js', () => ({
  initRendererCore: vi.fn().mockResolvedValue({
    device: {} as GPUDevice,
    context: {} as GPUCanvasContext,
    format: 'bgra8unorm' as GPUTextureFormat,
    uniformBuffer: {} as GPUBuffer,
    canvas: {} as HTMLCanvasElement,
  }),
  buildSceneResources: vi.fn(),
  destroySceneResources: vi.fn(),
  destroyRendererCore: vi.fn(),
  renderFrame: vi.fn(),
  renderEyePass: vi.fn(),
  writeUniforms: vi.fn(),
  writeMatParams: vi.fn(),
}));

const validScene = `
version: "0.1"
name: strict_boundary
bounds: [4, 3, 4]
spawn: [0, 0, 2]
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_concreto_industrial }
ceiling: { concept: pared_yeso_blanco }
objects: []
`;

describe('M13Engine - strict scene loading', () => {
  it('rejects unknown root fields from public scene inputs', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);

    await expect(engine.loadScene(`${validScene}\ndebug: true\n`))
      .rejects.toThrow('campos desconocidos');
  });

  it('rejects unknown nested fields from public scene inputs', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);
    const sceneWithTypo = validScene.replace('objects: []', `objects:
  - id: esfera
    kind: sphere
    material: metal_dorado_pulido
    materail: metal_dorado_pulido
    position: [0, 0, 0]
    scale: 1`);

    await expect(engine.loadScene(sceneWithTypo))
      .rejects.toThrow('campos desconocidos');
  });
});
