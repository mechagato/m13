/**
 * tools/export-concepts.ts — emite el espejo JSON del registry de conceptos
 * para consumidores externos (CONTRATO con phi-main, auditoría 2026-06-12).
 *
 * phi-main genera escenas .m13 v0.1 contra su copia de este JSON
 * (~/phi-main/phi_production/phi/m13_concepts.json). Si agregas, renombras o
 * eliminas conceptos sin regenerar el espejo, phi-main emite escenas inválidas.
 *
 * Uso:
 *   pnpm export-concepts                # escribe m13-spec/m13_concepts.json (canónico)
 *   pnpm export-concepts -- --out RUTA  # además escribe una copia en RUTA
 *
 * El drift-guard de CI corre la versión canónica y falla si difiere del commit.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listManifests } from '../packages/synth/src/index.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL = resolve(__dirname, '..', 'm13-spec', 'm13_concepts.json');

// Mismo shape que el espejo de phi-main: categoria simplificada para el LLM
// (material = usable en walls/floor/ceiling/objects[].material; objeto = kind: concept
// con geometría propia) + categoria_motor = la ConceptCategory real.
const payload = {
  _comment:
    'Registry de conceptos m13 v0.1 — generado por `pnpm export-concepts` desde @m13/synth listManifests(). NO editar a mano. categoria: material (walls/floor/ceiling/objects[].material) | objeto (kind: concept, geometría propia). categoria_motor: ConceptCategory real del motor.',
  version: '0.1',
  concepts: listManifests().map((m) => ({
    id: m.id,
    categoria: m.hasGeometricSDF ? 'objeto' : 'material',
    categoria_motor: m.category,
    descripcion: m.description,
    ...(m.hasParams ? { params: m.defaults } : {}),
  })),
};

const serialized = JSON.stringify(payload, null, 2) + '\n';
writeFileSync(CANONICAL, serialized, 'utf8');
console.log(`[export-concepts] ${CANONICAL} · ${payload.concepts.length} conceptos`);

const outFlag = process.argv.indexOf('--out');
if (outFlag !== -1 && process.argv[outFlag + 1]) {
  const extra = resolve(process.argv[outFlag + 1]!);
  writeFileSync(extra, serialized, 'utf8');
  console.log(`[export-concepts] copia → ${extra}`);
}
