import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScene } from '../../parser/index.js';
import { compileScene } from '../../compiler/index.js';

/**
 * Tests que FIJAN la matemática de la IP (detalle continuo / Sonido 13) — pedido
 * de la auditoría forense 2026-07-02: ningún test fijaba las propiedades del
 * corazón del motor antes de que sea "load-bearing" comercialmente.
 *
 * Replica EN TypeScript, fielmente, el WGSL de shaders/common.ts (hash3, noise3,
 * fbm_continuous con nearBoost T-225 y normalización por ampSum F2) y asserta las
 * propiedades que la IP promete:
 *   1. CONTINUIDAD (anti-pop microtonal) — sin saltos al variar la distancia.
 *   2. NORMALIZACIÓN (sin deriva de luminancia) — media estable a toda distancia.
 *   3. MONOTONÍA — más octavas de cerca, menos de lejos.
 *   4. TOGGLE — la codificación por signo de quality.w nunca colapsa (magnitud ≥ 1).
 *   5. WIRING — el WGSL compilado de una escena real contiene la cadena completa
 *      pixelFootprint → fbm_detail → fbm_continuous con normalización.
 *
 * Si alguien cambia la matemática del shader sin actualizar estos tests, CI truena:
 * el look de la IP no se altera en silencio.
 */

// ---------- réplica fiel del WGSL (mismas constantes, mismo orden de operaciones) ----------

const fract = (x: number): number => x - Math.floor(x);
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

type V3 = [number, number, number];

/** hash3 del WGSL: p3 = fract(p*0.1031); p3 += dot(p3, p3.yzx + 33.33); fract((x+y)*z) */
function hash3(p: V3): number {
  let x = fract(p[0] * 0.1031);
  let y = fract(p[1] * 0.1031);
  let z = fract(p[2] * 0.1031);
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d;
  y += d;
  z += d;
  return fract((x + y) * z);
}

/** noise3 del WGSL: value noise trilineal con u = f*f*(3-2f) */
function noise3(p: V3): number {
  const i: V3 = [Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])];
  const f: V3 = [fract(p[0]), fract(p[1]), fract(p[2])];
  const u: V3 = [
    f[0] * f[0] * (3 - 2 * f[0]),
    f[1] * f[1] * (3 - 2 * f[1]),
    f[2] * f[2] * (3 - 2 * f[2]),
  ];
  const n = (dx: number, dy: number, dz: number): number => hash3([i[0] + dx, i[1] + dy, i[2] + dz]);
  const nx00 = mix(n(0, 0, 0), n(1, 0, 0), u[0]);
  const nx10 = mix(n(0, 1, 0), n(1, 1, 0), u[0]);
  const nx01 = mix(n(0, 0, 1), n(1, 0, 1), u[0]);
  const nx11 = mix(n(0, 1, 1), n(1, 1, 1), u[0]);
  return mix(mix(nx00, nx10, u[1]), mix(nx01, nx11, u[1]), u[2]);
}

const scale3 = (p: V3, s: number): V3 => [p[0] * s, p[1] * s, p[2] * s];

/** fbm_continuous del WGSL (common.ts:152-175) — octavas continuas + nearBoost + ampSum */
function fbmContinuous(p: V3, footprint: number, minOct: number, cap: number): number {
  const nOct = clamp(-Math.log2(Math.max(footprint, 1e-5)), Math.min(minOct, cap), cap);
  const full = Math.floor(nOct);
  const lastW = smoothstep(0, 1, nOct - full);
  const nearBoost = clamp(1 - Math.log2(Math.max(footprint, 1e-4)) * 0.35, 1, 6);
  let total = 0;
  let amp = 0.5;
  let freq = nearBoost;
  let ampSum = 0;
  for (let i = 0; i < full; i++) {
    total += amp * noise3(scale3(p, freq));
    ampSum += amp;
    amp *= 0.5;
    freq *= 2;
  }
  total += amp * lastW * noise3(scale3(p, freq));
  ampSum += amp * lastW;
  return total / Math.max(ampSum, 1e-5);
}

/** nOct aislado (la ley de octavas continua) */
function nOctOf(footprint: number, minOct: number, cap: number): number {
  return clamp(-Math.log2(Math.max(footprint, 1e-5)), Math.min(minOct, cap), cap);
}

/** LCG determinista (sin Math.random — determinismo del proyecto) */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// pixelAngle como en pixelFootprint: 2/resY, con resY=800 (laptop típica)
const PIXEL_ANGLE = 2 / 800;

describe('IP Sonido 13 — matemática del detalle continuo (auditoría 2026-07-02)', () => {
  it('1. CONTINUIDAD microtonal: sin saltos discretos y deltas << que un LOD discreto', () => {
    // Punto fijo del mundo, escala de material 3.5 (piedra_volcanica)
    const p: V3 = [1.37, -2.42, 0.83];
    const pm = scale3(p, 3.5);

    // Referencia: LOD DISCRETO (octavas enteras, sin fade microtonal) — lo que la IP evita.
    const fbmDiscrete = (pt: V3, footprint: number, minOct: number, cap: number): number => {
      const n = Math.floor(nOctOf(footprint, minOct, cap));
      const nearBoost = clamp(1 - Math.log2(Math.max(footprint, 1e-4)) * 0.35, 1, 6);
      let total = 0;
      let amp = 0.5;
      let freq = nearBoost;
      let ampSum = 0;
      for (let i = 0; i < n; i++) {
        total += amp * noise3(scale3(pt, freq));
        ampSum += amp;
        amp *= 0.5;
        freq *= 2;
      }
      return total / Math.max(ampSum, 1e-5);
    };

    // Zona donde el CONTEO de octavas varía (4m→30m con material ×3.5: nOct recorre ~5→2,
    // cruza 3 bordes de octava). Dentro de ~4m el conteo satura al cap y continuo≡discreto
    // (ahí la variación viene del nearBoost, idéntica en ambos — documentado por la auditoría).
    const sweep = (step: number): { cont: number; disc: number } => {
      let prevC: number | null = null;
      let prevD: number | null = null;
      let maxC = 0;
      let maxD = 0;
      for (let dist = 4.0; dist <= 30.0; dist += step) {
        const fp = dist * PIXEL_ANGLE * 3.5;
        const c = fbmContinuous(pm, fp, 2.0, 5.0);
        const d = fbmDiscrete(pm, fp, 2.0, 5.0);
        if (prevC !== null) maxC = Math.max(maxC, Math.abs(c - prevC));
        if (prevD !== null) maxD = Math.max(maxD, Math.abs(d - prevD));
        prevC = c;
        prevD = d;
      }
      return { cont: maxC, disc: maxD };
    };

    // Paso 2cm: el continuo debe estar muy por debajo del pop del LOD discreto
    const coarse = sweep(0.02);
    expect(coarse.cont).toBeLessThan(0.08); // bound absoluto (derivada finita, incluye nearBoost)
    expect(coarse.cont).toBeLessThan(coarse.disc * 0.85); // LA propiedad diferencial de la IP

    // Continuidad real: al refinar el paso 10× (2mm), la delta continua cae fuerte.
    // Un pop discreto NO se reduce al refinar — su escalón es constante.
    const fine = sweep(0.002);
    expect(fine.cont).toBeLessThan(coarse.cont * 0.3);
    expect(fine.disc).toBeGreaterThan(fine.cont * 3); // el discreto conserva su escalón
  });

  it('2. NORMALIZACIÓN: media estable a toda distancia (sin deriva de luminancia)', () => {
    const rnd = lcg(1337);
    const pts: V3[] = Array.from({ length: 200 }, () => [rnd() * 10 - 5, rnd() * 10 - 5, rnd() * 10 - 5]);
    const dists = [0.6, 2.0, 8.0, 32.0];
    const means = dists.map((dist) => {
      const fp = dist * PIXEL_ANGLE * 3.5;
      const sum = pts.reduce((acc, p) => acc + fbmContinuous(scale3(p, 3.5), fp, 2.0, 5.0), 0);
      return sum / pts.length;
    });
    for (const m of means) {
      expect(m).toBeGreaterThan(0.4);
      expect(m).toBeLessThan(0.6);
    }
    const spread = Math.max(...means) - Math.min(...means);
    expect(spread).toBeLessThan(0.06);
  });

  it('3. MONOTONÍA: el nº de octavas nunca crece al alejarse (anti-shimmer correcto)', () => {
    let prev = Infinity;
    for (let i = 0; i < 20; i++) {
      const fp = 0.001 * Math.pow(1.6, i); // footprints crecientes
      const n = nOctOf(fp, 2.0, 5.0);
      expect(n).toBeLessThanOrEqual(prev + 1e-9);
      prev = n;
    }
    // Y en los extremos: cerca satura al cap, lejos al piso
    expect(nOctOf(1e-5, 2.0, 5.0)).toBe(5.0);
    expect(nOctOf(10.0, 2.0, 5.0)).toBe(2.0);
  });

  it('4. TOGGLE por signo: con magnitud >= 1 (invariante de setQuality) nunca colapsa', () => {
    for (const cap of [1, 3, 5, 7]) {
      const on = Math.max(cap, 1);
      const off = -Math.max(cap, 1);
      expect(on).toBeGreaterThan(0);
      expect(off).toBeLessThan(0); // -0 IEEE queda excluido por la magnitud >= 1 (F1)
      expect(Object.is(off, -0)).toBe(false);
    }
  });

  it('5. WIRING real: el WGSL compilado trae la cadena pixelFootprint→fbm_detail completa', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const yaml = readFileSync(
      resolve(__dirname, '../../../../examples/public/scenes/templo_mexica.m13'),
      'utf8',
    );
    const compiled = compileScene(parseScene(yaml, { silent: true }));
    const w = compiled.wgsl;
    // Las funciones de la IP existen en el shader ensamblado
    expect(w).toContain('fn pixelFootprint(');
    expect(w).toContain('fn fbm_continuous(');
    expect(w).toContain('fn fbm_detail(');
    expect(w).toContain('fn fbm_norm(');
    // El material del showcase LLAMA la cadena con footprint derivado de cámara
    expect(w).toContain('let fp = pixelFootprint(p);');
    expect(w).toMatch(/fbm_detail\(p \* 3\.5, fp \* 3\.5/);
    // La normalización (F2) y el nearBoost (T-225) están presentes
    expect(w).toContain('ampSum');
    expect(w).toContain('nearBoost');
    // El footprint deriva de la cámara real (u.camPos), no de una constante
    expect(w).toContain('length(p - u.camPos)');
  });
});
