import { parse as parseYaml } from 'yaml';
import { m13SceneSchema, type M13Scene } from './schema.js';

/** Versión del formato soportada por este runtime. */
export const SUPPORTED_VERSION = '0.1';

/** Keys reconocidas en el nivel raíz de un documento .m13. */
const KNOWN_ROOT_KEYS = new Set([
  'version',
  'name',
  'description',
  'bounds',
  'spawn',
  'ambient',
  'light',
  'walls',
  'floor',
  'ceiling',
  'window',
  'objects',
]);

export interface ParseOptions {
  /** Si es true, no emite warnings de campos desconocidos. Default false. */
  silent?: boolean;
}

/**
 * Parsea un texto .m13 (YAML) en una M13Scene válida y tipada.
 * Lanza Error si el YAML es inválido, la versión no es soportada,
 * o el schema Zod no se cumple.
 */
export function parseScene(yamlText: string, opts: ParseOptions = {}): M13Scene {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (err) {
    throw new Error(
      `[m13/parser] YAML inválido: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return validateScene(raw, opts);
}

/**
 * Valida un objeto contra el schema .m13 y devuelve la escena con defaults aplicados.
 */
export function validateScene(raw: unknown, opts: ParseOptions = {}): M13Scene {
  // 1. Validación de versión antes del schema general: error explícito si no es 0.1.
  if (isPlainObject(raw) && typeof raw.version === 'string' && raw.version !== SUPPORTED_VERSION) {
    throw new Error(
      `[m13/parser] m13 v${raw.version} no soportado por este runtime (se esperaba v${SUPPORTED_VERSION})`,
    );
  }

  // 2. Validación Zod estándar.
  const result = m13SceneSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  · ${i.path.join('.') || '<root>'} — ${i.message}`)
      .join('\n');
    throw new Error(`[m13/parser] Escena .m13 inválida:\n${issues}`);
  }

  // 3. Warning para campos desconocidos en el nivel raíz (política de extensión).
  if (!opts.silent && isPlainObject(raw)) {
    for (const key of Object.keys(raw)) {
      if (!KNOWN_ROOT_KEYS.has(key)) {
        // eslint-disable-next-line no-console
        console.warn(`[m13/parser] campo desconocido: ${key}`);
      }
    }
  }

  return result.data;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export { m13SceneSchema };
