import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * T-013 — Test del caché de shader pipeline en M13Engine.
 *
 * Verifica que `loadScene` reutilice el pipeline GPU cuando el WGSL output
 * coincide con el del shader actualmente cargado (mismo hash SHA-256).
 *
 * Estrategia: mockeamos el módulo `renderer` para no depender de WebGPU en Node.
 * Trackeamos el call count de `initRenderer` y `getLastLoadInfo().reusedPipeline`.
 */

// Mock de renderer ANTES de importar engine (vi.mock se hoistea).
vi.mock('../renderer/index.js', () => ({
  initRenderer: vi.fn().mockImplementation(async () => ({
    device: {} as GPUDevice,
    context: {} as GPUCanvasContext,
    format: 'bgra8unorm' as GPUTextureFormat,
    pipeline: {} as GPURenderPipeline,
    uniformBuffer: {} as GPUBuffer,
    matParamsBuffer: null,
    bindGroup: {} as GPUBindGroup,
    canvas: {} as HTMLCanvasElement,
  })),
  renderFrame: vi.fn(),
  writeUniforms: vi.fn(),
  writeMatParams: vi.fn(),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = resolve(__dirname, '../../../examples/public/scenes');
const loadScene = (name: string): string =>
  readFileSync(resolve(SCENES_DIR, name), 'utf8');

describe('M13Engine — shader cache (T-013)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('primera carga: cache miss + initRenderer llamado 1 vez', async () => {
    const { M13Engine } = await import('../engine.js');
    const { initRenderer } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    await engine.loadScene(loadScene('sala_basica.m13'));

    expect(initRenderer).toHaveBeenCalledTimes(1);
    const info = engine.getLastLoadInfo();
    expect(info).not.toBeNull();
    expect(info!.reusedPipeline).toBe(false);
    expect(info!.wgslHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('re-carga de la misma escena: cache hit + initRenderer NO llamado de nuevo', async () => {
    const { M13Engine } = await import('../engine.js');
    const { initRenderer } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    const yaml = loadScene('sala_basica.m13');
    await engine.loadScene(yaml);
    const firstHash = engine.getWgslHash();

    await engine.loadScene(yaml);

    expect(initRenderer).toHaveBeenCalledTimes(1);
    const info = engine.getLastLoadInfo();
    expect(info!.reusedPipeline).toBe(true);
    expect(info!.wgslHash).toBe(firstHash);
  });

  it('cargar escena distinta tras una previa: cache miss + initRenderer llamado 2 veces', async () => {
    const { M13Engine } = await import('../engine.js');
    const { initRenderer } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    await engine.loadScene(loadScene('sala_basica.m13'));
    const firstHash = engine.getWgslHash();

    await engine.loadScene(loadScene('templo_mexica.m13'));
    const secondHash = engine.getWgslHash();

    expect(initRenderer).toHaveBeenCalledTimes(2);
    expect(firstHash).not.toBe(secondHash);
    expect(engine.getLastLoadInfo()!.reusedPipeline).toBe(false);
  });

  it('cargar A → B → A: el cache solo retiene la ULTIMA escena (no es LRU multi-entry)', async () => {
    const { M13Engine } = await import('../engine.js');
    const { initRenderer } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    const yamlA = loadScene('sala_basica.m13');
    const yamlB = loadScene('loft_industrial.m13');

    await engine.loadScene(yamlA); // miss → 1 init
    await engine.loadScene(yamlB); // miss → 2 init
    await engine.loadScene(yamlA); // miss otra vez (cache solo retiene B)

    expect(initRenderer).toHaveBeenCalledTimes(3);
    expect(engine.getLastLoadInfo()!.reusedPipeline).toBe(false);
  });

  it('hash es estable: cargar misma escena 10 veces seguidas = 1 init + 9 hits', async () => {
    const { M13Engine } = await import('../engine.js');
    const { initRenderer } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    const yaml = loadScene('galeria_minimal.m13');
    for (let i = 0; i < 10; i++) {
      await engine.loadScene(yaml);
    }

    expect(initRenderer).toHaveBeenCalledTimes(1);
  });

  it('getWgslHash() retorna null antes de loadScene', async () => {
    const { M13Engine } = await import('../engine.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);
    expect(engine.getWgslHash()).toBeNull();
    expect(engine.getLastLoadInfo()).toBeNull();
  });
});
