/**
 * Lógica de negocio de los 5 tools MCP de m13 — funciones puras, sin transporte.
 *
 * Separadas del server para que los tests (y cualquier consumidor programático)
 * las importen sin levantar el protocolo MCP. Todo corre en Node puro:
 * cero GPU, cero DOM, cero red — el render siempre es local del cliente (D-025-06).
 *
 * Constitution §3: esto es editor-time. El LLM usa estos tools para AUTORAR
 * escenas .m13; el runtime que las renderiza jamás llama a un LLM.
 */

import {
  generateScene,
  generateFromPrompt,
  STYLES,
  type StyleId,
  type GenResult,
} from '@m13/generator';
import { parseScene, compileScene } from '@m13/runtime';
import { listConcepts } from '@m13/synth';

/** Demo público donde el share link abre el mundo 3D caminable. */
export const SHARE_BASE_URL = 'https://motor13.neonodos.com/';

/** Ids de estilo válidos del generador paramétrico (derivados de STYLES, no drift). */
export const STYLE_IDS = STYLES.map((s) => s.id) as [StyleId, ...StyleId[]];

const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

/**
 * La URL ES la escena: base64url del YAML en el hash, cero backend.
 * Mismo esquema que el botón "compartir" del demo (packages/examples/src/main.ts).
 */
export function buildShareUrl(yaml: string): string {
  return `${SHARE_BASE_URL}#scene=${Buffer.from(yaml, 'utf8').toString('base64url')}`;
}

// ============================================================
// generate_m13_scene
// ============================================================

export interface GenerateSceneInput {
  /** Estilo del generador paramétrico. Si viene, gana sobre `prompt`. */
  style?: StyleId;
  /** Descripción libre del espacio — se mapea por keywords a un estilo. */
  prompt?: string;
  /** Seed reproducible (solo aplica con `style`). */
  seed?: number;
}

export interface GenerateSceneOutput {
  label: string;
  seed: number;
  bytes: number;
  share_url: string;
  yaml: string;
}

export function runGenerateScene(input: GenerateSceneInput): GenerateSceneOutput {
  const { style, prompt, seed } = input;
  if (style === undefined && prompt === undefined) {
    throw new Error(
      `Pasa \`style\` (uno de: ${STYLE_IDS.join(', ')}) o \`prompt\` (descripción libre del espacio).`,
    );
  }

  const result: GenResult =
    style !== undefined ? generateScene(style, seed) : generateFromPrompt(prompt!);

  // Validación de dos niveles antes de entregar: schema (parse) + conceptos/WGSL (compile).
  const scene = parseScene(result.yaml, { silent: true });
  compileScene(scene);

  return {
    label: result.label,
    seed: result.seed,
    bytes: utf8Bytes(result.yaml),
    share_url: buildShareUrl(result.yaml),
    yaml: result.yaml,
  };
}

// ============================================================
// validate_m13_scene
// ============================================================

export interface ValidateSceneStats {
  name: string;
  version: string;
  objects: number;
  /** Conceptos materiales/geométricos referenciados, orden lexicográfico. */
  concepts_used: string[];
  bytes: number;
}

export type ValidateSceneOutput =
  | { ok: true; stats: ValidateSceneStats }
  | { ok: false; error: string };

export function runValidateScene(yaml: string): ValidateSceneOutput {
  try {
    const scene = parseScene(yaml, { silent: true });
    const compiled = compileScene(scene);
    return {
      ok: true,
      stats: {
        name: scene.name,
        version: scene.version,
        objects: scene.objects.length,
        concepts_used: compiled.conceptsUsed,
        bytes: utf8Bytes(yaml),
      },
    };
  } catch (err) {
    // El mensaje exacto del parser/compiler — el LLM lo usa para corregir su YAML.
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// share_m13_scene
// ============================================================

export interface ShareSceneOutput {
  share_url: string;
  bytes: number;
}

export function runShareScene(yaml: string): ShareSceneOutput {
  const validation = runValidateScene(yaml);
  if (!validation.ok) {
    throw new Error(`Escena inválida — corrígela antes de compartir:\n${validation.error}`);
  }
  return { share_url: buildShareUrl(yaml), bytes: utf8Bytes(yaml) };
}

// ============================================================
// list_m13_concepts
// ============================================================

export interface ConceptSummary {
  id: string;
  category: string;
  description: string;
  hasParams: boolean;
  /** Defaults de params editables (solo si hasParams). */
  defaults?: Record<string, unknown>;
}

/** Lista viva desde el registry de @m13/synth — nunca driftea del código real. */
export function runListConcepts(): ConceptSummary[] {
  return listConcepts().map((c) => {
    const m = c.manifest?.();
    return {
      id: c.id,
      category: c.category,
      description: c.description,
      hasParams: m?.hasParams ?? c.paramsSchema !== undefined,
      ...(c.defaults !== undefined ? { defaults: c.defaults } : {}),
    };
  });
}
