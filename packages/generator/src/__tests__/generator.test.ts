import { describe, it, expect } from 'vitest';
import {
  STYLES,
  PATIN_IDS,
  generateScene,
  generateFromPrompt,
} from '../index.js';

const PATIN_SET = new Set<string>(PATIN_IDS);

describe('generator — familia patín / vitrina_patin', () => {
  it('STYLES incluye vitrina_patin y labels Disco, Alas, Vintage, Racing, Triciclo, Clásico', () => {
    const ids = STYLES.map((s) => s.id);
    const labels = STYLES.map((s) => s.label);
    expect(ids).toContain('vitrina_patin');
    expect(ids).toContain('patin_quad');
    expect(ids).toContain('patin_disco');
    expect(ids).toContain('patin_alas');
    expect(ids).toContain('patin_viejo');
    expect(ids).toContain('patin_racing');
    expect(ids).toContain('patin_triciclo');
    expect(labels.some((l) => /cl[aá]sico/i.test(l))).toBe(true);
    expect(labels).toContain('Disco');
    expect(labels).toContain('Alas');
    expect(labels).toContain('Vintage');
    expect(labels).toContain('Racing');
    expect(labels).toContain('Triciclo');
  });

  it('vitrina_patin + seed es determinista: pedestal_marmol + uno de los 6', () => {
    const a = generateScene('vitrina_patin', 4242);
    const b = generateScene('vitrina_patin', 4242);
    expect(a.yaml).toBe(b.yaml);
    expect(a.yaml).toContain('concept: pedestal_marmol');
    const hits = PATIN_IDS.filter((id) => a.yaml.includes(`concept: ${id}`));
    expect(hits).toHaveLength(1);
    expect(a.label.toLowerCase()).toMatch(/pat[ií]n/);
  });

  it('generateScene(patin_*) fuerza el concepto, no RNG', () => {
    for (const id of PATIN_IDS) {
      const r = generateScene(id, 7);
      expect(r.yaml).toContain(`concept: ${id}`);
      const others = PATIN_IDS.filter((x) => x !== id);
      for (const o of others) {
        expect(r.yaml).not.toContain(`concept: ${o}`);
      }
      expect(r.yaml).toContain('concept: pedestal_marmol');
    }
  });

  it('generateFromPrompt pide un tipo concreto (no siempre RNG)', () => {
    const cases: Array<{ prompt: string; concept: string }> = [
      { prompt: 'patin disco 70s', concept: 'patin_disco' },
      { prompt: 'skate con alas wing', concept: 'patin_alas' },
      { prompt: 'patín viejo vintage', concept: 'patin_viejo' },
      { prompt: 'roller racing carrera', concept: 'patin_racing' },
      { prompt: 'triciclo 1897 foot-cycle', concept: 'patin_triciclo' },
    ];
    for (const { prompt, concept } of cases) {
      const r = generateFromPrompt(prompt);
      expect(r.yaml, prompt).toContain(`concept: ${concept}`);
      expect(r.yaml, prompt).toContain('concept: pedestal_marmol');
    }
  });

  it('prompt genérico patin|skate|roller cae en vitrina (uno de los 6)', () => {
    const r = generateFromPrompt('quiero un patin en vitrina');
    const hits = PATIN_IDS.filter((id) => r.yaml.includes(`concept: ${id}`));
    expect(hits.length).toBe(1);
    expect(PATIN_SET.has(hits[0]!)).toBe(true);
  });

  it('vitrina usa un material de variante del catálogo', () => {
    const mats = [
      'cuero_vintage',
      'metal_dorado_pulido',
      'metal_bronce_pulido',
      'metal_oxidado',
      'vidrio_esmerilado',
    ];
    const r = generateScene('patin_disco', 1);
    expect(mats.some((m) => r.yaml.includes(m))).toBe(true);
    expect(r.yaml).toContain('metal_dorado_pulido');
  });
});