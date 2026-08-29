import { VISUAL_EVENT_KEY_SET, VISUAL_OBJECT_KEY_SET, VISUAL_ROOT_KEYS } from './keys.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Inline — no importar schema.ts para que el runtime pueda tree-shakear el overlay Zod. */
function isLightFlashEvent(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { kind?: unknown }).kind === 'light_flash'
  );
}

export function normalizeVersion(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    if (value === 0.1) return '0.1';
    if (value === 0.2) return '0.2';
    if (value === 0.3) return '0.3';
    return String(value);
  }
  if (typeof value === 'string') return value;
  return String(value);
}

function pickKeys(source: Record<string, unknown>, allowed: ReadonlySet<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (allowed.has(key)) out[key] = source[key];
  }
  return out;
}

function stripObject(raw: unknown): unknown {
  if (!isPlainObject(raw)) return raw;
  return pickKeys(raw, VISUAL_OBJECT_KEY_SET);
}

function stripLightFlash(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) return {};
  return pickKeys(raw, VISUAL_EVENT_KEY_SET);
}

/**
 * Quita education/game/npc/missions/quizzes/items/… y extras de object
 * (`label`, `interact`, `zone`) + events educativos.
 *
 * v0.3 → v0.2 (SDD: strip-to-visual = v0.2 efectivo).
 * v0.1 / v0.2 conservan su número.
 *
 * El resultado debe ser aceptado por `parseScene` / `validateScene` actuales.
 */
export function stripToVisual(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) {
    throw new Error('[m13/overlay] strip-to-visual espera un objeto raíz');
  }

  const visual: Record<string, unknown> = {};
  for (const key of VISUAL_ROOT_KEYS) {
    if (key === 'version' || key === 'objects' || key === 'events') continue;
    if (raw[key] !== undefined) visual[key] = raw[key];
  }

  if (Array.isArray(raw.objects)) {
    visual.objects = raw.objects.map(stripObject);
  }

  if (Array.isArray(raw.events)) {
    const flashes = raw.events.filter(isLightFlashEvent).map(stripLightFlash);
    if (flashes.length > 0) visual.events = flashes;
  }

  const version = normalizeVersion(raw.version) ?? '0.1';
  visual.version = version === '0.3' ? '0.2' : version;
  return visual;
}

/** True si el doc stripeado no carga ninguna clave de módulo. */
export function hasModuleKeys(doc: Record<string, unknown>): boolean {
  for (const key of Object.keys(doc)) {
    if (key === 'version' || key === 'objects' || key === 'events') continue;
    if (!VISUAL_ROOT_KEYS.includes(key as (typeof VISUAL_ROOT_KEYS)[number])) return true;
  }
  if (Array.isArray(doc.objects)) {
    for (const obj of doc.objects) {
      if (!isPlainObject(obj)) continue;
      for (const key of Object.keys(obj)) {
        if (!VISUAL_OBJECT_KEY_SET.has(key)) return true;
      }
    }
  }
  if (Array.isArray(doc.events)) {
    for (const event of doc.events) {
      if (!isLightFlashEvent(event)) return true;
    }
  }
  return false;
}
