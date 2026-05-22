import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parseScene } from '../../parser/index.js';
import { compileScene } from '../index.js';

/**
 * T-012 — Tests de DETERMINISMO del compiler.
 *
 * Valida el contrato: misma escena → mismo WGSL byte-por-byte → mismo SHA-256.
 *
 * Esto es la base de:
 *   - T-013 caché de shaders por hash en M13Engine (evita recompile innecesario).
 *   - Reproducibilidad para debug y CI.
 *   - Multiplayer futuro: si dos clientes compilan la misma escena, el shader
 *     resultante es idéntico — no se necesita sincronización del pipeline GPU.
 *
 * El contrato está implementado en T-011 (sort + toFixed(6) + bug fix extraR).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = resolve(__dirname, '../../../../examples/public/scenes');

function loadScene(filename: string): string {
  return readFileSync(resolve(SCENES_DIR, filename), 'utf8');
}

function hashWgsl(yamlText: string): string {
  const scene = parseScene(yamlText, { silent: true });
  const compiled = compileScene(scene);
  return createHash('sha256').update(compiled.wgsl).digest('hex');
}

describe('compiler — determinismo (T-012)', () => {
  it('100 corridas de sala_galeria producen exactamente 1 hash SHA-256', () => {
    const yaml = loadScene('sala_galeria.m13');
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      hashes.add(hashWgsl(yaml));
    }
    expect(hashes.size).toBe(1);
  });

  it('100 corridas de cada una de las 4 escenas demo: 1 hash único por escena', () => {
    const scenes = [
      'sala_galeria.m13',
      'cocina_industrial.m13',
      'oficina_neonodos.m13',
      'templo_mexica.m13',
    ];
    for (const scene of scenes) {
      const yaml = loadScene(scene);
      const hashes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        hashes.add(hashWgsl(yaml));
      }
      expect(hashes.size, `${scene} debe producir 1 hash único`).toBe(1);
    }
  });

  it('escenas distintas producen hashes distintos (control)', () => {
    const hashes = [
      hashWgsl(loadScene('sala_galeria.m13')),
      hashWgsl(loadScene('cocina_industrial.m13')),
      hashWgsl(loadScene('oficina_neonodos.m13')),
      hashWgsl(loadScene('templo_mexica.m13')),
    ];
    // Los 4 hashes deben ser todos distintos entre sí
    expect(new Set(hashes).size).toBe(4);
  });

  it('conceptsUsed siempre ordenado lexicográficamente', () => {
    const yaml = loadScene('oficina_neonodos.m13');
    for (let i = 0; i < 20; i++) {
      const scene = parseScene(yaml, { silent: true });
      const compiled = compileScene(scene);
      const sortedCopy = [...compiled.conceptsUsed].sort();
      expect(compiled.conceptsUsed).toEqual(sortedCopy);
    }
  });

  it('todos los floats del WGSL tienen 6 decimales fijos (sin ruido binario)', () => {
    const yaml = `
version: "0.1"
name: test_floats
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
bounds: [5, 3, 5]
objects:
  - id: a
    kind: sphere
    position: [0.1, 0.2, 0.3]
    scale: 0.4
    material: metal_dorado_pulido
`;
    const scene = parseScene(yaml);
    const { wgsl } = compileScene(scene);

    // Las posiciones del object deben aparecer con 6 decimales
    expect(wgsl).toContain('0.100000');
    expect(wgsl).toContain('0.200000');
    expect(wgsl).toContain('0.300000');
    expect(wgsl).toContain('0.400000');
    // Sin variantes de precisión IEEE 754 (e.g. 0.1 nativo es 0.1000000000000000055)
    expect(wgsl).not.toMatch(/0\.10000000000000000\d+/);
  });

  it('compileScene es funcionalmente puro: dos escenas equivalentes desde YAMLs distintos pero semánticamente iguales producen mismo WGSL', () => {
    // Mismo schema, diferentes representaciones YAML (espacios, comments)
    const yamlA = `
# Comentario al inicio
version: "0.1"
name: pure_test
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    const yamlB = `version: "0.1"
name: pure_test
# Comentario en medio
walls: { concept: pared_yeso_blanco }


floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    expect(hashWgsl(yamlA)).toBe(hashWgsl(yamlB));
  });

  it('el hash del WGSL es estable bajo orden distinto de los objects sintácticamente — NO, depende del orden de objects (decisión documentada)', () => {
    // Este test DOCUMENTA que el orden de objects[] en el YAML SÍ afecta el output.
    // Cambiar el orden produce shaders distintos (índices obj0..objN cambian de asignación).
    // Si en el futuro se quiere ortogonalidad sobre orden de objects, agregar sort
    // por id en collectConceptIds. Por ahora se respeta el orden del autor.
    const yamlA = `
version: "0.1"
name: orden_a
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: alfa
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material: metal_dorado_pulido
  - id: beta
    kind: box
    position: [1, 0, 0]
    scale: [0.5, 0.5, 0.5]
    material: cuero_vintage
`;
    const yamlB = `
version: "0.1"
name: orden_b
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: beta
    kind: box
    position: [1, 0, 0]
    scale: [0.5, 0.5, 0.5]
    material: cuero_vintage
  - id: alfa
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material: metal_dorado_pulido
`;
    expect(hashWgsl(yamlA)).not.toBe(hashWgsl(yamlB));
  });
});
