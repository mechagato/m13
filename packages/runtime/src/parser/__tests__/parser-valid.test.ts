import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseScene, validateScene, SUPPORTED_VERSIONS } from '../index.js';
import { migrateSceneToV02 } from '../schema.js';

/**
 * T-008 — Tests del parser para casos VÁLIDOS.
 *
 * Verifica que escenas .m13 bien formadas se parsean a M13Scene tipada,
 * que los defaults se aplican correctamente, y que las dos formas del
 * material (string corta vs objeto extendido) funcionan.
 *
 * Hermano: parser-errors.test.ts (T-009) cubre casos inválidos.
 */

const MINIMAL_VALID = `
version: "0.1"
name: minimal_room
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;

describe('parser — casos válidos', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('parsea una escena minimal y aplica todos los defaults', () => {
    const scene = parseScene(MINIMAL_VALID);

    expect(scene.version).toBe('0.1');
    expect(SUPPORTED_VERSIONS).toContain(scene.version);
    expect(scene.name).toBe('minimal_room');
    expect(scene.description).toBeUndefined();
    expect(scene.bounds).toEqual([5, 3, 5]);
    expect(scene.spawn).toEqual([0, 0, -3.5]);
    expect(scene.objects).toEqual([]);
    expect(scene.window).toBeUndefined();
  });

  it('aplica defaults completos de ambient', () => {
    const scene = parseScene(MINIMAL_VALID);
    expect(scene.ambient.background).toEqual([0.05, 0.045, 0.04]);
    expect(scene.ambient.ambientColor).toEqual([0.08, 0.075, 0.07]);
    expect(scene.ambient.tint).toEqual([1.0, 1.0, 1.0]);
    expect(scene.ambient.fogColor).toEqual([0.05, 0.045, 0.04]);
    expect(scene.ambient.fogDensity).toBeCloseTo(0.015);
  });

  it('aplica defaults completos de light', () => {
    const scene = parseScene(MINIMAL_VALID);
    expect(scene.light.position).toEqual([0, 2.5, 0]);
    expect(scene.light.color).toEqual([1.0, 0.92, 0.78]);
    expect(scene.light.intensity).toBeCloseTo(1.0);
  });

  it('acepta una escena completa con todos los campos opcionales', () => {
    const yaml = `
version: "0.1"
name: completa
description: "todo lleno"
bounds: [6, 3.5, 6]
spawn: [1, 0, -4]
ambient:
  background: [0.1, 0.1, 0.1]
  ambientColor: [0.2, 0.2, 0.2]
  tint: [0.95, 1.0, 1.05]
  fogColor: [0.05, 0.05, 0.05]
  fogDensity: 0.02
light:
  position: [0, 3, 0]
  color: [1.0, 1.0, 1.0]
  intensity: 1.5
walls: { concept: pared_ladrillo_viejo }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
window:
  position: [0, 0.5, 5]
  size: [1.4, 1.0, 0.5]
objects:
  - id: cubo
    kind: box
    position: [0, 0, 0]
    scale: [1, 1, 1]
    material: metal_dorado_pulido
`;
    const scene = parseScene(yaml);
    expect(scene.description).toBe('todo lleno');
    expect(scene.bounds).toEqual([6, 3.5, 6]);
    expect(scene.ambient.fogDensity).toBeCloseTo(0.02);
    expect(scene.light.intensity).toBeCloseTo(1.5);
    expect(scene.window).toEqual({ position: [0, 0.5, 5], size: [1.4, 1.0, 0.5] });
    expect(scene.objects).toHaveLength(1);
  });

  it('material como string corto vs objeto extendido son equivalentes a nivel datos', () => {
    const yamlShort = `
version: "0.1"
name: mat_corto
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: esfera_a
    kind: sphere
    position: [0, 0, 0]
    material: metal_dorado_pulido
`;
    const yamlLong = `
version: "0.1"
name: mat_largo
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: esfera_b
    kind: sphere
    position: [0, 0, 0]
    material:
      concept: metal_dorado_pulido
      params:
        shimmer: 0.7
`;
    const sShort = parseScene(yamlShort);
    const sLong = parseScene(yamlLong);

    // forma corta: string literal
    expect(typeof sShort.objects[0].material).toBe('string');
    expect(sShort.objects[0].material).toBe('metal_dorado_pulido');

    // forma larga: objeto con concept + params
    expect(typeof sLong.objects[0].material).toBe('object');
    if (typeof sLong.objects[0].material !== 'string') {
      expect(sLong.objects[0].material.concept).toBe('metal_dorado_pulido');
      expect(sLong.objects[0].material.params).toEqual({ shimmer: 0.7 });
    }
  });

  it('scale acepta tanto número uniforme como vec3', () => {
    const yaml = `
version: "0.1"
name: scale_variantes
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: uniform
    kind: sphere
    position: [0, 0, 0]
    scale: 0.5
    material: metal_dorado_pulido
  - id: anisotropic
    kind: box
    position: [0, 0, 0]
    scale: [1.5, 0.3, 1.5]
    material: metal_dorado_pulido
`;
    const scene = parseScene(yaml);
    expect(scene.objects[0].scale).toBe(0.5);
    expect(scene.objects[1].scale).toEqual([1.5, 0.3, 1.5]);
  });

  it('acepta animate y audio_reactive en objects', () => {
    const yaml = `
version: "0.1"
name: animados
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: bobber
    kind: sphere
    position: [0, 0, 0]
    material: metal_dorado_pulido
    audio_reactive: true
    animate:
      mode: bob
      speed: 2.0
      amplitude: 0.2
`;
    const scene = parseScene(yaml);
    expect(scene.objects[0].audio_reactive).toBe(true);
    expect(scene.objects[0].animate).toEqual({ mode: 'bob', speed: 2.0, amplitude: 0.2 });
  });

  it('campos opcionales no proporcionados quedan undefined o default', () => {
    const yaml = `
version: "0.1"
name: simple_obj
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: cubo_simple
    kind: box
    position: [0, 0, 0]
    material: metal_dorado_pulido
`;
    const scene = parseScene(yaml);
    const obj = scene.objects[0];
    expect(obj.rotation).toBeUndefined();
    expect(obj.animate).toBeUndefined();
    expect(obj.audio_reactive).toBe(false); // default explícito en schema
    expect(obj.scale).toBe(1); // default
  });

  it('validateScene acepta un objeto JS directo (sin pasar por YAML)', () => {
    const raw = {
      version: '0.1',
      name: 'desde_objeto',
      walls: { concept: 'pared_yeso_blanco' },
      floor: { concept: 'piso_madera_envejecida' },
      ceiling: { concept: 'pared_yeso_blanco' },
    };
    const scene = validateScene(raw);
    expect(scene.name).toBe('desde_objeto');
    expect(scene.bounds).toEqual([5, 3, 5]);
  });

  it('enruta v0.2 y migra una escena v0.1 sin alterar sus campos', () => {
    const legacy = parseScene(MINIMAL_VALID);
    const migrated = migrateSceneToV02(legacy);
    const v02 = parseScene(MINIMAL_VALID.replace('"0.1"', '"0.2"'));

    expect(migrated).toMatchObject({ ...legacy, version: '0.2' });
    expect(v02.version).toBe('0.2');
    expect(v02.bounds).toEqual(legacy.bounds);
  });

  it('opcion silent suprime warnings de campos desconocidos', () => {
    const yaml = `
version: "0.1"
name: con_extra
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
campo_extra: hola
`;
    parseScene(yaml, { silent: true });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('sin opcion silent, campos desconocidos emiten warning', () => {
    const yaml = `
version: "0.1"
name: con_extra
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
campo_extra: hola
`;
    parseScene(yaml);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('campo_extra'));
  });
});
