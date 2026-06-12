import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Auditoría 2026-06-10 — race condition dispose() durante loadScene en vuelo.
 *
 * Antes del fix: si dispose() llegaba mientras initRenderer creaba el device,
 * loadScene asignaba el renderer nuevo a un engine ya disposed → GPUDevice
 * huérfano fuera del alcance de dispose() + engine "revivido".
 */

let releaseInit: (() => void) | null = null;
const fakeState = {
  device: {} as GPUDevice,
  context: {} as GPUCanvasContext,
  format: 'bgra8unorm' as GPUTextureFormat,
  pipeline: {} as GPURenderPipeline,
  uniformBuffer: {} as GPUBuffer,
  matParamsBuffer: null,
  bindGroup: {} as GPUBindGroup,
  canvas: {} as HTMLCanvasElement,
};

vi.mock('../renderer/index.js', () => ({
  initRenderer: vi.fn().mockImplementation(
    () =>
      new Promise((res) => {
        releaseInit = () => res(fakeState);
      }),
  ),
  renderFrame: vi.fn(),
  writeUniforms: vi.fn(),
  writeMatParams: vi.fn(),
  destroyRenderer: vi.fn(),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = resolve(__dirname, '../../../examples/public/scenes');

describe('M13Engine — dispose() durante loadScene (race)', () => {
  it('loadScene rechaza y destruye el renderer recién creado si dispose() llegó en vuelo', async () => {
    const { M13Engine } = await import('../engine.js');
    const { destroyRenderer } = await import('../renderer/index.js');
    const engine = new M13Engine({} as HTMLCanvasElement);
    const yaml = readFileSync(resolve(SCENES_DIR, 'sala_galeria.m13'), 'utf8');

    const pending = engine.loadScene(yaml);
    // Esperar a que loadScene LLEGUE al initRenderer pendiente (parse+hash tardan
    // un tiempo variable — crypto.subtle es lento en su primer uso en Node).
    await vi.waitFor(() => {
      if (releaseInit === null) throw new Error('initRenderer aún no llamado');
    });

    engine.dispose();
    expect(releaseInit).not.toBeNull();
    releaseInit!(); // initRenderer resuelve DESPUÉS del dispose

    await expect(pending).rejects.toThrow(/dispose\(\) llamado durante loadScene/);
    // El device creado en vuelo se destruyó — no queda huérfano.
    expect(destroyRenderer).toHaveBeenCalledWith(fakeState);
    expect(engine.isDisposed()).toBe(true);
  });
});

describe('M13Engine — loadScene serializado (cargas concurrentes)', () => {
  it('dos loadScene concurrentes se encolan: ambas resuelven y el estado final es la segunda', async () => {
    const { M13Engine } = await import('../engine.js');
    const { initRenderer } = await import('../renderer/index.js');
    // initRenderer del mock resuelve solo cuando llamamos releaseInit — controlamos el orden.
    const engine = new M13Engine({} as HTMLCanvasElement);
    const yamlA = readFileSync(resolve(SCENES_DIR, 'sala_galeria.m13'), 'utf8');
    const yamlB = readFileSync(resolve(SCENES_DIR, 'cocina_industrial.m13'), 'utf8');

    vi.mocked(initRenderer).mockClear(); // el spy acumula llamadas del test anterior
    releaseInit = null;
    const p1 = engine.loadScene(yamlA);
    const p2 = engine.loadScene(yamlB); // concurrente — debe ENCOLARSE, no interleave
    await vi.waitFor(() => {
      if (releaseInit === null) throw new Error('init de A aún no llamado');
    });
    const releaseA = releaseInit;
    releaseInit = null;
    releaseA!(); // libera el init de A
    const sceneA = await p1;
    await vi.waitFor(() => {
      if (releaseInit === null) throw new Error('init de B aún no llamado');
    });
    releaseInit!(); // libera el init de B (solo arrancó después de terminar A)
    const sceneB = await p2;

    expect(sceneA.name).not.toBe(sceneB.name);
    expect(vi.mocked(initRenderer)).toHaveBeenCalledTimes(2);
    // El hash final corresponde a la ÚLTIMA carga (B)
    expect(engine.getLastLoadInfo()!.reusedPipeline).toBe(false);
  });
});
