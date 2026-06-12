/**
 * B10 (auditoría 2026-06-12) — colisiones de nombres de funciones WGSL.
 *
 * El compilador concatena COMMON_WGSL + RAYMARCH_WGSL + el WGSL de cada
 * concepto sin verificar colisiones: dos `fn` con el mismo nombre rompen
 * `createShaderModule` con un error críptico en runtime. Este test lo hace
 * imposible: cualquier helper privado repetido entre dos conceptos (o contra
 * common/raymarch) truena aquí, en CI, con el dueño de cada nombre.
 */
import { describe, it, expect } from 'vitest';
import { COMMON_WGSL } from '../shaders/common.js';
import { RAYMARCH_WGSL } from '../shaders/raymarch.js';
import { listConcepts } from '@m13/synth';

describe('WGSL — cero colisiones de nombres de funciones (B10)', () => {
  it('ningún fn se declara dos veces entre common, raymarch y los conceptos', () => {
    const owners = new Map<string, string>();
    const sources: Array<readonly [string, string]> = [
      ['common', COMMON_WGSL],
      ['raymarch', RAYMARCH_WGSL],
      ...listConcepts().map((c) => [c.id, c.wgsl + (c.wgslSdf ?? '')] as const),
    ];
    for (const [owner, src] of sources) {
      for (const m of src.matchAll(/\bfn\s+(\w+)/g)) {
        const name = m[1]!;
        expect(
          owners.has(name),
          `fn "${name}" declarada en "${owner}" Y en "${owners.get(name)}"`,
        ).toBe(false);
        owners.set(name, owner);
      }
    }
    // sanity: el scan realmente encontró funciones
    expect(owners.size).toBeGreaterThan(20);
  });
});
