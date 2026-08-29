import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseOverlay } from '../overlay.js';
import { hasModuleKeys } from '../strip.js';
import { MODULE_ROOT_KEY_SET } from '../keys.js';
import { loadFixture, listExampleScenes } from './helpers.js';
import { parseScene, validateScene } from '../../../runtime/src/parser/index.js';

const SILENT = { silent: true as const };

function assertNoModuleKeys(visual: Record<string, unknown>): void {
  for (const key of Object.keys(visual)) {
    expect(MODULE_ROOT_KEY_SET.has(key), `clave de módulo en visual: ${key}`).toBe(false);
  }
  expect(hasModuleKeys(visual)).toBe(false);
}

describe('strip-to-visual', () => {
  it('C produce objeto sin claves de módulo y parseScene no explota', () => {
    const result = parseOverlay(loadFixture('C-ambos.m13'), SILENT);
    assertNoModuleKeys(result.visual);
    expect(result.visual.version).toBe('0.2');
    expect(result.visual.education).toBeUndefined();
    expect(result.visual.game).toBeUndefined();
    expect(result.visual.npc).toBeUndefined();
    expect(result.visual.missions).toBeUndefined();
    expect(result.visual.items).toBeUndefined();
    expect(Array.isArray(result.visual.events)).toBe(true);
    const events = result.visual.events as Array<{ kind?: string }>;
    expect(events.every((e) => e.kind === 'light_flash')).toBe(true);

    const objects = result.visual.objects as Array<Record<string, unknown>>;
    for (const obj of objects) {
      expect(obj.label).toBeUndefined();
      expect(obj.interact).toBeUndefined();
    }

    expect(() => validateScene(result.visual, { strict: true, silent: true })).not.toThrow();
    expect(() => parseScene(loadFixture('C-ambos.m13'), SILENT)).toThrow(/v0\.3 no soportado/);
  });

  it('A (English Lab) stripeado es visual v0.2 aceptado por parseScene', () => {
    const result = parseOverlay(loadFixture('A-english-lab.m13'), SILENT);
    assertNoModuleKeys(result.visual);
    expect(result.visual.events).toBeUndefined();
    const scene = validateScene(result.visual, { strict: true, silent: true });
    expect(scene.version).toBe('0.2');
    expect(scene.name).toBe('laboratorio_ingles');
  });

  it('B (valle_minimo) stripeado no lleva game/items/npc', () => {
    const result = parseOverlay(loadFixture('B-valle_minimo.m13'), SILENT);
    assertNoModuleKeys(result.visual);
    expect(result.visual.game).toBeUndefined();
    expect(result.visual.items).toBeUndefined();
    expect(() => validateScene(result.visual, { strict: true, silent: true })).not.toThrow();
  });

  it('D v0.1 de examples/ sigue parseando tras strip (versión intacta)', () => {
    const yaml = loadFixture('D-templo_mexica.m13');
    const result = parseOverlay(yaml, SILENT);
    expect(result.visual.version).toBe('0.1');
    const scene = parseScene(yaml, SILENT);
    const stripped = validateScene(result.visual, { strict: true, silent: true });
    expect(stripped.name).toBe(scene.name);
    expect(stripped.objects).toHaveLength(scene.objects.length);
  });

  it('cada .m13 de packages/examples/public/scenes parsea tras strip', () => {
    const files = listExampleScenes();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const yaml = readFileSync(file, 'utf8');
      const visual = parseOverlay(yaml, SILENT).visual;
      expect(hasModuleKeys(visual), file).toBe(false);
      expect(() => validateScene(visual, { strict: true, silent: true }), file).not.toThrow();
    }
  });
});
