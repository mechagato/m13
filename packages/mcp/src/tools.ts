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
  composeTemporalScene,
  STYLES,
  type StyleId,
  type GenResult,
} from '@m13/generator';
import { parseScene, compileScene } from '@m13/runtime';
import { listConcepts } from '@m13/synth';
import {
  type DataClass,
  type ShareVisibility,
  type PrivateShareDescriptor,
  buildPrivateShareDescriptor,
  resolveShareVisibility,
  sha256Hex,
} from './security.js';
import { getTemplate, listTemplates, type TemplateId } from './templates.js';
import { cardPrivateShare, cardTemplate, cardWorldReady, type UiCard } from './cards.js';

/** Demo público donde el share link abre el mundo 3D caminable. */
export const SHARE_BASE_URL = 'https://m13.phi-core.com/';

export type { DataClass, ShareVisibility, PrivateShareDescriptor, UiCard, TemplateId };

/** Ids de estilo válidos del generador paramétrico (derivados de STYLES, no drift). */
export const STYLE_IDS = STYLES.map((s) => s.id) as [StyleId, ...StyleId[]];

const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

/**
 * La URL ES la escena: base64url del YAML en el hash, cero backend.
 * Mismo esquema que el botón "compartir" del demo (packages/examples/src/main.ts).
 */
// B14: límite práctico — los browsers truncan URLs gigantes (Chrome ~32K es
// seguro; 16K de YAML → ~21K de URL deja margen). Las escenas reales pesan 2-12KB.
const SHARE_MAX_YAML_BYTES = 16 * 1024;

export function buildShareUrl(yaml: string): string {
  const bytes = Buffer.byteLength(yaml, 'utf8');
  if (bytes > SHARE_MAX_YAML_BYTES) {
    throw new Error(
      `[m13/mcp] escena demasiado grande para share URL: ${bytes} bytes (límite ${SHARE_MAX_YAML_BYTES}). ` +
        'Reduce objetos o usa un archivo .m13.',
    );
  }
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
  /** Embedded UI hint for ChatGPT Apps / agentic hosts */
  ui_card: UiCard;
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

  const bytes = utf8Bytes(result.yaml);
  const share_url = buildShareUrl(result.yaml);
  return {
    label: result.label,
    seed: result.seed,
    bytes,
    share_url,
    yaml: result.yaml,
    ui_card: cardWorldReady({ label: result.label, bytes, share_url, classification: 'S0' }),
  };
}

/** Autoría temporal P2: texto a YAML v0.2, validado antes de devolverlo. */
export function runComposeTemporalScene(prompt: string): GenerateSceneOutput {
  if (!prompt.trim()) throw new Error('Pasa un prompt temporal no vacío.');
  const result = composeTemporalScene(prompt);
  const scene = parseScene(result.yaml, { silent: true });
  compileScene(scene);
  const bytes = utf8Bytes(result.yaml);
  const share_url = buildShareUrl(result.yaml);
  return {
    label: result.label,
    seed: result.seed,
    bytes,
    share_url,
    yaml: result.yaml,
    ui_card: cardWorldReady({ label: result.label, bytes, share_url, classification: 'S0' }),
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
// share_m13_scene (public | private_local)
// ============================================================

export interface ShareSceneInput {
  yaml: string;
  /** S0–S3. S2/S3 force private_local (no cleartext #scene=). */
  classification?: DataClass;
  /** Requested visibility; ignored when classification forbids public hash share. */
  visibility?: ShareVisibility;
}

export type ShareSceneOutput =
  | {
      mode: 'public';
      share_url: string;
      bytes: number;
      scene_hash: string;
      classification: DataClass;
      ui_card: UiCard;
    }
  | (PrivateShareDescriptor & { ui_card: UiCard });

export function runShareScene(yamlOrInput: string | ShareSceneInput): ShareSceneOutput {
  const input: ShareSceneInput =
    typeof yamlOrInput === 'string' ? { yaml: yamlOrInput } : yamlOrInput;
  const classification: DataClass = input.classification ?? 'S0';
  const visibility = resolveShareVisibility(classification, input.visibility ?? 'public');

  const validation = runValidateScene(input.yaml);
  if (!validation.ok) {
    throw new Error(`Escena inválida — corrígela antes de compartir:\n${validation.error}`);
  }

  if (visibility === 'private_local') {
    const priv = buildPrivateShareDescriptor(input.yaml, classification);
    return {
      ...priv,
      ui_card: cardPrivateShare({
        scene_hash: priv.scene_hash,
        classification,
      }),
    };
  }

  const share_url = buildShareUrl(input.yaml);
  const bytes = utf8Bytes(input.yaml);
  const scene_hash = sha256Hex(input.yaml);
  const label = validation.ok ? validation.stats.name : 'scene';
  return {
    mode: 'public',
    share_url,
    bytes,
    scene_hash,
    classification,
    ui_card: cardWorldReady({ label, bytes, share_url, classification }),
  };
}

// ============================================================
// templates (EHS / spatial)
// ============================================================

export function runListTemplates() {
  return listTemplates().map((t) => ({
    ...t,
    ui_card: cardTemplate({
      title: t.title,
      description: t.description,
      checklist: t.checklist,
      classification: t.default_classification,
    }),
  }));
}

export interface CreateFromTemplateOutput {
  template_id: TemplateId;
  label: string;
  bytes: number;
  yaml: string;
  checklist: string[];
  classification: DataClass;
  /** Public share only if classification allows; EHS default is private */
  share: ShareSceneOutput;
  ui_card: UiCard;
}

export function runCreateFromTemplate(
  templateId: string,
  opts?: { classification?: DataClass; visibility?: ShareVisibility },
): CreateFromTemplateOutput {
  const template = getTemplate(templateId);
  const scene = parseScene(template.yaml, { silent: true });
  compileScene(scene);
  const classification = opts?.classification ?? template.default_classification;
  const share = runShareScene({
    yaml: template.yaml,
    classification,
    visibility: opts?.visibility,
  });
  const bytes = utf8Bytes(template.yaml);
  return {
    template_id: template.id,
    label: scene.name,
    bytes,
    yaml: template.yaml,
    checklist: template.checklist,
    classification,
    share,
    ui_card:
      share.mode === 'public'
        ? cardWorldReady({
            label: scene.name,
            bytes,
            share_url: share.share_url,
            classification,
          })
        : cardPrivateShare({
            scene_hash: share.scene_hash,
            classification,
            checklist: template.checklist,
          }),
  };
}

// ============================================================
// publish_m13_scene — tokenized via @m13/gateway (D2)
// ============================================================

export interface PublishSceneInput {
  yaml: string;
  classification?: DataClass;
  org_id?: string;
  /** Override; default process.env.M13_GATEWAY_URL */
  gateway_url?: string;
}

export type PublishSceneOutput =
  | {
      mode: 'tokenized';
      id: string;
      token: string;
      scene_hash: string;
      classification: DataClass;
      expires_at: string;
      bytes: number;
      name: string;
      player_url: string;
      fetch_url: string;
      ui_card: UiCard;
    }
  | ShareSceneOutput;

/**
 * Prefer gateway tokenized publish for S2/S3 when M13_GATEWAY_URL is set.
 * Falls back to private_local airgap descriptor if gateway unreachable / unset.
 */
export async function runPublishScene(input: PublishSceneInput): Promise<PublishSceneOutput> {
  const classification: DataClass = input.classification ?? 'S2';
  const validation = runValidateScene(input.yaml);
  if (!validation.ok) {
    throw new Error(`Escena inválida — corrígela antes de publicar:\n${validation.error}`);
  }

  const gateway = (input.gateway_url ?? process.env.M13_GATEWAY_URL ?? '').replace(/\/$/, '');
  if (!gateway) {
    return runShareScene({ yaml: input.yaml, classification, visibility: 'private_local' });
  }

  const res = await fetch(`${gateway}/v1/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Id': input.org_id ?? 'default',
    },
    body: JSON.stringify({
      yaml: input.yaml,
      classification,
      org_id: input.org_id ?? 'default',
    }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof data.message === 'string' ? data.message : JSON.stringify(data);
    throw new Error(`[m13/gateway] publish failed (${res.status}): ${msg}`);
  }

  const player_url = String(data.player_url ?? '');
  return {
    mode: 'tokenized',
    id: String(data.id),
    token: String(data.token),
    scene_hash: String(data.scene_hash),
    classification,
    expires_at: String(data.expires_at),
    bytes: Number(data.bytes ?? 0),
    name: String(data.name ?? 'scene'),
    player_url,
    fetch_url: String(data.fetch_url ?? ''),
    ui_card: {
      kind: 'private_share',
      title: String(data.name ?? 'scene'),
      subtitle: 'Link autenticado (gateway)',
      metrics: [
        { label: 'clase', value: classification },
        { label: 'expira', value: String(data.expires_at ?? '') },
      ],
      cta: { label: 'Abrir inducción', url: player_url },
      security_banner: 'Token bearer en la URL — no lo publiques en canales abiertos.',
    },
  };
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
