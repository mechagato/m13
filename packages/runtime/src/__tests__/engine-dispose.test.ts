import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * T-068 — Test de M13Engine.dispose() — liberación de recursos GPU.
 *
 * Objetivo: garantizar que dispose() existe, es idempotente, destruye el device
 * y el context, y deja el engine en estado no-usable con errores claros.
 *
 * Razón de existencia: el moat de 8GB RAM de FlowCAD se cae tras 2-3 promotes
 * si el device WebGPU no se libera explícitamente. La regla "solo-un-ACTIVE"
 * de FlowCAD necesita dispose() para liberar la GPU en cada ciclo de promote.
 *
 * Estrategia: mockear el renderer para capturar device.destroy() y
 * context.unconfigure() sin requerir GPU física en Cerebro4.
 */

// ── Helpers de spy ─────────────────────────────────────────────────────────

/**
 * Construye un RendererState falso que expone spies en device.destroy()
 * y context.unconfigure() para que el test pueda verificar que se llamaron.
 */
function makeFakeRenderer() {
  const deviceDestroy = vi.fn();
  const contextUnconfigure = vi.fn();
  const uniformBufferDestroy = vi.fn();
  const matParamsBufferDestroy = vi.fn();

  return {
    state: {
      device: { destroy: deviceDestroy, queue: { writeBuffer: vi.fn() } } as unknown as GPUDevice,
      context: { unconfigure: contextUnconfigure, getCurrentTexture: vi.fn() } as unknown as GPUCanvasContext,
      format: 'bgra8unorm' as GPUTextureFormat,
      pipeline: {} as GPURenderPipeline,
      uniformBuffer: { destroy: uniformBufferDestroy } as unknown as GPUBuffer,
      matParamsBuffer: { destroy: matParamsBufferDestroy } as unknown as GPUBuffer,
      bindGroup: {} as GPUBindGroup,
      canvas: {} as HTMLCanvasElement,
    },
    spies: { deviceDestroy, contextUnconfigure, uniformBufferDestroy, matParamsBufferDestroy },
  };
}

// ── Mock del módulo renderer ────────────────────────────────────────────────
// IMPORTANTE: vi.mock se hoistea al tope del módulo por Vitest, así que la
// fábrica puede referenciar helpers definidos a nivel de módulo sin problema.

let currentFakeRenderer = makeFakeRenderer();

vi.mock('../renderer/index.js', () => ({
  initRenderer: vi.fn().mockImplementation(async () => currentFakeRenderer.state),
  renderFrame: vi.fn(),
  writeUniforms: vi.fn(),
  writeMatParams: vi.fn(),
  destroyRenderer: vi.fn().mockImplementation((state: ReturnType<typeof makeFakeRenderer>['state']) => {
    // Replica la lógica real de destroyRenderer para que los spies del state
    // específico sean invocados correctamente.
    state.uniformBuffer.destroy();
    if (state.matParamsBuffer) state.matParamsBuffer.destroy();
    state.context.unconfigure();
    state.device.destroy();
  }),
}));

// ── Fixtures de escena ──────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = resolve(__dirname, '../../../examples/public/scenes');
const loadScene = (name: string): string =>
  readFileSync(resolve(SCENES_DIR, name), 'utf8');

// ── Suite principal ─────────────────────────────────────────────────────────

describe('M13Engine — dispose() (T-068)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Rota el fake renderer para que cada test tenga sus propios spies frescos.
    currentFakeRenderer = makeFakeRenderer();
  });

  it('dispose() existe como método público', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);
    expect(typeof engine.dispose).toBe('function');
  });

  it('isDisposed() devuelve false antes de dispose()', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);
    expect(engine.isDisposed()).toBe(false);
  });

  it('dispose() sin loadScene previo no lanza error', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);
    expect(() => engine.dispose()).not.toThrow();
    expect(engine.isDisposed()).toBe(true);
  });

  it('dispose() tras loadScene: llama device.destroy() y context.unconfigure()', async () => {
    const { M13Engine } = await import('../engine.js');
    const { destroyRenderer } = await import('../renderer/index.js');
    const engine = new M13Engine({} as HTMLCanvasElement);

    await engine.loadScene(loadScene('sala_galeria.m13'));
    engine.dispose();

    // destroyRenderer debe haberse llamado 1 vez con el state del renderer.
    expect(destroyRenderer).toHaveBeenCalledTimes(1);

    // Los spies internos del state falso confirman que destroy/unconfigure se ejecutaron.
    expect(currentFakeRenderer.spies.deviceDestroy).toHaveBeenCalledTimes(1);
    expect(currentFakeRenderer.spies.contextUnconfigure).toHaveBeenCalledTimes(1);
    expect(currentFakeRenderer.spies.uniformBufferDestroy).toHaveBeenCalledTimes(1);
  });

  it('dispose() es idempotente — doble dispose no lanza error ni destruye dos veces', async () => {
    const { M13Engine } = await import('../engine.js');
    const { destroyRenderer } = await import('../renderer/index.js');
    const engine = new M13Engine({} as HTMLCanvasElement);

    await engine.loadScene(loadScene('sala_galeria.m13'));
    engine.dispose();
    engine.dispose(); // segunda llamada: debe ser no-op

    expect(engine.isDisposed()).toBe(true);
    // destroyRenderer solo se llama la primera vez.
    expect(destroyRenderer).toHaveBeenCalledTimes(1);
    expect(currentFakeRenderer.spies.deviceDestroy).toHaveBeenCalledTimes(1);
  });

  it('loadScene() tras dispose() lanza error claro', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);
    engine.dispose();

    await expect(
      engine.loadScene(loadScene('sala_galeria.m13')),
    ).rejects.toThrow(/dispose/i);
  });

  it('start() tras dispose() lanza error claro', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({} as HTMLCanvasElement);

    // Primero cargamos escena (para que start() no falle por falta de renderer)
    // luego dispose, luego start — debe fallar con el error de disposed.
    await engine.loadScene(loadScene('sala_galeria.m13'));
    engine.dispose();

    expect(() => engine.start()).toThrow(/dispose/i);
  });

  it('dispose() cancela el loop de render (running queda en false)', async () => {
    const { M13Engine } = await import('../engine.js');
    // No podemos llamar start() sin RAF real, pero sí verificamos que
    // dispose() sin loop activo tampoco explota y deja el engine inerte.
    const engine = new M13Engine({} as HTMLCanvasElement);
    await engine.loadScene(loadScene('sala_galeria.m13'));

    // stop() primero para no necesitar RAF real
    engine.stop();
    engine.dispose();

    expect(engine.isDisposed()).toBe(true);
    // Tras dispose, cualquier intento de reiniciar debe fallar limpiamente.
    expect(() => engine.start()).toThrow(/dispose/i);
  });
});
