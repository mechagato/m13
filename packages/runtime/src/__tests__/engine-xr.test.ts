import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const renderEyePass = vi.fn();
const writeUniforms = vi.fn();

vi.mock('../renderer/index.js', () => ({
  initRendererCore: vi.fn().mockResolvedValue({
    device: {
      createCommandEncoder: vi.fn(() => ({ finish: vi.fn(() => ({})) })),
      queue: { submit: vi.fn() },
    } as unknown as GPUDevice,
    context: {} as GPUCanvasContext,
    format: 'bgra8unorm' as GPUTextureFormat,
    uniformBuffer: {} as GPUBuffer,
    canvas: {} as HTMLCanvasElement,
  }),
  buildSceneResources: vi.fn().mockResolvedValue({
    pipeline: {} as GPURenderPipeline,
    matParamsBuffer: null,
    bindGroup: {} as GPUBindGroup,
  }),
  destroySceneResources: vi.fn(),
  destroyRendererCore: vi.fn(),
  renderFrame: vi.fn(),
  renderEyePass,
  writeUniforms,
  writeMatParams: vi.fn(),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(__dirname, '../../../examples/public/scenes/sala_galeria.m13'), 'utf8');

interface XRFrameTestDouble {
  getViewerPose(): {
    views: Array<{
      transform: { matrix: Float32Array };
      projectionMatrix: Float32Array;
      eye: string;
    }>;
  };
}

describe('M13Engine - WebXR stereo passes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('clears only the first eye of a shared XR projection texture', async () => {
    const end = vi.fn().mockResolvedValue(undefined);
    const requestAnimationFrame = vi.fn(() => 1);
    const session = {
      requestReferenceSpace: vi.fn().mockResolvedValue({}),
      requestAnimationFrame,
      cancelAnimationFrame: vi.fn(),
      updateRenderState: vi.fn(),
      addEventListener: vi.fn(),
      end,
      inputSources: [],
    };
    const binding = {
      createProjectionLayer: vi.fn(() => ({})),
      getViewSubImage: vi.fn((_layer, view) => ({
        colorTexture: { createView: vi.fn(() => ({ eye: view.eye })) },
        viewport: view.eye === 'left'
          ? { x: 0, y: 0, width: 100, height: 100 }
          : { x: 100, y: 0, width: 100, height: 100 },
      })),
    };

    vi.stubGlobal('navigator', {
      xr: { requestSession: vi.fn().mockResolvedValue(session) },
    });
    vi.stubGlobal('XRGPUBinding', class {
      constructor() { return binding; }
    });

    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);
    await engine.loadScene(scene);
    await engine.enterXR();

    const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const frame: XRFrameTestDouble = {
      getViewerPose: () => ({
        views: [
          { eye: 'left', transform: { matrix: identity }, projectionMatrix: identity },
          { eye: 'right', transform: { matrix: identity }, projectionMatrix: identity },
        ],
      }),
    };

    (engine as unknown as { onXRFrame(t: number, frame: XRFrameTestDouble): void }).onXRFrame(16, frame);

    expect(renderEyePass).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), { eye: 'left' }, { x: 0, y: 0, width: 100, height: 100 }, true);
    expect(renderEyePass).toHaveBeenNthCalledWith(2, expect.anything(), expect.anything(), { eye: 'right' }, { x: 100, y: 0, width: 100, height: 100 }, false);
    expect(writeUniforms).toHaveBeenCalledTimes(2);
    expect(end).not.toHaveBeenCalled();
  });

  it('ends the session and clears XR state when reference-space setup fails', async () => {
    const end = vi.fn().mockResolvedValue(undefined);
    const session = {
      requestReferenceSpace: vi.fn().mockRejectedValue(new Error('no reference space')),
      requestAnimationFrame: vi.fn(() => 1),
      cancelAnimationFrame: vi.fn(),
      updateRenderState: vi.fn(),
      addEventListener: vi.fn(),
      end,
      inputSources: [],
    };
    const binding = {
      createProjectionLayer: vi.fn(() => ({})),
      getViewSubImage: vi.fn(),
    };

    vi.stubGlobal('navigator', {
      xr: { requestSession: vi.fn().mockResolvedValue(session) },
    });
    vi.stubGlobal('XRGPUBinding', class {
      constructor() { return binding; }
    });

    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);
    await engine.loadScene(scene);

    await expect(engine.enterXR()).rejects.toThrow('no reference space');
    expect(end).toHaveBeenCalledTimes(1);
    expect(engine.isXRActive()).toBe(false);
  });
});
