import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildSceneResources,
  destroyRenderer,
  destroyRendererCore,
  destroySceneResources,
  initRendererCore,
  renderEyePass,
  renderFrame,
  writeMatParams,
  writeUniforms,
  type RendererState,
} from '../index.js';

function makeRendererState() {
  const pass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    draw: vi.fn(),
    end: vi.fn(),
    setViewport: vi.fn(),
  };
  const beginRenderPass = vi.fn(() => pass);
  const finish = vi.fn(() => ({ command: true }));
  const encoder = { beginRenderPass, finish };
  const createCommandEncoder = vi.fn(() => encoder);
  const submit = vi.fn();
  const targetView = { target: true } as unknown as GPUTextureView;
  const state = {
    device: { createCommandEncoder, queue: { submit } },
    context: { getCurrentTexture: vi.fn(() => ({ createView: vi.fn(() => targetView) })) },
    pipeline: { pipeline: true },
    bindGroup: { bindGroup: true },
  } as unknown as RendererState;

  return { state, pass, beginRenderPass, createCommandEncoder, submit, targetView };
}

describe('renderer render passes', () => {
  it('renders a 2D frame by clearing, drawing, and submitting once', () => {
    const { state, pass, beginRenderPass, submit } = makeRendererState();

    renderFrame(state);

    expect(beginRenderPass).toHaveBeenCalledWith(expect.objectContaining({
      colorAttachments: [expect.objectContaining({ loadOp: 'clear', storeOp: 'store' })],
    }));
    expect(pass.setPipeline).toHaveBeenCalledWith(state.pipeline);
    expect(pass.setBindGroup).toHaveBeenCalledWith(0, state.bindGroup);
    expect(pass.draw).toHaveBeenCalledWith(3);
    expect(pass.end).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it.each([
    [true, 'clear'],
    [false, 'load'],
  ] as const)('uses %s -> %s for an XR eye pass', (clear, loadOp) => {
    const { state, pass, beginRenderPass, targetView } = makeRendererState();
    const encoder = { beginRenderPass } as unknown as GPUCommandEncoder;
    const viewport = { x: 100, y: 0, width: 200, height: 150 };

    renderEyePass(state, encoder, targetView, viewport, clear);

    expect(beginRenderPass).toHaveBeenCalledWith(expect.objectContaining({
      colorAttachments: [expect.objectContaining({ view: targetView, loadOp, storeOp: 'store' })],
    }));
    expect(pass.setViewport).toHaveBeenCalledWith(100, 0, 200, 150, 0, 1);
    expect(pass.setPipeline).toHaveBeenCalledWith(state.pipeline);
    expect(pass.setBindGroup).toHaveBeenCalledWith(0, state.bindGroup);
    expect(pass.draw).toHaveBeenCalledWith(3);
    expect(pass.end).toHaveBeenCalledTimes(1);
  });
});

function makeGpuDevice() {
  const createBuffer = vi.fn(() => ({ destroy: vi.fn() }));
  const createShaderModule = vi.fn(() => ({ shader: true }));
  const pipeline = { getBindGroupLayout: vi.fn(() => ({ layout: true })) };
  const device = {
    createBuffer,
    createShaderModule,
    createRenderPipelineAsync: vi.fn().mockResolvedValue(pipeline),
    createBindGroup: vi.fn(() => ({ bindGroup: true })),
    queue: { writeBuffer: vi.fn(), submit: vi.fn() },
    destroy: vi.fn(),
  } as unknown as GPUDevice;
  return { device, createBuffer, createShaderModule, pipeline };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renderer resource lifecycle', () => {
  it('initializes a WebGPU core with an opaque canvas context and uniform buffer', async () => {
    const { device, createBuffer } = makeGpuDevice();
    const configure = vi.fn();
    const context = { configure };
    const canvas = { getContext: vi.fn(() => context) } as unknown as HTMLCanvasElement;
    vi.stubGlobal('GPUBufferUsage', { UNIFORM: 1, COPY_DST: 2 });
    vi.stubGlobal('navigator', {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({ requestDevice: vi.fn().mockResolvedValue(device) }),
        getPreferredCanvasFormat: vi.fn(() => 'bgra8unorm'),
      },
    });

    const core = await initRendererCore(canvas);

    expect(core.device).toBe(device);
    expect(configure).toHaveBeenCalledWith({ device, format: 'bgra8unorm', alphaMode: 'opaque' });
    expect(createBuffer).toHaveBeenCalledWith(expect.objectContaining({ size: 256, usage: 3 }));
  });

  it('builds scene resources and uploads material params', async () => {
    const { device, createBuffer, createShaderModule, pipeline } = makeGpuDevice();
    vi.stubGlobal('GPUBufferUsage', { UNIFORM: 1, COPY_DST: 2 });
    const core = {
      device,
      context: {} as GPUCanvasContext,
      format: 'bgra8unorm' as GPUTextureFormat,
      uniformBuffer: {} as GPUBuffer,
      canvas: {} as HTMLCanvasElement,
    };
    const compiled = {
      wgsl: '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(); }',
      scene: { name: 'test' },
      matParams: { totalFloats: 2, values: new Float32Array([0.25, 0.75]) },
    } as never;

    const resources = await buildSceneResources(core, compiled);

    expect(createBuffer).toHaveBeenCalledWith(expect.objectContaining({ size: 16, usage: 3, label: 'm13-mat-params' }));
    expect(device.queue.writeBuffer).toHaveBeenCalledTimes(1);
    expect(createShaderModule).toHaveBeenCalledWith(expect.objectContaining({ code: compiled.wgsl }));
    expect(resources.pipeline).toBe(pipeline);
  });

  it('writes uniform and material buffers and destroys owned resources', () => {
    const uniformDestroy = vi.fn();
    const materialDestroy = vi.fn();
    const contextUnconfigure = vi.fn();
    const deviceDestroy = vi.fn();
    const writeBuffer = vi.fn();
    const state = {
      device: { queue: { writeBuffer }, destroy: deviceDestroy },
      context: { unconfigure: contextUnconfigure },
      uniformBuffer: { destroy: uniformDestroy },
      matParamsBuffer: { destroy: materialDestroy },
    } as unknown as RendererState;
    const uniforms = {
      resolution: [640, 480], time: 1, audioAmp: 0,
      camPos: [0, 0, 0], camDir: [0, 0, -1], camRight: [1, 0, 0], camUp: [0, 1, 0],
      lightPos: [0, 2, 0], lightColor: [1, 1, 1], lightIntensity: 1,
      ambientColor: [0, 0, 0], fogColor: [0, 0, 0], fogDensity: 0, tint: [1, 1, 1],
      quality: [64, 8, 2, 3], audioBands: [0, 0, 0, 0],
    } as const;

    writeUniforms(state, uniforms);
    writeMatParams(state, new Float32Array([1, 2]));
    destroySceneResources({ matParamsBuffer: state.matParamsBuffer, pipeline: {} as GPURenderPipeline, bindGroup: {} as GPUBindGroup });
    destroyRendererCore(state);
    destroyRenderer(state);

    expect(writeBuffer).toHaveBeenCalledTimes(2);
    expect(materialDestroy).toHaveBeenCalledTimes(2);
    expect(uniformDestroy).toHaveBeenCalledTimes(2);
    expect(contextUnconfigure).toHaveBeenCalledTimes(2);
    expect(deviceDestroy).toHaveBeenCalledTimes(2);
  });
});
