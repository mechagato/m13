import { describe, expect, it } from 'vitest';
import { compileScene } from '../index.js';
import { MAX_SCENE_OBJECTS, type M13Scene } from '../../parser/schema.js';

describe('compiler scene limits', () => {
  it('defends against oversized scenes even when callers bypass parser validation', () => {
    const objects = Array.from({ length: MAX_SCENE_OBJECTS + 1 }, (_, i) => ({
      id: `o${i}`,
      kind: 'sphere' as const,
      position: [0, 0, 0] as [number, number, number],
      scale: 1,
      material: 'metal_dorado_pulido',
      audio_reactive: false,
    }));
    const scene = {
      version: '0.1',
      name: 'too-many-objects',
      bounds: [5, 3, 5],
      spawn: [0, 0, -3.5],
      ambient: { background: [0.05, 0.045, 0.04], ambientColor: [0.08, 0.075, 0.07], tint: [1, 1, 1], fogColor: [0.05, 0.045, 0.04], fogDensity: 0.015 },
      light: { position: [0, 2.5, 0], color: [1, 0.92, 0.78], intensity: 1 },
      floor: { concept: 'piso_madera_envejecida' },
      objects,
    } as M13Scene;

    expect(() => compileScene(scene)).toThrow(`máximo de ${MAX_SCENE_OBJECTS} objetos`);
  });
});
