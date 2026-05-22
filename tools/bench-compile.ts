/**
 * tools/bench-compile.ts — micro-benchmark del pipeline `parseScene + compileScene`.
 *
 * Genera una escena sintética de N objetos con material aleatorio, la serializa
 * a YAML, y mide el tiempo de parse+compile en M corridas. Reporta min / median /
 * p95 / max / media en milisegundos.
 *
 * Uso:
 *   pnpm bench:compile                # default N=50 objetos, M=20 corridas
 *   pnpm bench:compile -- --objects 100 --runs 50
 *
 * Objetivo del spec/plan: p95 < 200ms para 50 objetos en laptop mid-range
 * (Cerebro4 satisface "mid-range"). Si excede, escalar a Gato.
 */

import { parseScene } from '../packages/runtime/src/parser/index.ts';
import { compileScene } from '../packages/runtime/src/compiler/index.ts';
import { listConcepts } from '../packages/synth/src/index.ts';

// YAML 1.2 es un superset estricto de JSON — el output de JSON.stringify es
// YAML válido, así que evitamos depender del paquete `yaml` al nivel root.

interface Args {
  objects: number;
  runs: number;
  warmup: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { objects: 50, runs: 20, warmup: 5 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--objects' && v) args.objects = parseInt(v, 10);
    if (k === '--runs' && v) args.runs = parseInt(v, 10);
    if (k === '--warmup' && v) args.warmup = parseInt(v, 10);
  }
  return args;
}

/** PRNG sembrado simple (mulberry32) para reproducibilidad. */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS = ['sphere', 'box', 'round_box', 'cylinder', 'torus'] as const;

function buildSyntheticScene(n: number, rng: () => number): unknown {
  // Pool de conceptos disponibles, filtramos por categorías razonables para objects.
  const objectConcepts = listConcepts()
    .filter((c) => c.category === 'object' || c.category === 'universal')
    .map((c) => c.id);
  if (objectConcepts.length === 0) throw new Error('No object concepts registered');

  const objects = Array.from({ length: n }, (_, i) => {
    const kind = KINDS[Math.floor(rng() * KINDS.length)]!;
    // Posiciones dentro del cuarto (-4..4, -2..2, -4..4)
    const px = (rng() - 0.5) * 8;
    const py = (rng() - 0.5) * 4;
    const pz = (rng() - 0.5) * 8;
    // Escala random (mantener valores razonables)
    const scale = 0.1 + rng() * 0.5;
    const material = objectConcepts[Math.floor(rng() * objectConcepts.length)]!;
    return {
      id: `obj_${i}`,
      kind,
      position: [px, py, pz],
      scale: kind === 'sphere' ? scale : [scale, scale, scale],
      material,
      audio_reactive: rng() < 0.2,
      ...(rng() < 0.3
        ? { animate: { mode: 'bob', speed: 0.5 + rng() * 3, amplitude: 0.05 + rng() * 0.2 } }
        : {}),
    };
  });

  return {
    version: '0.1',
    name: `synthetic_${n}_objects`,
    description: `Escena sintética generada por bench-compile (${n} objetos)`,
    bounds: [5, 3, 5],
    spawn: [0, 0, -3.5],
    walls: { concept: 'pared_ladrillo_viejo' },
    floor: { concept: 'piso_madera_envejecida' },
    ceiling: { concept: 'pared_yeso_blanco' },
    objects,
  };
}

function percentile(sortedAsc: number[], p: number): number {
  const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * p));
  return sortedAsc[idx]!;
}

function stats(samples: number[]): {
  min: number;
  median: number;
  mean: number;
  p95: number;
  max: number;
} {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0]!,
    median: percentile(sorted, 0.5),
    mean: sum / sorted.length,
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1]!,
  };
}

function fmt(ms: number): string {
  return `${ms.toFixed(2)} ms`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const rng = makeRng(42);

  // Build scene once, serialize once. La medición es de parseScene+compileScene,
  // no de construcción ni serialización (no son operaciones runtime).
  const sceneObj = buildSyntheticScene(args.objects, rng);
  // JSON.stringify produce YAML válido (YAML 1.2 superset de JSON).
  const yamlText = JSON.stringify(sceneObj, null, 2);
  const sizeKb = (Buffer.byteLength(yamlText, 'utf8') / 1024).toFixed(2);

  // eslint-disable-next-line no-console
  console.log(`m13 bench-compile`);
  console.log(`  objetos: ${args.objects}`);
  console.log(`  YAML:    ${sizeKb} KB`);
  console.log(`  warmup:  ${args.warmup} corridas`);
  console.log(`  measure: ${args.runs} corridas`);
  console.log();

  // Warmup — calienta JIT, descarta resultados.
  for (let i = 0; i < args.warmup; i++) {
    const scene = parseScene(yamlText, { silent: true });
    compileScene(scene);
  }

  // Mediciones reales.
  const samples: number[] = [];
  for (let i = 0; i < args.runs; i++) {
    const t0 = performance.now();
    const scene = parseScene(yamlText, { silent: true });
    compileScene(scene);
    samples.push(performance.now() - t0);
  }

  const s = stats(samples);
  console.log(`Resultados (parseScene + compileScene):`);
  console.log(`  min    ${fmt(s.min)}`);
  console.log(`  median ${fmt(s.median)}`);
  console.log(`  mean   ${fmt(s.mean)}`);
  console.log(`  p95    ${fmt(s.p95)}`);
  console.log(`  max    ${fmt(s.max)}`);
  console.log();

  const BUDGET_MS = 200;
  const ok = s.p95 < BUDGET_MS;
  console.log(`Budget spec H1.3: p95 < ${BUDGET_MS} ms`);
  console.log(`Status: ${ok ? '✅ DENTRO DEL BUDGET' : '❌ EXCEDE BUDGET'}`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
