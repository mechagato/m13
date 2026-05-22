import { parse as parseYaml } from 'yaml';
import { m13SceneSchema, type M13Scene } from './schema.js';

/**
 * Parsea un texto .m13 (YAML) en una M13Scene válida y tipada.
 * Lanza ZodError si el esquema no se cumple.
 */
export function parseScene(yamlText: string): M13Scene {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (err) {
    throw new Error(
      `[m13/parser] YAML inválido: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return validateScene(raw);
}

/**
 * Valida un objeto contra el schema .m13 y devuelve la escena con defaults aplicados.
 */
export function validateScene(raw: unknown): M13Scene {
  const result = m13SceneSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  · ${i.path.join('.')} — ${i.message}`)
      .join('\n');
    throw new Error(`[m13/parser] Escena .m13 inválida:\n${issues}`);
  }
  return result.data;
}

export { m13SceneSchema };
