import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScene } from '../../parser/index.js';
import { compileScene, hashWgsl } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoPath = resolve(__dirname, '../../../../examples/public/scenes/chichen_amanecer.m13');

describe('demo temporal - Chichen amanecer (T-607)', () => {
  it('is a valid v0.2 scene with temporal transform and light event', async () => {
    const scene = parseScene(readFileSync(demoPath, 'utf8'), { strict: true });
    expect(scene.version).toBe('0.2');
    if (scene.version !== '0.2') throw new Error('v0.2 expected');
    expect(scene.events).toHaveLength(1);
    const sun = scene.objects.find((object) => object.id === 'sol_amanecer');
    expect(sun?.animate).toMatchObject({ duration: 20, loop: true });

    const first = compileScene(scene).wgsl;
    const second = compileScene(scene).wgsl;
    expect(first).toBe(second);
    expect(first).toContain('fract(u.time / 20.000000) * 20.000000');
    expect(first).toContain('fn sceneLightIntensity() -> f32 {');
    expect(await hashWgsl(first)).toMatch(/^[0-9a-f]{64}$/);
  });
});
