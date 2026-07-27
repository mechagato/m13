import { describe, it, expect } from 'vitest';
import { parseScene, validateScene } from '../index.js';
import { MAX_SCENE_OBJECTS } from '../schema.js';

/**
 * T-009 — Tests del parser para casos INVÁLIDOS.
 *
 * Cada test verifica que:
 *   (a) el parser/validator LANZA un error (no silencio)
 *   (b) el mensaje contiene el path del campo fallido
 *   (c) el mensaje empieza con el prefijo namespaceado `[m13/parser]`
 *
 * Hermano: parser-valid.test.ts (T-008) cubre la rama feliz.
 *
 * Nota sobre el alcance: el parser NO valida que el `concept` referenciado
 * exista en @m13/synth — eso es responsabilidad del compiler. Aquí sólo
 * validamos errores de schema + sintaxis + versionado.
 */

const VALID_BASE = `
version: "0.1"
name: base
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;

describe('parser — casos de error', () => {
  it('YAML sintácticamente inválido → error con prefijo del parser', () => {
    const broken = ': : :';
    expect(() => parseScene(broken)).toThrow(/\[m13\/parser\] YAML inválido/);
  });

  it('versión no soportada (0.2) → error claro con número de versión', () => {
    const yaml = VALID_BASE.replace('"0.1"', '"0.2"');
    expect(() => parseScene(yaml)).toThrow(
      /\[m13\/parser\] m13 v0\.2 no soportado por este runtime/,
    );
  });

  it('versión no soportada (1.0) → error con la versión exacta proporcionada', () => {
    const yaml = VALID_BASE.replace('"0.1"', '"1.0"');
    expect(() => parseScene(yaml)).toThrow(/m13 v1\.0 no soportado/);
  });

  it('name faltante → ZodError con path "name"', () => {
    const yaml = `
version: "0.1"
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    try {
      parseScene(yaml);
      throw new Error('debió lanzar');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/\[m13\/parser\] Escena \.m13 inválida/);
      expect(msg).toMatch(/name/);
    }
  });

  it('sin walls/ceiling → escena de EXTERIOR válida (T-231), walls/ceiling undefined', () => {
    const yaml = `
version: "0.1"
name: exterior_min
floor: { concept: piso_madera_envejecida }
`;
    const scene = parseScene(yaml);
    expect(scene.walls).toBeUndefined();
    expect(scene.ceiling).toBeUndefined();
    expect(scene.floor.concept).toBe('piso_madera_envejecida');
  });

  it('floor faltante → error (el suelo sigue siendo obligatorio en exterior e interior)', () => {
    const yaml = `
version: "0.1"
name: sin_floor
walls: { concept: pared_yeso_blanco }
ceiling: { concept: pared_yeso_blanco }
`;
    expect(() => parseScene(yaml)).toThrow(/floor/);
  });

  it('bounds no es vec3 (2 elementos) → path "bounds"', () => {
    const yaml = `
version: "0.1"
name: bounds_corto
bounds: [1, 2]
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    expect(() => parseScene(yaml)).toThrow(/bounds/);
  });

  it('object sin position → path "objects.0.position"', () => {
    const yaml = `
version: "0.1"
name: obj_sin_pos
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: roto
    kind: sphere
    material: metal_dorado_pulido
`;
    expect(() => parseScene(yaml)).toThrow(/objects\.0\.position/);
  });

  it('object con kind fuera del enum → error con path "objects.0.kind"', () => {
    const yaml = `
version: "0.1"
name: kind_invalido
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: forma_imaginaria
    kind: tetraedro_inventado
    position: [0, 0, 0]
    material: metal_dorado_pulido
`;
    expect(() => parseScene(yaml)).toThrow(/objects\.0\.kind/);
  });

  it('light.intensity con tipo incorrecto (string) → path "light.intensity"', () => {
    const yaml = `
version: "0.1"
name: light_string
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
light:
  intensity: "muy fuerte"
`;
    expect(() => parseScene(yaml)).toThrow(/light\.intensity/);
  });

  it('animate.mode con valor fuera del enum → path "objects.0.animate.mode"', () => {
    const yaml = `
version: "0.1"
name: animate_invalido
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: animado
    kind: sphere
    position: [0, 0, 0]
    material: metal_dorado_pulido
    animate:
      mode: girar_estilo_libre
`;
    expect(() => parseScene(yaml)).toThrow(/objects\.0\.animate\.mode/);
  });

  it('multiples errores reportados juntos con bullets', () => {
    const yaml = `
version: "0.1"
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
light:
  intensity: "fuerte"
`;
    try {
      parseScene(yaml);
      throw new Error('debió lanzar');
    } catch (err) {
      const msg = (err as Error).message;
      // formato del agregador: "  · path — message"
      expect(msg).toMatch(/ {2}· name/);
      expect(msg).toMatch(/ {2}· light\.intensity/);
    }
  });

  it('validateScene rechaza directamente raw inválido (no pasa por YAML)', () => {
    expect(() => validateScene({ version: '0.1' })).toThrow(/name/);
  });

  it('raw null al validator → error de schema (no crash)', () => {
    expect(() => validateScene(null)).toThrow(/\[m13\/parser\] Escena \.m13 inválida/);
  });

  it('rechaza números no finitos antes de que lleguen al compilador WGSL', () => {
    const yaml = `${VALID_BASE}\nbounds: [.inf, 3, 5]\n`;
    expect(() => parseScene(yaml)).toThrow(/bounds/);
  });

  it('rechaza escenas que exceden el presupuesto de objetos', () => {
    const objects = Array.from({ length: MAX_SCENE_OBJECTS + 1 }, (_, i) => `
  - id: o${i}
    kind: sphere
    position: [0, 0, 0]
    material: metal_dorado_pulido`).join('');
    expect(() => parseScene(`${VALID_BASE}\nobjects:${objects}`)).toThrow(/objects/);
  });
});
