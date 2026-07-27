import { describe, expect, it } from 'vitest';
import { compileScene } from '../../compiler/index.js';
import { parseScene } from '../index.js';
import { MAX_KEYFRAMES_PER_OBJECT } from '../schema.js';

const BASE = `
version: "0.2"
name: timeline
floor: { concept: piso_madera_envejecida }
objects:
  - id: orb
    kind: sphere
    position: [0, 0, 0]
    material: metal_dorado_pulido
`;

describe('v0.2 timeline schema', () => {
  it('normalizes keyframes to canonical time order and defaults easing', () => {
    const scene = parseScene(`${BASE}
    animate:
      duration: 10
      keyframes:
        - { t: 10, position: [1, 0, 0] }
        - { t: 0, position: [0, 0, 0], ease: linear }
`);
    const animate = scene.objects[0].animate;
    expect(animate).toMatchObject({ duration: 10, loop: false });
    if (!animate || !('keyframes' in animate)) throw new Error('timeline expected');
    expect(animate.keyframes.map((keyframe) => keyframe.t)).toEqual([0, 10]);
    expect(animate.keyframes[1].ease).toBe('smooth');
  });

  it('rejects duplicate/out-of-range keyframes and keyframes without transforms', () => {
    expect(() => parseScene(`${BASE}
    animate:
      duration: 1
      keyframes:
        - { t: 0 }
        - { t: 2, position: [0, 0, 0] }
        - { t: 2, rotation: [0, 0, 0] }
`)).toThrow(/objects\.0\.animate/);
  });

  it('caps temporal complexity per object', () => {
    const keyframes = Array.from({ length: MAX_KEYFRAMES_PER_OBJECT + 1 }, (_, i) => `        - { t: ${i}, position: [0, 0, 0] }`).join('\n');
    expect(() => parseScene(`${BASE}
    animate:
      duration: 20
      keyframes:
${keyframes}
`)).toThrow(/objects\.0\.animate/);
  });

  it('does not let a timeline reach the legacy compiler before T-603', () => {
    const scene = parseScene(`${BASE}
    animate:
      duration: 1
      keyframes:
        - { t: 0, position: [0, 0, 0] }
`);
    expect(() => compileScene(scene)).toThrow(/T-603/);
  });
});
