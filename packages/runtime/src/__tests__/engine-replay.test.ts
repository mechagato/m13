import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const writeUniforms = vi.fn();

vi.mock('../renderer/index.js', () => ({
  initRendererCore: vi.fn().mockResolvedValue({ device: {}, context: {}, format: 'bgra8unorm', uniformBuffer: {}, canvas: {} }),
  buildSceneResources: vi.fn().mockResolvedValue({ pipeline: {}, matParamsBuffer: null, bindGroup: {} }),
  destroySceneResources: vi.fn(),
  destroyRendererCore: vi.fn(),
  renderFrame: vi.fn(),
  renderEyePass: vi.fn(),
  writeUniforms,
  writeMatParams: vi.fn(),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const yaml = readFileSync(resolve(__dirname, '../../../examples/public/scenes/sala_galeria.m13'), 'utf8');

describe('M13Engine - replay 2D', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ignores live FlyCamera input and drives both pose and u.time from replay', async () => {
    const { M13Engine } = await import('../engine.js');
    const engine = new M13Engine({ width: 100, height: 100 } as HTMLCanvasElement);
    await engine.loadScene(yaml);
    const liveCamera = {
      yaw: 0.5,
      pitch: 0.25,
      update: vi.fn(() => ({ pos: [1, 2, 3], forward: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] })),
    };
    const internals = engine as unknown as { camera: typeof liveCamera; tick(now: number): void };
    internals.camera = liveCamera;

    engine.startRecording(10);
    internals.tick(1_000);
    liveCamera.yaw = 1.5;
    liveCamera.pitch = 0.75;
    liveCamera.update.mockReturnValue({ pos: [3, 2, 1], forward: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] });
    internals.tick(1_100);
    const recording = engine.stopRecording();
    engine.loadReplay(JSON.stringify(recording));

    liveCamera.update.mockClear();
    engine.startReplay(2_000);
    internals.tick(2_050);

    expect(liveCamera.update).not.toHaveBeenCalled();
    const uniform = writeUniforms.mock.calls.at(-1)?.[1];
    expect(uniform.time).toBeCloseTo(0.05);
    expect(uniform.camPos).toEqual([2, 2, 2]);
  });
});
