import { describe, expect, it } from 'vitest';
import { M13_REPLAY_VERSION, RecordController, interpolateReplayPose } from '../record-controller.js';

describe('RecordController', () => {
  it('samples a compact recording at a fixed rate and exports it', () => {
    const record = new RecordController();
    record.startRecording('scene-hash', 10);
    record.record(100, { pos: [0, 0, 0], yaw: 0, pitch: 0 });
    record.record(100.04, { pos: [9, 0, 0], yaw: 0, pitch: 0 });
    record.record(100.1, { pos: [1, 0, 0], yaw: 0.5, pitch: 0.1 });
    const replay = record.stopRecording();
    expect(replay).toEqual({
      version: M13_REPLAY_VERSION,
      sceneHash: 'scene-hash',
      frames: [[0, 0, 0, 0, 0, 0], [0.1, 1, 0, 0, 0.5, 0.1]],
    });
  });

  it('replays deterministic interpolated poses and uses the short yaw arc', () => {
    const pose = interpolateReplayPose([
      [0, 0, 0, 0, 3.0, 0],
      [2, 2, 4, 6, -3.0, 0.4],
    ], 1);
    expect(pose?.pos).toEqual([1, 2, 3]);
    expect(pose?.yaw).toBeGreaterThan(3.1);
    expect(pose?.pitch).toBeCloseTo(0.2);
  });

  it('validates scene identity and untrusted replay payloads', () => {
    const record = new RecordController();
    expect(() => record.load('{bad')).toThrow(/JSON invalido/);
    expect(() => record.load(JSON.stringify({ version: M13_REPLAY_VERSION, sceneHash: 'a', frames: [[1, 0, 0, 0, 0, 0]] }), 'b')).toThrow(/hash distinto/);
    expect(() => record.load(JSON.stringify({ version: M13_REPLAY_VERSION, sceneHash: 'a', frames: [[1, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0]] }))).toThrow(/ordenados/);
  });
});
