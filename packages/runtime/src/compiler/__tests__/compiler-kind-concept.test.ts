import { describe, it, expect, vi } from 'vitest';
import type { Concept } from '@m13/synth';

/**
 * T-021 — Tests del compiler para `kind: 'concept'` (conceptos geométricos).
 *
 * Verifica:
 *   - Schema acepta `kind: concept` + campo `concept`
 *   - Schema rechaza si falta `concept` cuando `kind: concept`
 *   - Schema rechaza si falta `material` cuando `kind: primitivo`
 *   - Compiler genera llamada a `sdf_<id>(...)` para kind:concept
 *   - El WGSL incluye el fragmento `wgslSdf` del concepto
 *   - El material se usa del concept (no requiere campo material en el object)
 *   - Backward compat: objects con kind primitivo siguen funcionando
 */

// ---- Concept fixtures ----
const pedestalConcept: Concept = {
  id: 'pedestal_marmol',
  category: 'object_geo',
  description: 'pedestal de mármol parametrizable (test fixture)',
  // FR-2.2 — fixture: signature/seed dummy, requeridos por la interface Concept
  signature: { baseColor: [0.5, 0.5, 0.5], roughness: 0.5, normalVariation: 0, audioReactivity: 0 },
  seed: 9001,
  wgsl: 'fn mat_pedestal_marmol(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> { return vec3<f32>(0.95, 0.93, 0.88); }',
  wgslSdf:
    'fn sdf_pedestal_marmol(p: vec3<f32>, s: vec3<f32>) -> f32 { let q = abs(p) - s; return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0); }',
};
const plainWall: Concept = {
  id: 'pared_yeso_blanco',
  category: 'wall',
  description: 'plain wall',
  // FR-2.2 — fixture: signature/seed dummy, requeridos por la interface Concept
  signature: { baseColor: [0.5, 0.5, 0.5], roughness: 0.5, normalVariation: 0, audioReactivity: 0 },
  seed: 9002,
  wgsl: 'fn mat_pared_yeso_blanco(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> { return vec3<f32>(0.95); }',
};
const plainFloor: Concept = {
  id: 'piso_madera_envejecida',
  category: 'floor',
  description: 'plain floor',
  // FR-2.2 — fixture: signature/seed dummy, requeridos por la interface Concept
  signature: { baseColor: [0.5, 0.5, 0.5], roughness: 0.5, normalVariation: 0, audioReactivity: 0 },
  seed: 9003,
  wgsl: 'fn mat_piso_madera_envejecida(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> { return vec3<f32>(0.4, 0.25, 0.15); }',
};
const goldMetal: Concept = {
  id: 'metal_dorado_pulido',
  category: 'object',
  description: 'gold',
  // FR-2.2 — fixture: signature/seed dummy, requeridos por la interface Concept
  signature: { baseColor: [0.5, 0.5, 0.5], roughness: 0.5, normalVariation: 0, audioReactivity: 0 },
  seed: 9004,
  wgsl: 'fn mat_metal_dorado_pulido(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32> { return vec3<f32>(1.0, 0.84, 0.0); }',
};

vi.mock('@m13/synth', () => {
  const registry: Record<string, Concept> = {
    pedestal_marmol: pedestalConcept,
    pared_yeso_blanco: plainWall,
    piso_madera_envejecida: plainFloor,
    metal_dorado_pulido: goldMetal,
  };
  return {
    getConcept: (id: string) => registry[id],
    listConcepts: () => Object.values(registry),
  };
});

describe('compiler — kind: concept (T-021)', () => {
  it('parser acepta kind:concept con campo concept válido', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const yaml = `
version: "0.1"
name: con_pedestal
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: pedestal_centro
    kind: concept
    concept: pedestal_marmol
    position: [0, -2.5, 0]
    scale: [0.5, 0.4, 0.5]
`;
    const scene = parseScene(yaml);
    expect(scene.objects[0].kind).toBe('concept');
    expect(scene.objects[0].concept).toBe('pedestal_marmol');
    expect(scene.objects[0].material).toBeUndefined();
  });

  it('parser rechaza kind:concept sin campo concept', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const yaml = `
version: "0.1"
name: sin_concept
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: roto
    kind: concept
    position: [0, 0, 0]
    scale: 0.3
`;
    expect(() => parseScene(yaml)).toThrow(
      /kind: "concept" requiere el campo `concept`/,
    );
  });

  it('parser rechaza kind primitivo sin campo material', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const yaml = `
version: "0.1"
name: sin_material
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: roto
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
`;
    expect(() => parseScene(yaml)).toThrow(/kind: "sphere" requiere el campo `material`/);
  });

  it('compiler genera sdf_<id>(...) para objects con kind:concept', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: pedestal_demo
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: ped
    kind: concept
    concept: pedestal_marmol
    position: [1, -2, 0.5]
    scale: [0.5, 0.4, 0.5]
`;
    const scene = parseScene(yaml);
    const compiled = compileScene(scene);
    // El compiler debe llamar al SDF del concepto, no a una primitiva
    expect(compiled.wgsl).toMatch(/sdf_pedestal_marmol\(/);
    expect(compiled.wgsl).toContain('vec3<f32>(0.500000, 0.400000, 0.500000)');
  });

  it('compiler incluye el fragmento wgslSdf del concept en el output', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: con_sdf
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: p
    kind: concept
    concept: pedestal_marmol
    position: [0, -2, 0]
    scale: 0.5
`;
    const compiled = compileScene(parseScene(yaml));
    // El fragmento wgslSdf del fixture aparece en el output
    expect(compiled.wgsl).toContain('fn sdf_pedestal_marmol(p: vec3<f32>, s: vec3<f32>) -> f32');
    // Y la sección está identificada
    expect(compiled.wgsl).toContain('SDFs de conceptos geométricos');
  });

  it('compiler usa material del concept (mat_<id>) sin necesidad del campo material', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: concept_mat
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: p
    kind: concept
    concept: pedestal_marmol
    position: [0, -2, 0]
    scale: 0.5
`;
    const compiled = compileScene(parseScene(yaml));
    // El material del concept geo se inyecta normalmente
    expect(compiled.wgsl).toContain('fn mat_pedestal_marmol(');
    // Y la function material() referencia mat_pedestal_marmol para la región del object
    expect(compiled.wgsl).toMatch(/return mat_pedestal_marmol\(p, n, u\.audioAmp\);/);
  });

  it('conceptsUsed incluye el id del concepto geométrico', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: mix
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: p
    kind: concept
    concept: pedestal_marmol
    position: [0, -2, 0]
    scale: 0.5
  - id: g
    kind: sphere
    position: [0, 0, 0]
    scale: 0.3
    material: metal_dorado_pulido
`;
    const compiled = compileScene(parseScene(yaml));
    expect(compiled.conceptsUsed).toContain('pedestal_marmol');
    expect(compiled.conceptsUsed).toContain('metal_dorado_pulido');
    expect(compiled.conceptsUsed).toContain('pared_yeso_blanco');
    expect(compiled.conceptsUsed).toContain('piso_madera_envejecida');
  });

  it('puede mezclar kind:concept con primitivos en la misma escena', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: mixto
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: ped
    kind: concept
    concept: pedestal_marmol
    position: [-1, -2.5, 0]
    scale: [0.4, 0.4, 0.4]
  - id: esfera
    kind: sphere
    position: [1, 0, 0]
    scale: 0.3
    material: metal_dorado_pulido
`;
    const compiled = compileScene(parseScene(yaml));
    expect(compiled.wgsl).toMatch(/sdf_pedestal_marmol\(/);
    expect(compiled.wgsl).toMatch(/sdSphere\(/);
    expect(compiled.wgsl).toContain('let obj0 = sdf_pedestal_marmol(');
    expect(compiled.wgsl).toContain('let obj1 = sdSphere(');
  });

  it('animate y audio_reactive también aplican a kind:concept (a través de localP)', async () => {
    const { parseScene } = await import('../../parser/index.js');
    const { compileScene } = await import('../index.js');
    const yaml = `
version: "0.1"
name: ped_animado
walls: { concept: pared_yeso_blanco }
floor: { concept: piso_madera_envejecida }
ceiling: { concept: pared_yeso_blanco }
objects:
  - id: ped
    kind: concept
    concept: pedestal_marmol
    position: [0, -2.5, 0]
    scale: 0.5
    audio_reactive: true
    animate:
      mode: bob
      speed: 1.5
      amplitude: 0.1
`;
    const compiled = compileScene(parseScene(yaml));
    // La animación se aplica vía localP, igual que para primitivos
    expect(compiled.wgsl).toMatch(/sin\(u\.time \* 1\.500000\) \* 0\.100000/);
    expect(compiled.wgsl).toContain('u.audioAmp');
  });
});
