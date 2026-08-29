import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScene } from '../index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(resolve(here, '../../../../spec/fixtures', name), 'utf8');

describe('parser — overlay v0.3 strip-to-visual', () => {
  it('English Lab (kit real) carga como escena visual v0.2', () => {
    const scene = parseScene(fixture('A-english-lab.m13'), { silent: true, strict: true });
    expect(scene.version).toBe('0.2');
    expect(scene.name).toBe('laboratorio_ingles');
    expect(scene.objects.some((o) => o.id === 'red_ball')).toBe(true);
    expect(scene.objects.some((o) => o.id === 'cat')).toBe(true);
    expect((scene as { education?: unknown }).education).toBeUndefined();
    expect((scene as { npc?: unknown }).npc).toBeUndefined();
    expect((scene as { missions?: unknown }).missions).toBeUndefined();
  });

  it('valle_minimo (solo game) carga sin catálogos de survival', () => {
    const scene = parseScene(fixture('B-valle_minimo.m13'), { silent: true, strict: true });
    expect(scene.version).toBe('0.2');
    expect(scene.name).toBe('valle_minimo');
    expect(scene.objects.some((o) => o.id === 'jabali_0')).toBe(true);
    expect((scene as { game?: unknown }).game).toBeUndefined();
    expect((scene as { items?: unknown }).items).toBeUndefined();
  });

  it('loadScene-equivalent strict no explota con C (education + game)', () => {
    expect(() => parseScene(fixture('C-ambos.m13'), { silent: true, strict: true })).not.toThrow();
  });
});
