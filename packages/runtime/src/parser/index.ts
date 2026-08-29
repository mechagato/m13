import { parse as parseYaml } from 'yaml';
import { normalizeVersion, stripToVisual } from '@m13/spec/strip';
import { m13SceneSchema, type M13Scene } from './schema.js';

/** Última versión visual del formato soportada por este runtime. */
export const SUPPORTED_VERSION = '0.2';
/** Versiones visuales que Zod valida. `0.3` overlay se stripea a `0.2` antes de esto. */
export const SUPPORTED_VERSIONS = ['0.1', '0.2'] as const;

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
  'sky',
  'cameraSpeed',
  'window',
  'objects',
  'events',
]);

export interface ParseOptions {
  /** Si es true, no emite warnings de campos desconocidos. Default false. */
  silent?: boolean;
  /**
   * Modo estricto recursivo (B9, auditoría 06-12): un campo desconocido en
   * CUALQUIER nivel lanza error en lugar de ser stripeado en silencio por Zod.
   * Sin esto, un typo `intencity:` dentro de `light` caía al default sin aviso.
   * Lo usan el editor LLM y validate-scene; el runtime normal queda permisivo.
   */
  strict?: boolean;
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
  let doc: unknown = raw;
  if (isPlainObject(doc)) {
    const version = normalizeVersion(doc.version);
    if (version === '0.3') {
      // Overlay education/game: el renderer solo ve el documento visual.
      doc = stripToVisual(doc);
    } else if (version !== undefined && version !== '0.1' && version !== '0.2') {
      throw new Error(
        `[m13/parser] m13 v${version} no soportado por este runtime (soporta ${SUPPORTED_VERSIONS.join(', ')}, overlay 0.3)`,
      );
    }
  }

  // 1. Validación de versión visual.
  if (isPlainObject(doc) && doc.version === '0.1' && doc.events !== undefined) {
    throw new Error('[m13/parser] events requiere version: "0.2".');
  }

  // 2. Validación Zod estándar.
  // Los documentos v0.1 históricos podían omitir version; normalizarlos antes de usar la unión
  // discriminada conserva ese contrato y deja errores precisos para el resto de los campos.
  const rawForSchema = isPlainObject(doc) && doc.version === undefined ? { ...doc, version: '0.1' } : doc;
  const result = m13SceneSchema.safeParse(rawForSchema);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  · ${i.path.join('.') || '<root>'} — ${i.message}`)
      .join('\n');
    throw new Error(`[m13/parser] Escena .m13 inválida:\n${issues}`);
  }

  // 3. Campos desconocidos: en strict, error recursivo (B9); si no, warning solo raíz.
  if (opts.strict) {
    const unknown = collectUnknownKeys(doc, result.data);
    if (unknown.length > 0) {
      throw new Error(
        `[m13/parser] campos desconocidos (modo strict):\n${unknown.map((u) => `  · ${u}`).join('\n')}`,
      );
    }
  } else if (!opts.silent && isPlainObject(doc)) {
    for (const key of Object.keys(doc)) {
      if (!KNOWN_ROOT_KEYS.has(key)) {
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

/**
 * B9 — compara el documento crudo contra la escena parseada (con defaults):
 * cualquier clave presente en el raw que Zod stripeó (no existe en el output)
 * es un campo desconocido. Recorre objetos y arrays recursivamente.
 * No necesita conocer el schema: el output de Zod ES la verdad de qué se aceptó.
 */
function collectUnknownKeys(raw: unknown, parsed: unknown, path = ''): string[] {
  if (!isPlainObject(raw)) return [];
  const out: string[] = [];
  const parsedObj = isPlainObject(parsed) ? parsed : {};
  for (const key of Object.keys(raw)) {
    const here = path ? `${path}.${key}` : key;
    if (!(key in parsedObj)) {
      out.push(here);
      continue;
    }
    const rv = raw[key];
    const pv = (parsedObj as Record<string, unknown>)[key];
    if (Array.isArray(rv) && Array.isArray(pv)) {
      rv.forEach((item, i) => {
        out.push(...collectUnknownKeys(item, pv[i], `${here}[${i}]`));
      });
    } else if (isPlainObject(rv)) {
      out.push(...collectUnknownKeys(rv, pv, here));
    }
  }
  return out;
}
