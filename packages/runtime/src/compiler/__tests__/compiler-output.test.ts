import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseScene } from '../../parser/index.js';
import { compileScene } from '../index.js';

/**
 * T-010 — Tests del compiler: estructura del WGSL generado.
 *
 * Carga cada escena .m13 real del demo, parsea + compila, y verifica:
 *   - el WGSL output contiene las funciones esperadas (vs_main, fs_main, map, material)
 *   - cada concept referenciado tiene su `fn mat_<id>(...)` inyectada
 *   - `conceptsUsed` lista todos los ids correctos (sin duplicados)
 *
 * Es la primera línea de defensa contra regresiones del codegen.
 * Hermanos: compiler-determinism.test.ts (T-012), compiler-params.test.ts (T-020).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = resolve(__dirname, '../../../../examples/public/scenes');

function loadScene(filename: string): string {
  return readFileSync(resolve(SCENES_DIR, filename), 'utf8');
}

describe('compiler — estructura del WGSL output', () => {
  it('sala_galeria: WGSL contiene fn map/material/vs/fs + conceptos referenciados', () => {
    const scene = parseScene(loadScene('sala_galeria.m13'));
    const compiled = compileScene(scene);

    // Funciones base del shader
    expect(compiled.wgsl).toContain('fn vs_main(');
    expect(compiled.wgsl).toContain('fn fs_main(');
    expect(compiled.wgsl).toContain('fn map(p: vec3<f32>)');
    expect(compiled.wgsl).toContain('fn material(p: vec3<f32>, n: vec3<f32>)');

    // Cada concept usado tiene su fn mat_<id> inyectada
    const expected = [
      'mat_pared_yeso_blanco',
      'mat_piso_marmol_blanco',
      'mat_pedestal_marmol',
      'mat_esfera_decorativa',
      'mat_metal_bronce_pulido',
      'mat_marmol_blanco_vetas',
    ];
    for (const fnName of expected) {
      expect(compiled.wgsl).toContain(`fn ${fnName}(`);
    }

    expect(compiled.conceptsUsed.sort()).toEqual([...expected].map((s) => s.replace('mat_', '')).sort());
    expect(compiled.scene.name).toBe('sala_galeria');
  });

  it('cocina_industrial: 8 conceptos únicos incluyendo geo lampara_colgante', () => {
    const scene = parseScene(loadScene('cocina_industrial.m13'));
    const compiled = compileScene(scene);

    expect(compiled.conceptsUsed.sort()).toEqual(
      [
        'pared_ladrillo_viejo',
        'piso_concreto_industrial',
        'pared_yeso_blanco',
        'lampara_colgante',
        'pared_madera_oscura',
        'metal_bronce_pulido',
        'cuero_vintage',
        'metal_oxidado',
      ].sort(),
    );

    // El concepto geométrico debe estar inyectado con su SDF
    expect(compiled.wgsl).toContain('fn sdf_lampara_colgante(');
    expect(compiled.wgsl).toContain('fn mat_lampara_colgante(');
  });

  it('oficina_neonodos: dedupe de pared_yeso_blanco (walls + ceiling) + 7 únicos', () => {
    const scene = parseScene(loadScene('oficina_neonodos.m13'));
    const compiled = compileScene(scene);

    expect(compiled.conceptsUsed.sort()).toEqual(
      [
        'pared_yeso_blanco',
        'pared_madera_oscura',
        'pedestal_marmol',
        'metal_dorado_pulido',
        'metal_bronce_pulido',
        'lampara_colgante',
        'vidrio_esmerilado',
      ].sort(),
    );

    // yeso aparece en walls + ceiling, pero solo una fn
    const yesoMatches = compiled.wgsl.match(/fn mat_pared_yeso_blanco\(/g) ?? [];
    expect(yesoMatches).toHaveLength(1);
  });

  it('templo_mexica: solo 2 conceptos únicos pese a 6 referencias', () => {
    const scene = parseScene(loadScene('templo_mexica.m13'));
    const compiled = compileScene(scene);

    expect(compiled.conceptsUsed.sort()).toEqual(
      ['piedra_volcanica', 'metal_dorado_pulido'].sort(),
    );
    // walls=floor=ceiling=piedra_volcanica + 3 objects piedra → sólo 1 fn
    const piedraMatches = compiled.wgsl.match(/fn mat_piedra_volcanica\(/g) ?? [];
    expect(piedraMatches).toHaveLength(1);
  });

  it('compileScene con concepto inexistente → error con prefijo del compiler', () => {
    const yaml = `
version: "0.1"
name: roto
walls: { concept: pared_inventada }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    const scene = parseScene(yaml);
    expect(() => compileScene(scene)).toThrow(
      /\[m13\/compiler\] Concepto desconocido: "pared_inventada"/,
    );
  });

  it('window cut: WGSL incluye opSub para recortar la pared', () => {
    const scene = parseScene(loadScene('oficina_neonodos.m13'));
    const compiled = compileScene(scene);
    // oficina_neonodos tiene window definida (única de las 3 nuevas con window)
    expect(scene.window).toBeDefined();
    expect(compiled.wgsl).toContain('opSub(room, windowCut)');
  });

  it('objeto con animate: bob → WGSL incluye sin(u.time * speed)', () => {
    const yaml = `
version: "0.1"
name: bobber
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: bobbing
    kind: sphere
    position: [0, 0, 0]
    scale: 0.5
    material: metal_dorado_pulido
    animate:
      mode: bob
      speed: 2.5
      amplitude: 0.3
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);
    // codegen genera floats con 6 decimales fijos (determinismo T-011)
    expect(compiled.wgsl).toMatch(/sin\(u\.time \* 2\.500000\) \* 0\.300000/);
  });

  it('objeto con audio_reactive: WGSL inyecta u.audioAmp en el radio y posicion', () => {
    const yaml = `
version: "0.1"
name: reactivo
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: reactor
    kind: sphere
    position: [0, 0, 0]
    scale: 0.4
    material: metal_dorado_pulido
    audio_reactive: true
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);
    expect(compiled.wgsl).toContain('u.audioAmp');
  });

  it('escena sin objects: map() sólo contiene el cuarto, no objects', () => {
    const yaml = `
version: "0.1"
name: vacio
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);
    expect(compiled.wgsl).toContain('fn map(p: vec3<f32>)');
    // sin objects, no debería haber "let obj0 ="
    expect(compiled.wgsl).not.toContain('let obj0 =');
  });

  it('shader output incluye los bloques canónicos (común + raymarch)', () => {
    const scene = parseScene(loadScene('oficina_neonodos.m13'));
    const compiled = compileScene(scene);

    // De COMMON_WGSL
    expect(compiled.wgsl).toContain('struct Uniforms');
    expect(compiled.wgsl).toContain('fn sdBox(');
    expect(compiled.wgsl).toContain('fn fbm(');

    // De RAYMARCH_WGSL
    expect(compiled.wgsl).toContain('fn raymarch(');
    expect(compiled.wgsl).toContain('fn calcNormal(');
    expect(compiled.wgsl).toContain('fn softShadow(');
    expect(compiled.wgsl).toContain('fn calcAO(');
    expect(compiled.wgsl).toContain('fn shade(');
  });

  it('WGSL total > 4 KB para una escena con varios conceptos', () => {
    const scene = parseScene(loadScene('oficina_neonodos.m13'));
    const compiled = compileScene(scene);
    expect(compiled.wgsl.length).toBeGreaterThan(4096);
  });

  it('genera SDF correcto para cada kind primitivo (sphere/box/round_box/cylinder/torus)', () => {
    const yaml = `
version: "0.1"
name: todos_los_kinds
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: s
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material: metal_dorado_pulido
  - id: b
    kind: box
    position: [1, 0, 0]
    scale: [0.4, 0.5, 0.6]
    material: metal_dorado_pulido
  - id: rb
    kind: round_box
    position: [2, 0, 0]
    scale: [0.4, 0.5, 0.6]
    material: metal_dorado_pulido
  - id: c
    kind: cylinder
    position: [3, 0, 0]
    scale: [0.3, 0.7, 0.3]
    material: metal_dorado_pulido
  - id: t
    kind: torus
    position: [4, 0, 0]
    scale: [0.4, 0.1, 0.4]
    material: metal_dorado_pulido
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);
    // Cada primitiva debe estar referenciada al menos una vez
    expect(compiled.wgsl).toContain('sdSphere(');
    expect(compiled.wgsl).toContain('sdBox(');
    expect(compiled.wgsl).toContain('sdRoundBox(');
    expect(compiled.wgsl).toContain('sdCylinder(');
    expect(compiled.wgsl).toContain('sdTorus(');
  });
});
