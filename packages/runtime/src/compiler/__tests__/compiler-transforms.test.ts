import { describe, it, expect } from 'vitest';
import { compileScene } from '../index.js';
import { parseScene } from '../../parser/index.js';

/**
 * Tests de las transformaciones de objeto del compilador (auditoría 2026-06-10):
 *  - rotation estática (FR-1.3): matriz inversa precomputada como constante
 *  - animate.mode 'rotate': giro continuo en Y (antes era no-op silencioso)
 *  - animate.mode 'pulse': escala uniforme oscilante con corrección de distancia
 *  - missColor(): ambient.background por fin llega al shader
 */

const BASE = `
name: test_transforms
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
`;

function sceneWith(objYaml: string): string {
  return `${BASE}objects:\n${objYaml}`;
}

describe('compiler — rotation estática (FR-1.3)', () => {
  it('objeto con rotation emite matriz rotM y la aplica al punto local', () => {
    const yaml = sceneWith(`  - id: caja
    kind: box
    position: [0, 0, 0]
    rotation: [0, 45, 0]
    material: metal_dorado_pulido
`);
    const compiled = compileScene(parseScene(yaml));
    expect(compiled.wgsl).toContain('let rotM0 = mat3x3<f32>(');
    expect(compiled.wgsl).toContain('(rotM0 * (p - vec3<f32>(');
  });

  it('rotation [0,0,0] NO emite matriz (output idéntico al de sin rotation)', () => {
    const sin = compileScene(parseScene(sceneWith(`  - id: caja
    kind: box
    position: [0, 0, 0]
    material: metal_dorado_pulido
`)));
    const conCero = compileScene(parseScene(sceneWith(`  - id: caja
    kind: box
    position: [0, 0, 0]
    rotation: [0, 0, 0]
    material: metal_dorado_pulido
`)));
    expect(conCero.wgsl).toBe(sin.wgsl);
  });

  it('rotación 90° en Y produce la matriz inversa correcta (cos≈0, sin≈1)', () => {
    const yaml = sceneWith(`  - id: caja
    kind: box
    position: [0, 0, 0]
    rotation: [0, 90, 0]
    material: metal_dorado_pulido
`);
    const compiled = compileScene(parseScene(yaml));
    // Ry(90°)ᵀ: columnas (0,0,1), (0,1,0), (-1,0,0) — con f(6 decimales)
    expect(compiled.wgsl).toMatch(
      /rotM0 = mat3x3<f32>\(vec3<f32>\(0\.000000, 0\.000000, 1\.000000\), vec3<f32>\(0\.000000, 1\.000000, 0\.000000\), vec3<f32>\(-1\.000000, [-]?0\.000000, 0\.000000\)\);/,
    );
  });
});

describe('compiler — animate rotate y pulse (antes no-op silencioso)', () => {
  it("mode 'rotate' emite giro dependiente de u.time", () => {
    const yaml = sceneWith(`  - id: esfera
    kind: torus
    position: [0, 1, 0]
    material: metal_dorado_pulido
    animate: { mode: rotate, speed: 1.5 }
`);
    const compiled = compileScene(parseScene(yaml));
    expect(compiled.wgsl).toContain('let ang0 = u.time * 1.500000;');
    expect(compiled.wgsl).toContain('cos(ang0)');
    expect(compiled.wgsl).toContain('sin(ang0)');
  });

  it("mode 'pulse' emite escala uniforme con corrección de distancia d·k", () => {
    const yaml = sceneWith(`  - id: esfera
    kind: sphere
    position: [0, 1, 0]
    scale: 0.5
    material: metal_dorado_pulido
    animate: { mode: pulse, speed: 2.0, amplitude: 0.2 }
`);
    const compiled = compileScene(parseScene(yaml));
    expect(compiled.wgsl).toContain('let k0 = 1.0 + 0.200000 * sin(u.time * 2.000000);');
    expect(compiled.wgsl).toContain('/ k0;');
    expect(compiled.wgsl).toContain(') * k0;');
  });

  it("mode 'bob' produce el mismo output de siempre (sin regresión)", () => {
    const yaml = sceneWith(`  - id: esfera
    kind: sphere
    position: [0, 1, 0]
    material: metal_dorado_pulido
    animate: { mode: bob, speed: 2.5, amplitude: 0.3 }
`);
    const compiled = compileScene(parseScene(yaml));
    expect(compiled.wgsl).toMatch(/sin\(u\.time \* 2\.500000\) \* 0\.300000/);
    expect(compiled.wgsl).not.toContain('rotM0');
    expect(compiled.wgsl).not.toContain('k0');
  });
});

describe('compiler — missColor() (ambient.background al shader)', () => {
  it('genera missColor() con el background de la escena', () => {
    const yaml = `${BASE}ambient: { background: [0.1, 0.2, 0.3] }
objects: []
`;
    const compiled = compileScene(parseScene(yaml));
    expect(compiled.wgsl).toContain('fn missColor() -> vec3<f32> {');
    expect(compiled.wgsl).toContain('return vec3<f32>(0.100000, 0.200000, 0.300000);');
    // y el raymarcher la consume en el miss
    expect(compiled.wgsl).toContain('mix(missColor(), u.fogColor, 0.25)');
  });

  it('genera missColor() con el default cuando no se especifica', () => {
    const compiled = compileScene(parseScene(`${BASE}objects: []\n`));
    expect(compiled.wgsl).toContain('fn missColor() -> vec3<f32> {');
  });
});

describe('parser — restricciones de positividad (auditoría)', () => {
  it('rechaza bounds con componente negativa', () => {
    expect(() => parseScene(`${BASE}bounds: [-5, 3, 5]\nobjects: []\n`)).toThrow();
  });

  it('rechaza scale 0 o negativo', () => {
    expect(() =>
      parseScene(sceneWith(`  - id: x
    kind: sphere
    position: [0, 0, 0]
    scale: 0
    material: metal_dorado_pulido
`)),
    ).toThrow();
  });

  it('rechaza light.intensity negativa', () => {
    expect(() => parseScene(`${BASE}light: { intensity: -1 }\nobjects: []\n`)).toThrow();
  });

  it('rechaza colores con canal negativo', () => {
    expect(() =>
      parseScene(`${BASE}ambient: { background: [-0.1, 0, 0] }\nobjects: []\n`),
    ).toThrow();
  });
});
