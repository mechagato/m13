/**
 * T-211 — Guardia del uniform layout (regla D-108).
 *
 * WebGPU corrompe memoria EN SILENCIO si el struct WGSL y el buffer TS divergen.
 * Este test parsea `struct Uniforms` del WGSL real, calcula su tamaño según las
 * reglas de layout de WGSL (std140-like), y lo compara contra UNIFORM_BYTES.
 * Si editas uno sin el otro, esto truena en CI antes de corromper nada.
 */
import { describe, it, expect } from 'vitest';
import { COMMON_WGSL } from '../shaders/common.js';
import { UNIFORM_BYTES } from '../renderer/index.js';

// size/align por tipo WGSL (los que usa el struct)
const TYPES: Record<string, { size: number; align: number }> = {
  'f32': { size: 4, align: 4 },
  'vec2<f32>': { size: 8, align: 8 },
  'vec3<f32>': { size: 12, align: 16 },
  'vec4<f32>': { size: 16, align: 16 },
};

function wgslStructSize(wgsl: string, structName: string): number {
  const m = wgsl.match(new RegExp(`struct ${structName} \\{([\\s\\S]*?)\\};`));
  if (!m) throw new Error(`struct ${structName} no encontrado en el WGSL`);
  const fields = m[1]!
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, '').trim())
    .filter((l) => l.includes(':'))
    .map((l) => l.replace(/,$/, '').split(':')[1]!.trim());

  let offset = 0;
  let maxAlign = 0;
  for (const type of fields) {
    const t = TYPES[type];
    if (!t) throw new Error(`tipo WGSL no mapeado en el test: ${type}`);
    offset = Math.ceil(offset / t.align) * t.align; // alinear el campo
    offset += t.size;
    maxAlign = Math.max(maxAlign, t.align);
  }
  // el struct completo se redondea a su alineación mayor
  return Math.ceil(offset / maxAlign) * maxAlign;
}

describe('uniform layout (D-108 guard)', () => {
  it('el tamaño del struct Uniforms en WGSL coincide con UNIFORM_BYTES', () => {
    expect(wgslStructSize(COMMON_WGSL, 'Uniforms')).toBe(UNIFORM_BYTES);
  });

  it('layout v3 mide exactamente 256 bytes (192 v2 + xr + 48 reservados, D-5001)', () => {
    expect(UNIFORM_BYTES).toBe(256);
  });
});
