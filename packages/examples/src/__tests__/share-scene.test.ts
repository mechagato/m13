import { describe, expect, it } from 'vitest';
import { MAX_SHARED_SCENE_BYTES, encodeSceneHash, readSharedSceneHash } from '../share-scene.js';

describe('share-scene', () => {
  it('round-trips a valid scene hash', () => {
    const yaml = 'version: "0.1"\nname: shared\nfloor: { concept: piso_madera_envejecida }\n';
    expect(readSharedSceneHash(`#scene=${encodeSceneHash(yaml)}`)).toBe(yaml);
  });

  it('rejects encoded payloads above the decoded YAML budget before parsing', () => {
    const oversized = 'x'.repeat(MAX_SHARED_SCENE_BYTES + 1);
    expect(readSharedSceneHash(`#scene=${encodeSceneHash(oversized)}`)).toBeNull();
  });
});
