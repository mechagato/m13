import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Auditoría 2026-06-10 — robustez del RAF loop.
 *
 * Antes del fix: una excepción dentro de tick() (p.ej. writeUniforms fallando
 * por device perdido) mataba el requestAnimationFrame loop en silencio — el
 * canvas se congelaba sin log ni callback.
 *
 * Después del fix: el loop atrapa la excepción, detiene el motor limpiamente,
 * loggea con prefijo [m13/engine] y notifica via opts.onError.
 *
 * Estrategia: mock del renderer con writeUniforms que lanza, y stub de
 * requestAnimationFrame síncrono-controlado (Node no tiene RAF).
 */

// ── Mock del módulo renderer ────────────────────────────────────────────────

vi.mock('../renderer/index.js', () => ({
  initRenderer: vi.fn().mockImplementation(async () => ({
    device: { destroy: vi.fn(), queue: { writeBuffer: vi.fn() } },
    context: { unconfigure: vi.fn(), getCurrentTexture: vi.fn() },
    format: 'bgra8unorm',
    pipeline: {},
    uniformBuffer: { destroy: vi.fn() },
    matParamsBuffer: null,
    bindGroup: {},
    canvas: {},
  })),
  renderFrame: vi.fn(),
  writeUniforms: vi.fn().mockImplementation(() => {
    throw new Error('GPU device perdido (simulado)');
  }),
  writeMatParams: vi.fn(),
  destroyRenderer: vi.fn(),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = resolve(__dirname, '../../../examples/public/scenes');
const loadScene = (name: string): string =>
  readFileSync(resolve(SCENES_DIR, name), 'utf8');

/** Canvas falso mínimo para resize() y el loop. */
function makeFakeCanvas(): HTMLCanvasElement {
  return { width: 100, height: 100, clientWidth: 100, clientHeight: 100 } as HTMLCanvasElement;
}

// ── Stub de RAF: encola callbacks y los dispara manualmente ─────────────────

let rafQueue: Array<(now: number) => void> = [];

function flushRaf(now: number): void {
  const cbs = rafQueue;
  rafQueue = [];
  for (const cb of cbs) cb(now);
}

describe('M13Engine — excepción en tick() no mata el loop en silencio', () => {
  beforeEach(() => {
    rafQueue = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (now: number) => void): number => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // OJO: NO usar vi.restoreAllMocks() aquí — borraría las implementaciones
    // del vi.mock del renderer a nivel de módulo. Solo restauramos console.error.
    (console.error as ReturnType<typeof vi.fn>).mockRestore();
  });

  it('al fallar writeUniforms: el loop se detiene, onError recibe el error, sin unhandled', async () => {
    const { M13Engine } = await import('../engine.js');
    const onError = vi.fn();
    const engine = new M13Engine(makeFakeCanvas(), { onError });

    await engine.loadScene(loadScene('sala_galeria.m13'));

    // start() encola el primer frame — no debe lanzar hacia afuera.
    expect(() => engine.start()).not.toThrow();
    expect(rafQueue.length).toBe(1);

    // Disparar el frame: tick lanza adentro pero el loop lo atrapa.
    expect(() => flushRaf(16)).not.toThrow();

    // El loop NO se re-encoló (motor detenido).
    expect(rafQueue.length).toBe(0);

    // onError recibió el error original.
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0]![0] as Error).message).toMatch(/GPU device perdido/);

    // Se loggeó con el prefijo del motor.
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[m13/engine]'),
      expect.any(Error),
    );
  });

  it('sin onError: el loop igualmente se detiene y solo loggea (no unhandled)', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine(makeFakeCanvas());

    await engine.loadScene(loadScene('sala_galeria.m13'));
    engine.start();
    expect(() => flushRaf(16)).not.toThrow();
    expect(rafQueue.length).toBe(0);
    expect(console.error).toHaveBeenCalled();
  });

  it('start() después de un fallo permite reintentar (running quedó en false)', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine(makeFakeCanvas(), { onError: vi.fn() });

    await engine.loadScene(loadScene('sala_galeria.m13'));
    engine.start();
    flushRaf(16); // falla y detiene

    // El motor quedó detenido pero NO disposed — start() vuelve a encolar.
    expect(engine.isDisposed()).toBe(false);
    engine.start();
    expect(rafQueue.length).toBe(1);
    engine.stop();
  });
});
