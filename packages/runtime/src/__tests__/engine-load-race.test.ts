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
    // Dar un macrotick para que loadScene llegue al initRenderer pendiente.
    await new Promise((r) => setTimeout(r, 10));

    engine.dispose();
    expect(releaseInit).not.toBeNull();
    releaseInit!(); // initRenderer resuelve DESPUÉS del dispose

    await expect(pending).rejects.toThrow(/dispose\(\) llamado durante loadScene/);
    // El device creado en vuelo se destruyó — no queda huérfano.
    expect(destroyRenderer).toHaveBeenCalledWith(fakeState);
    expect(engine.isDisposed()).toBe(true);
  });
});
