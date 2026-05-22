/**
 * tools/gen-json-schema.ts — genera m13-spec/v0.1.schema.json desde el Zod schema.
 *
 * Uso: `pnpm gen:schema`
 *
 * El archivo output es la representación JSON Schema (draft-07) de
 * `m13SceneSchema` definido en packages/runtime/src/parser/schema.ts.
 *
 * Es la fuente de validación externa para herramientas que no usan @m13/runtime,
 * como linters externos o el editor LLM (que pasa el schema como contexto).
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { m13SceneSchema } from '../packages/runtime/src/parser/schema.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'm13-spec', 'v0.1.schema.json');

function main(): void {
  const jsonSchema = zodToJsonSchema(m13SceneSchema, {
    name: 'M13Scene',
    target: 'jsonSchema7',
    $refStrategy: 'root',
  });

  const serialized = JSON.stringify(jsonSchema, null, 2) + '\n';
  writeFileSync(OUTPUT_PATH, serialized, 'utf8');

  const sizeKb = (serialized.length / 1024).toFixed(2);
  // eslint-disable-next-line no-console
  console.log(`[gen-schema] wrote ${OUTPUT_PATH} (${sizeKb} KB)`);
}

main();
