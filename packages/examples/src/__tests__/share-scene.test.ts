import { describe, expect, it } from 'vitest';
import {
  MAX_SHARED_REPLAY_BYTES,
  MAX_SHARED_SCENE_BYTES,
  createSharedReplayHash,
  encodeReplayHash,
  encodeSceneHash,
  readPrivatePublishParams,
  readSharedReplayHash,
  readSharedSceneHash,
} from '../share-scene.js';

describe('share-scene', () => {
  it('round-trips a valid scene hash', () => {
    const yaml = 'version: "0.1"\nname: shared\nfloor: { concept: piso_madera_envejecida }\n';
    expect(readSharedSceneHash(`#scene=${encodeSceneHash(yaml)}`)).toBe(yaml);
  });

  it('rejects encoded payloads above the decoded YAML budget before parsing', () => {
    const oversized = 'x'.repeat(MAX_SHARED_SCENE_BYTES + 1);
    expect(readSharedSceneHash(`#scene=${encodeSceneHash(oversized)}`)).toBeNull();
  });

  it('round-trips a bounded replay while keeping the scene parameter compatible', () => {
    const yaml = 'version: "0.1"\nname: shared\nfloor: { concept: piso_madera_envejecida }\n';
    const replay = '{"version":"m13replay-1","sceneHash":"abc","frames":[[0,0,0,0,0,0]]}';
    const hash = createSharedReplayHash(yaml, replay);
    expect(hash).not.toBeNull();
    expect(readSharedSceneHash(hash!)).toBe(yaml);
    expect(readSharedReplayHash(hash!)).toBe(replay);
  });

  it('rejects replay links above the budget before runtime parsing', () => {
    const oversized = 'x'.repeat(MAX_SHARED_REPLAY_BYTES + 1);
    expect(readSharedReplayHash(`#replay=${encodeReplayHash(oversized)}`)).toBeNull();
    expect(createSharedReplayHash('scene', oversized)).toBeNull();
  });

  it('parses tokenized private publish query params', () => {
    expect(readPrivatePublishParams('?p=abc&token=secret')).toEqual({
      id: 'abc',
      token: 'secret',
      gateway: 'http://127.0.0.1:8788',
    });
    expect(readPrivatePublishParams('?p=abc&token=secret&gateway=http://gw.example/')).toEqual({
      id: 'abc',
      token: 'secret',
      gateway: 'http://gw.example',
    });
    expect(readPrivatePublishParams('?p=only')).toBeNull();
  });
});
