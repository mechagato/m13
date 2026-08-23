/**
 * UI card metadata for ChatGPT Apps / agentic hosts (canon D1).
 * Hosts may render these as embedded conversation widgets.
 */

export type CardKind =
  | 'world_ready'
  | 'validation'
  | 'private_share'
  | 'template'
  | 'concepts';

export interface UiCard {
  kind: CardKind;
  title: string;
  subtitle?: string;
  /** Short metrics for the widget */
  metrics?: Array<{ label: string; value: string }>;
  /** Primary call-to-action */
  cta?: { label: string; url?: string; action?: string };
  /** Secondary actions */
  actions?: Array<{ label: string; action: string }>;
  /** Security banner for S2/S3 */
  security_banner?: string;
  /** Checklist preview (EHS) */
  checklist?: string[];
}

export function cardWorldReady(input: {
  label: string;
  bytes: number;
  share_url?: string | null;
  classification?: string;
}): UiCard {
  const publicUrl = input.share_url && input.share_url.length > 0;
  return {
    kind: 'world_ready',
    title: input.label,
    subtitle: publicUrl ? 'Mundo listo para caminar' : 'Mundo listo (share privado)',
    metrics: [
      { label: 'peso', value: `${input.bytes.toLocaleString('es-MX')} B` },
      ...(input.classification
        ? [{ label: 'clase', value: input.classification }]
        : []),
    ],
    cta: publicUrl
      ? { label: 'Abrir mundo', url: input.share_url! }
      : { label: 'Usar publish privado', action: 'private_share' },
    security_banner: publicUrl
      ? undefined
      : 'No se generó URL pública — clasificación confidencial o modo private_local.',
  };
}

export function cardPrivateShare(input: {
  scene_hash: string;
  classification: string;
  checklist?: string[];
}): UiCard {
  return {
    kind: 'private_share',
    title: 'Share confidencial',
    subtitle: 'Sin YAML en la URL pública',
    metrics: [
      { label: 'hash', value: `${input.scene_hash.slice(0, 12)}…` },
      { label: 'clase', value: input.classification },
    ],
    cta: { label: 'Transferencia airgap / portal D2', action: 'await_portal_token' },
    security_banner:
      'No pegues el YAML completo en el chat. El vault del plano no debe vivir en OpenAI.',
    checklist: input.checklist,
  };
}

export function cardTemplate(input: {
  title: string;
  description: string;
  checklist: string[];
  classification: string;
}): UiCard {
  return {
    kind: 'template',
    title: input.title,
    subtitle: input.description,
    metrics: [{ label: 'clase default', value: input.classification }],
    checklist: input.checklist,
    cta: { label: 'Crear desde plantilla', action: 'create_from_template' },
  };
}
