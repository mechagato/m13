import type { CompiledScene } from '../compiler/index.js';

const UNIFORM_BYTES = 160;

export interface RendererState {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  canvas: HTMLCanvasElement;
}

export interface UniformInputs {
  resolution: [number, number];
  time: number;
  audioAmp: number;
  camPos: [number, number, number];
  camDir: [number, number, number];
  camRight: [number, number, number];
  camUp: [number, number, number];
  lightPos: [number, number, number];
  lightColor: [number, number, number];
  lightIntensity: number;
  ambientColor: [number, number, number];
  fogColor: [number, number, number];
  fogDensity: number;
  tint: [number, number, number];
}

export async function initRenderer(
  canvas: HTMLCanvasElement,
  compiled: CompiledScene,
): Promise<RendererState> {
  if (!('gpu' in navigator)) {
    throw new Error('[m13/renderer] WebGPU no disponible en este navegador');
  }
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });
  if (!adapter) {
    throw new Error('[m13/renderer] No se pudo obtener adapter WebGPU');
  }
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
  if (!context) {
    throw new Error('[m13/renderer] canvas.getContext("webgpu") devolvió null');
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  const uniformBuffer = device.createBuffer({
    size: UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const shaderModule = device.createShaderModule({
    code: compiled.wgsl,
    label: `m13-shader-${compiled.scene.name}`,
  });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule, entryPoint: 'vs_main' },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  return { device, context, format, pipeline, uniformBuffer, bindGroup, canvas };
}

export function writeUniforms(state: RendererState, u: UniformInputs): void {
  const buf = new ArrayBuffer(UNIFORM_BYTES);
  const dv = new DataView(buf);
  let o = 0;
  // resolution + time + audioAmp
  dv.setFloat32(o, u.resolution[0], true); o += 4;
  dv.setFloat32(o, u.resolution[1], true); o += 4;
  dv.setFloat32(o, u.time, true); o += 4;
  dv.setFloat32(o, u.audioAmp, true); o += 4;
  // camPos + pad
  dv.setFloat32(o, u.camPos[0], true); o += 4;
  dv.setFloat32(o, u.camPos[1], true); o += 4;
  dv.setFloat32(o, u.camPos[2], true); o += 4;
  o += 4;
  // camDir + pad
  dv.setFloat32(o, u.camDir[0], true); o += 4;
  dv.setFloat32(o, u.camDir[1], true); o += 4;
  dv.setFloat32(o, u.camDir[2], true); o += 4;
  o += 4;
  // camRight + pad
  dv.setFloat32(o, u.camRight[0], true); o += 4;
  dv.setFloat32(o, u.camRight[1], true); o += 4;
  dv.setFloat32(o, u.camRight[2], true); o += 4;
  o += 4;
  // camUp + pad
  dv.setFloat32(o, u.camUp[0], true); o += 4;
  dv.setFloat32(o, u.camUp[1], true); o += 4;
  dv.setFloat32(o, u.camUp[2], true); o += 4;
  o += 4;
  // lightPos + pad
  dv.setFloat32(o, u.lightPos[0], true); o += 4;
  dv.setFloat32(o, u.lightPos[1], true); o += 4;
  dv.setFloat32(o, u.lightPos[2], true); o += 4;
  o += 4;
  // lightColor + lightIntensity
  dv.setFloat32(o, u.lightColor[0], true); o += 4;
  dv.setFloat32(o, u.lightColor[1], true); o += 4;
  dv.setFloat32(o, u.lightColor[2], true); o += 4;
  dv.setFloat32(o, u.lightIntensity, true); o += 4;
  // ambientColor + fogDensity
  dv.setFloat32(o, u.ambientColor[0], true); o += 4;
  dv.setFloat32(o, u.ambientColor[1], true); o += 4;
  dv.setFloat32(o, u.ambientColor[2], true); o += 4;
  dv.setFloat32(o, u.fogDensity, true); o += 4;
  // fogColor + pad
  dv.setFloat32(o, u.fogColor[0], true); o += 4;
  dv.setFloat32(o, u.fogColor[1], true); o += 4;
  dv.setFloat32(o, u.fogColor[2], true); o += 4;
  o += 4;
  // tint + pad
  dv.setFloat32(o, u.tint[0], true); o += 4;
  dv.setFloat32(o, u.tint[1], true); o += 4;
  dv.setFloat32(o, u.tint[2], true); o += 4;
  // o += 4; // final pad
  state.device.queue.writeBuffer(state.uniformBuffer, 0, buf);
}

export function renderFrame(state: RendererState): void {
  const encoder = state.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: state.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });
  pass.setPipeline(state.pipeline);
  pass.setBindGroup(0, state.bindGroup);
  pass.draw(3);
  pass.end();
  state.device.queue.submit([encoder.finish()]);
}
