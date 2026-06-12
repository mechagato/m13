import type { CompiledScene } from '../compiler/index.js';

// Layout v2 (Fase 2): 160 base + 16 quality + 16 audioBands.
// REGLA D-108: si tocas esto, actualiza struct Uniforms (shaders/common.ts) y
// writeUniforms en el MISMO commit. El test uniform-layout.test.ts lo verifica.
export const UNIFORM_BYTES = 192;

/**
 * Budget máximo del buffer MAT_PARAMS — 64 f32 = 256 bytes.
 * Si una escena necesita más slots, el compiler lanza al inicializar el renderer.
 * Razón: limita el costo de memoria del segundo uniform y evita escenarios
 * patológicos (cientos de params por escena). 64 floats cubre ~6-10 conceptos
 * con ~6-10 params cada uno, suficiente para v0.1.
 */
const MAT_PARAMS_MAX_FLOATS = 64;

export interface RendererState {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  /** Buffer del MatParams. Solo presente si la escena tiene params. */
  matParamsBuffer: GPUBuffer | null;
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
  /** [maxSteps, shadowSteps, aoSamples, octaveCap] — presets en engine (T-213) */
  quality: [number, number, number, number];
  /** [bass, mid, treble, amplitude] — bandas FFT en P4; amplitude = compat */
  audioBands: [number, number, number, number];
}

/** Redondea bytes al múltiplo de 16 más cercano (mínimo 16). WebGPU lo exige para uniform buffers. */
function alignedUniformSize(bytes: number): number {
  return Math.max(16, Math.ceil(bytes / 16) * 16);
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

  // Manejo defensivo de pérdida de device — SOLO logging, sin recovery automático
  // (la estrategia de recovery es diseño de Fase 2). Los checks defensivos
  // (typeof) permiten que fake devices de tests sin `.lost` no truenen.
  if (typeof device.lost?.then === 'function') {
    void device.lost.then((info) => {
      if (info.reason === 'destroyed') {
        // Pérdida esperada: destroyRenderer()/dispose() llamó device.destroy().
        console.info('[m13/renderer] GPUDevice destruido (dispose intencional).');
      } else {
        console.error(
          `[m13/renderer] GPUDevice perdido inesperadamente (reason: ${info.reason}): ${info.message}. ` +
            'El render se detuvo — recarga la escena para reinicializar.',
        );
      }
    });
  }
  if (typeof device.addEventListener === 'function') {
    device.addEventListener('uncapturederror', (ev) => {
      const e = ev as GPUUncapturedErrorEvent;
      console.error(`[m13/renderer] uncapturederror WebGPU: ${e.error?.message ?? String(e)}`);
    });
  }

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

  // Segundo uniform buffer para MatParams (T-019) — solo si la escena lo necesita.
  let matParamsBuffer: GPUBuffer | null = null;
  if (compiled.matParams.totalFloats > 0) {
    if (compiled.matParams.totalFloats > MAT_PARAMS_MAX_FLOATS) {
      throw new Error(
        `[m13/renderer] MAT_PARAMS excede budget de ${MAT_PARAMS_MAX_FLOATS} f32 ` +
          `(escena requiere ${compiled.matParams.totalFloats}). ` +
          `Reduce el número de conceptos con paramsSchema o sus params.`,
      );
    }
    const sizeBytes = alignedUniformSize(compiled.matParams.totalFloats * 4);
    matParamsBuffer = device.createBuffer({
      size: sizeBytes,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'm13-mat-params',
    });
    // Escribimos los valores iniciales una sola vez al cargar la escena.
    // Si el editor necesita updates en vivo, expondremos writeMatParams en Fase 2.
    // `.buffer` pasa el ArrayBuffer directo y evita el mismatch genérico de
    // Float32Array<ArrayBufferLike> vs Float32Array<ArrayBuffer> en TS 5.7+.
    device.queue.writeBuffer(
      matParamsBuffer,
      0,
      compiled.matParams.values.buffer,
      0,
      compiled.matParams.values.byteLength,
    );
  }

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

  // Bind group: siempre incluye binding(0) — uniforms base. Solo agrega binding(1)
  // si el shader lo declaró (cuando matParamsBuffer existe). El layout 'auto' del
  // pipeline se sincroniza con el shader, así que esto match perfecto.
  const bindGroupEntries: GPUBindGroupEntry[] = [
    { binding: 0, resource: { buffer: uniformBuffer } },
  ];
  if (matParamsBuffer) {
    bindGroupEntries.push({ binding: 1, resource: { buffer: matParamsBuffer } });
  }

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: bindGroupEntries,
    label: 'm13-bind-group',
  });

  return {
    device,
    context,
    format,
    pipeline,
    uniformBuffer,
    matParamsBuffer,
    bindGroup,
    canvas,
  };
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
  o += 4; // pad _p6
  // quality (layout v2)
  dv.setFloat32(o, u.quality[0], true); o += 4;
  dv.setFloat32(o, u.quality[1], true); o += 4;
  dv.setFloat32(o, u.quality[2], true); o += 4;
  dv.setFloat32(o, u.quality[3], true); o += 4;
  // audioBands (layout v2)
  dv.setFloat32(o, u.audioBands[0], true); o += 4;
  dv.setFloat32(o, u.audioBands[1], true); o += 4;
  dv.setFloat32(o, u.audioBands[2], true); o += 4;
  dv.setFloat32(o, u.audioBands[3], true); o += 4;
  state.device.queue.writeBuffer(state.uniformBuffer, 0, buf);
}

/**
 * Reescribe los valores de MAT_PARAMS. Útil para editor live-update en Fase 2+.
 * No-op si el renderer no tiene matParamsBuffer (escena sin params).
 *
 * `values.length` debe coincidir con `compiled.matParams.totalFloats` con el que
 * se inicializó el renderer; longitudes distintas no son seguras (el layout cambia).
 */
export function writeMatParams(state: RendererState, values: Float32Array): void {
  if (!state.matParamsBuffer) return;
  state.device.queue.writeBuffer(
    state.matParamsBuffer,
    0,
    values.buffer,
    values.byteOffset,
    values.byteLength,
  );
}

/**
 * Libera todos los recursos WebGPU asociados a un RendererState.
 *
 * Destruye los buffers GPU, desconfigura el canvas context y llama a
 * device.destroy() para que el driver libere la memoria de la GPU.
 * Es idempotente: llamar dos veces sobre el mismo state es seguro porque
 * los objetos WebGPU ignoran operaciones sobre recursos ya destruidos.
 *
 * No libera el pipeline ni los bind groups explícitamente porque el driver
 * los recoge automáticamente al destruir el device (WebGPU spec §device-destroy).
 */
export function destroyRenderer(state: RendererState): void {
  // Destruir buffers explícitamente antes del device para ayudar al GC del driver.
  state.uniformBuffer.destroy();
  if (state.matParamsBuffer) {
    state.matParamsBuffer.destroy();
  }
  // Desconfigura el context: libera la swap-chain y las texturas de presentación.
  state.context.unconfigure();
  // Destruye el device y todos los objetos hijos (pipelines, bind groups, etc.).
  state.device.destroy();
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
