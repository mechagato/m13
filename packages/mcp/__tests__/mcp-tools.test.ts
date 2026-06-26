import { describe, it, expect } from 'vitest';
import { parseScene, compileScene } from '@m13/runtime';
import { STYLES, generateScene } from '@m13/generator';
import { listConcepts } from '@m13/synth';
import {
  buildShareUrl,
  runGenerateScene,
  runValidateScene,
  runShareScene,
  runListConcepts,
  SHARE_BASE_URL,
} from '../src/tools.js';
import { buildFormatGuide } from '../src/format-guide.js';

/**
 * Tests de la LÓGICA de los 5 tools MCP (no del transporte stdio).
 *
 * Las funciones run* son puras — se importan sin levantar el server.
 * El transporte es plomería del SDK; lo que m13 garantiza es que cada tool
 * produce escenas válidas, errores accionables y links que roundtripean.
 */

const VALID_MINIMAL = `
version: "0.1"
name: minimal_room
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;

describe('generate_m13_scene — lógica', () => {
  it('los 6 estilos generan YAML que pasa parseScene + compileScene sin throw', () => {
    for (const { id } of STYLES) {
      const result = runGenerateScene({ style: id, seed: 1234 });
      expect(result.yaml.length).toBeGreaterThan(0);
      // Validación independiente — directo contra el runtime
      const scene = parseScene(result.yaml, { silent: true });
      expect(() => compileScene(scene)).not.toThrow();
    }
  });

  it('mismo style + seed produce el mismo YAML (determinista)', () => {
    const a = runGenerateScene({ style: 'galeria', seed: 42 });
    const b = runGenerateScene({ style: 'galeria', seed: 42 });
    expect(a.yaml).toBe(b.yaml);
    expect(a.seed).toBe(42);
    // Coincide con el generador directo
    expect(a.yaml).toBe(generateScene('galeria', 42).yaml);
  });

  it('con prompt mapea por keywords y devuelve escena válida', () => {
    const result = runGenerateScene({ prompt: 'una galería de arte minimalista' });
    expect(result.label.length).toBeGreaterThan(0);
    expect(() => parseScene(result.yaml, { silent: true })).not.toThrow();
  });

  it('prompt "para papá" (y "para papa") genera la escena dedicada, válida y compilable', () => {
    for (const prompt of ['para papá', 'Para Papa', '  PARA PAPÁ  ']) {
      const result = runGenerateScene({ prompt });
      expect(result.yaml).toContain('dedicated_to: "Genaro García Torres — el día que lo veas, ya llegamos."');
      const scene = parseScene(result.yaml, { silent: true });
      expect(() => compileScene(scene)).not.toThrow();
    }
  });

  it('incluye bytes (UTF-8 reales) y share_url', () => {
    const result = runGenerateScene({ style: 'templo', seed: 7 });
    expect(result.bytes).toBe(new TextEncoder().encode(result.yaml).length);
    expect(result.share_url.startsWith(`${SHARE_BASE_URL}#scene=`)).toBe(true);
  });

  it('sin style ni prompt lanza error accionable', () => {
    expect(() => runGenerateScene({})).toThrow(/style.*prompt|prompt.*style/i);
  });
});

describe('validate_m13_scene — lógica', () => {
  it('YAML válido → ok con stats correctos', () => {
    const result = runValidateScene(VALID_MINIMAL);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.name).toBe('minimal_room');
      expect(result.stats.version).toBe('0.1');
      expect(result.stats.objects).toBe(0);
      expect(result.stats.concepts_used).toEqual([
        'pared_yeso_blanco',
        'piso_madera_envejecida',
      ]);
      expect(result.stats.bytes).toBe(new TextEncoder().encode(VALID_MINIMAL).length);
    }
  });

  it('YAML malformado → ok:false con mensaje del parser', () => {
    const result = runValidateScene('::: esto no es yaml válido {{{');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error).toContain('[m13/parser]');
    }
  });

  it('escena sin campos obligatorios → ok:false con el issue exacto', () => {
    const result = runValidateScene('version: "0.1"\nname: incompleta\n');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/walls|floor|ceiling/);
    }
  });

  it('concepto inexistente → ok:false con mensaje del compilador', () => {
    const yaml = VALID_MINIMAL.replace('pared_yeso_blanco', 'concepto_inventado');
    const result = runValidateScene(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('concepto_inventado');
    }
  });
});

describe('share_m13_scene — lógica', () => {
  it('share_url decodifica de vuelta al YAML original (roundtrip base64url)', () => {
    const { yaml } = runGenerateScene({ style: 'cocina', seed: 99 });
    const { share_url } = runShareScene(yaml);
    const encoded = share_url.split('#scene=')[1]!;
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
    expect(decoded).toBe(yaml);
  });

  it('buildShareUrl roundtripea también con caracteres no-ASCII (acentos en descripciones)', () => {
    const yaml = VALID_MINIMAL.replace(
      'name: minimal_room',
      'name: minimal_room\ndescription: "Cuarto vacío — sin más"',
    );
    const url = buildShareUrl(yaml);
    const decoded = Buffer.from(url.split('#scene=')[1]!, 'base64url').toString('utf8');
    expect(decoded).toBe(yaml);
  });

  it('YAML inválido → lanza (valida antes de compartir)', () => {
    expect(() => runShareScene('no: es: escena:')).toThrow(/inválida/i);
  });
});

describe('list_m13_concepts — lógica', () => {
  it('lista no vacía y en sync con el registry de @m13/synth', () => {
    const summaries = runListConcepts();
    const registry = listConcepts();
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.length).toBe(registry.length);
  });

  it('cada concepto trae id, category y description', () => {
    for (const c of runListConcepts()) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.category.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
      expect(typeof c.hasParams).toBe('boolean');
    }
  });
});

describe('get_m13_format_guide — lógica', () => {
  it('la guía incluye TODOS los ids de conceptos del registry (catálogo vivo, cero drift)', () => {
    const guide = buildFormatGuide();
    for (const c of listConcepts()) {
      expect(guide).toContain(c.id);
    }
  });

  it('la guía declara la versión soportada y las reglas clave del formato', () => {
    const guide = buildFormatGuide();
    expect(guide).toContain('version: "0.1"');
    expect(guide).toContain('kind: concept');
    expect(guide).toContain('audio_reactive');
  });

  it('los ejemplos embebidos en la guía son escenas .m13 válidas', () => {
    const guide = buildFormatGuide();
    const blocks = [...guide.matchAll(/```yaml\n([\s\S]*?)```/g)].map((m) => m[1]!);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    for (const block of blocks) {
      const result = runValidateScene(block);
      expect(result.ok).toBe(true);
    }
  });
});

describe('piedra_volcanica_s13 — prototipo Sonido 13 (T-221)', () => {
  const S13_SCENE = `
version: "0.1"
name: s13_test
bounds: [8, 4, 16]
spawn: [0, 0, -13]
walls: { concept: piedra_volcanica_s13 }
floor: { concept: piedra_volcanica_s13 }
ceiling: { concept: piedra_volcanica_s13 }
objects:
  - id: monolito
    kind: box
    material: piedra_volcanica_s13
    position: [0, -0.8, 0]
    scale: [1.4, 2.2, 1.0]
`;

  it('una escena con piedra_volcanica_s13 parsea y compila (concepto registrado)', () => {
    const scene = parseScene(S13_SCENE, { silent: true });
    const compiled = compileScene(scene);
    expect(compiled.conceptsUsed).toContain('piedra_volcanica_s13');
    // el WGSL ensamblado trae la función del concepto y fbm_continuous (de common)
    expect(compiled.wgsl).toContain('mat_piedra_volcanica_s13');
    expect(compiled.wgsl).toContain('fn fbm_continuous');
  });
});
