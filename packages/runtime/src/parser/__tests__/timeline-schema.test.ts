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

  it('compiles position, rotation and scale in WGSL without CPU per-frame work', () => {
    const scene = parseScene(`${BASE}
    animate:
      duration: 4
      loop: false
      keyframes:
        - { t: 0, position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }
        - { t: 4, position: [2, 1, 0], rotation: [0, 180, 0], scale: [2, 1, 1], ease: out }
`);
    const { wgsl } = compileScene(scene);
    expect(wgsl).toContain('let tl0Time = min(u.time, 4.000000);');
    expect(wgsl).toContain('tl0Pos = mix(');
    expect(wgsl).toContain('tl0Rot = mix(');
    expect(wgsl).toContain('tl0Scale = mix(');
    expect(wgsl).toContain('let tl0Rad = radians(tl0Rot);');
    expect(wgsl).toContain('let tl0P = tl0X / tl0Scale;');
    expect(wgsl).toContain('let tl0DistanceScale = min(');
  });

  it('compiles loop timelines deterministically', () => {
    const scene = parseScene(`${BASE}
    animate:
      duration: 2
      loop: true
      keyframes:
        - { t: 0, position: [0, 0, 0] }
        - { t: 2, position: [1, 0, 0], ease: linear }
`);
    const a = compileScene(scene).wgsl;
    const b = compileScene(scene).wgsl;
    expect(a).toBe(b);
    expect(a).toContain('fract(u.time / 2.000000) * 2.000000');
  });

  it('carries omitted transform fields and interpolates from identity before the first keyframe', () => {
    const scene = parseScene(`${BASE}
    animate:
      duration: 4
      keyframes:
        - { t: 2, position: [2, 0, 0], ease: linear }
        - { t: 4, rotation: [0, 90, 0] }
`);
    const { wgsl } = compileScene(scene);
    expect(wgsl).toContain('tl0Pos = mix(vec3<f32>(0.000000, 0.000000, 0.000000), vec3<f32>(2.000000, 0.000000, 0.000000), tl0Ease0);');
    expect(wgsl).toContain('tl0Pos = mix(vec3<f32>(2.000000, 0.000000, 0.000000), vec3<f32>(2.000000, 0.000000, 0.000000), tl0Ease1);');
    expect(wgsl).toContain('tl0Scale = mix(vec3<f32>(1.000000, 1.000000, 1.000000), vec3<f32>(1.000000, 1.000000, 1.000000), tl0Ease1);');
  });

  it('compiles light_flash as a bounded shader-only light pulse', () => {
    const scene = parseScene(`${BASE}
events:
  - { t: 3, kind: light_flash }
  - { t: 4, kind: light_flash, duration: 0.5, intensity: 2 }
`);
    expect(scene.events).toEqual([
      { t: 3, kind: 'light_flash', duration: 0.15, intensity: 1 },
      { t: 4, kind: 'light_flash', duration: 0.5, intensity: 2 },
    ]);
    const { wgsl } = compileScene(scene);
    expect(wgsl).toContain('fn sceneLightIntensity() -> f32 {');
    expect(wgsl).toContain('abs(u.time - 3.000000) / 0.150000');
    expect(wgsl).toContain('u.lightIntensity * (1.0 + flash)');
    expect(wgsl).toContain('shadow * sceneLightIntensity()');
  });

  it('requires v0.2 for temporal scene events', () => {
    expect(() => parseScene(`
version: "0.1"
name: legacy_event
floor: { concept: piso_madera_envejecida }
events:
  - { t: 1, kind: light_flash }
`)).toThrow(/requiere version: "0.2"/);
  });
});
