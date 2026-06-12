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
// API D-3004 (B3/B4): core persistente + recursos por escena (LRU en el engine).
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
    matParamsBuffer: null,
    bindGroup: {} as GPUBindGroup,
  })),
  destroySceneResources: vi.fn(),
  destroyRendererCore: vi.fn(),
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
    const { buildSceneResources } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    await engine.loadScene(loadScene('sala_galeria.m13'));

    expect(buildSceneResources).toHaveBeenCalledTimes(1);
    const info = engine.getLastLoadInfo();
    expect(info).not.toBeNull();
    expect(info!.reusedPipeline).toBe(false);
    expect(info!.wgslHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('re-carga de la misma escena: cache hit + initRenderer NO llamado de nuevo', async () => {
    const { M13Engine } = await import('../engine.js');
    const { buildSceneResources } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    const yaml = loadScene('sala_galeria.m13');
    await engine.loadScene(yaml);
    const firstHash = engine.getWgslHash();

    await engine.loadScene(yaml);
    // (vista cliente — la misma carga produce cache hit)

    expect(buildSceneResources).toHaveBeenCalledTimes(1);
    const info = engine.getLastLoadInfo();
    expect(info!.reusedPipeline).toBe(true);
    expect(info!.wgslHash).toBe(firstHash);
  });

  it('cargar escena distinta tras una previa: cache miss + initRenderer llamado 2 veces', async () => {
    const { M13Engine } = await import('../engine.js');
    const { buildSceneResources, initRendererCore } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    await engine.loadScene(loadScene('sala_galeria.m13'));
    const firstHash = engine.getWgslHash();

    await engine.loadScene(loadScene('templo_mexica.m13'));
    const secondHash = engine.getWgslHash();

    expect(buildSceneResources).toHaveBeenCalledTimes(2);
    expect(firstHash).not.toBe(secondHash);
    expect(engine.getLastLoadInfo()!.reusedPipeline).toBe(false);
    // B3/D-3004: el core (device) NO se recrea al cambiar de escena y la
    // escena anterior queda CACHEADA (no destruida) en el LRU.
    expect(initRendererCore).toHaveBeenCalledTimes(1);
    const { destroySceneResources } = await import('../renderer/index.js');
    expect(destroySceneResources).toHaveBeenCalledTimes(0);
  });

  it('cargar A → B → A: LRU multi-entry (B3) — la tercera carga es hit, cero rebuilds', async () => {
    const { M13Engine } = await import('../engine.js');
    const { buildSceneResources } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    const yamlA = loadScene('sala_galeria.m13');
    const yamlB = loadScene('oficina_neonodos.m13');

    await engine.loadScene(yamlA); // miss → 1 build
    await engine.loadScene(yamlB); // miss → 2 build
    await engine.loadScene(yamlA); // HIT del LRU — alternar A↔B ya no reconstruye nada

    expect(buildSceneResources).toHaveBeenCalledTimes(2);
    expect(engine.getLastLoadInfo()!.reusedPipeline).toBe(true);
  });

  it('LRU con capacidad 4: la 5ª escena distinta desaloja a la más vieja (1 destroy)', async () => {
    const { M13Engine } = await import('../engine.js');
    const { buildSceneResources, destroySceneResources } = await import('../renderer/index.js');
    const engine = new M13Engine({} as HTMLCanvasElement);

    const scenes = [
      'sala_galeria.m13',
      'oficina_neonodos.m13',
      'templo_mexica.m13',
      'cocina_industrial.m13',
      '_concepts_showcase.m13',
    ];
    for (const s of scenes) {
      await engine.loadScene(loadScene(s));
    }

    expect(buildSceneResources).toHaveBeenCalledTimes(5);
    expect(destroySceneResources).toHaveBeenCalledTimes(1); // solo la más vieja
  });

  it('hash es estable: cargar misma escena 10 veces seguidas = 1 init + 9 hits', async () => {
    const { M13Engine } = await import('../engine.js');
    const { buildSceneResources } = await import('../renderer/index.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);

    const yaml = loadScene('cocina_industrial.m13');
    for (let i = 0; i < 10; i++) {
      await engine.loadScene(yaml);
    }

    expect(buildSceneResources).toHaveBeenCalledTimes(1);
  });

  it('getWgslHash() retorna null antes de loadScene', async () => {
    const { M13Engine } = await import('../engine.js');
    const fakeCanvas = {} as HTMLCanvasElement;
    const engine = new M13Engine(fakeCanvas);
    expect(engine.getWgslHash()).toBeNull();
    expect(engine.getLastLoadInfo()).toBeNull();
  });
});
