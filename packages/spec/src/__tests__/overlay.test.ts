import { describe, expect, it } from 'vitest';
import { parseOverlay } from '../overlay.js';
import { loadFixture } from './helpers.js';

const SILENT = { silent: true as const };

describe('overlay — parse Vertical 1 (kit/studio)', () => {
  it('English Lab (objective.talk: miss_luna) valida', () => {
    const result = parseOverlay(loadFixture('A-english-lab.m13'), SILENT);
    expect(result.overlay.version).toBe('0.3');
    expect(result.overlay.education?.subject).toBe('Inglés');
    expect(result.overlay.education?.mode).toBe('student');
    expect(result.overlay.education?.bloom).toContain('remember');
    expect(result.overlay.npc.map((n) => n.id)).toEqual(['miss_luna']);
    const m1 = result.overlay.missions.find((m) => m.id === 'm1');
    expect(m1?.kind).toBe('lesson');
    expect(m1?.objective?.talk).toBe('miss_luna');
    expect(result.overlay.ui?.hud).toBe('education');
    expect(result.overlay.educationEvents).toHaveLength(1);
    expect(result.overlay.visualEvents).toHaveLength(0);
  });

  it('infiere kind: lesson cuando hay education y objective sin kind', () => {
    const result = parseOverlay(loadFixture('A-english-lab.m13'), SILENT);
    for (const mission of result.overlay.missions) {
      expect(mission.kind).toBe('lesson');
    }
  });

  it('rechaza education simplificada a locale/lesson (YAML resumido del SDD)', () => {
    const yaml = `
version: "0.3"
name: sdd_resumen
floor: { concept: piso_concreto_industrial }
education:
  locale: en
  lesson: supermarket_aisle
`;
    expect(() => parseOverlay(yaml, SILENT)).toThrow(/subject/);
  });
});

describe('overlay — parse Vertical 2 (game)', () => {
  it('valle_minimo con game: valida', () => {
    const result = parseOverlay(loadFixture('B-valle_minimo.m13'), SILENT);
    expect(result.overlay.game?.seed).toBe(42);
    expect(result.overlay.game?.tick_hz).toBe(20);
    expect(result.overlay.items?.map((i) => i.id)).toContain('fibra');
    expect(result.overlay.npc[0]?.role).toBe('enemy');
    expect(result.overlay.npc[0]?.object).toBe('jabali_0');
    const survival = result.overlay.missions.find((m) => m.id === 'primera_comida');
    expect(survival?.kind).toBe('survival');
    expect(survival?.steps?.[0]?.id).toBe('come');
    expect(result.overlay.education).toBeUndefined();
  });

  it('catálogos V2 sin game: warning (non-strict) y error (strict)', () => {
    const yaml = `
version: "0.3"
name: items_sin_game
floor: { concept: piso_madera_envejecida }
items:
  - id: fibra
    stack: 16
`;
    const warned = parseOverlay(yaml, SILENT);
    expect(warned.warnings.some((w) => w.includes("catálogo V2 'items'"))).toBe(true);
    expect(() => parseOverlay(yaml, { ...SILENT, strict: true })).toThrow(/catálogo V2 'items'/);
  });
});

describe('overlay — ambos módulos', () => {
  it('fixture C education + game valida y mezcla lesson/survival', () => {
    const result = parseOverlay(loadFixture('C-ambos.m13'), SILENT);
    expect(result.overlay.education?.subject).toBe('Inglés');
    expect(result.overlay.game?.seed).toBe(7);
    const kinds = result.overlay.missions.map((m) => m.kind).sort();
    expect(kinds).toEqual(['lesson', 'survival']);
    expect(result.overlay.educationEvents).toHaveLength(1);
    expect(result.overlay.visualEvents).toHaveLength(1);
  });
});

describe('overlay — v0.1 sin módulos', () => {
  it('fixture D (templo_mexica) valida como overlay visual', () => {
    const result = parseOverlay(loadFixture('D-templo_mexica.m13'), SILENT);
    expect(result.overlay.version).toBe('0.1');
    expect(result.overlay.npc).toEqual([]);
    expect(result.overlay.education).toBeUndefined();
    expect(result.overlay.game).toBeUndefined();
  });
});

describe('overlay — coerción de versión YAML', () => {
  it('acepta version: 0.3 sin comillas (float YAML)', () => {
    const yaml = `
version: 0.3
name: unquoted
floor: { concept: piso_madera_envejecida }
education:
  subject: Inglés
  grade: primaria
  durationMin: 8
  language: en
  difficulty: intro
  objectives: ["hola"]
  bloom: [remember]
  stem: false
  mode: student
`;
    const result = parseOverlay(yaml, SILENT);
    expect(result.overlay.version).toBe('0.3');
  });
});
