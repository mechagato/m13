import { parse as parseYaml } from 'yaml';
import { GAME_CATALOG_KEYS, MODULE_ROOT_KEY_SET, VISUAL_ROOT_KEY_SET } from './keys.js';
import {
  educationEventSchema,
  isEducationEvent,
  isLightFlashEvent,
  lightFlashEventSchema,
  overlayRootSchema,
  SUPPORTED_OVERLAY_VERSIONS,
  type OverlayMission,
  type OverlayNpc,
  type OverlayRoot,
} from './schema.js';
import { normalizeVersion, stripToVisual } from './strip.js';

export interface OverlayParseOptions {
  silent?: boolean;
  /** Catálogos V2 sin `game:` y módulos en v0.1/v0.2 pasan de warning a error. */
  strict?: boolean;
}

export interface OverlayDocument extends OverlayRoot {
  version: '0.1' | '0.2' | '0.3';
  npc: OverlayNpc[];
  npcs?: undefined;
  missions: Array<OverlayMission & { kind: 'lesson' | 'survival' }>;
  educationEvents: unknown[];
  visualEvents: unknown[];
}

export interface OverlayParseResult {
  overlay: OverlayDocument;
  visual: Record<string, unknown>;
  warnings: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatZodIssues(issues: { path: (string | number)[]; message: string }[]): string {
  return issues.map((issue) => `  · ${issue.path.join('.') || '<root>'} — ${issue.message}`).join('\n');
}

function throwOverlay(message: string): never {
  throw new Error(`[m13/overlay] ${message}`);
}

function throwInvalid(lines: string[]): never {
  throwOverlay(`Escena .m13 inválida:\n${lines.map((line) => `  · ${line}`).join('\n')}`);
}

function canonicalizeNpcList(list: OverlayNpc[]): string {
  const sorted = [...list].map((npc) => npc).sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(sorted);
}

function uniqueIds(items: { id: string }[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`${label} id duplicado: ${item.id}`);
    seen.add(item.id);
  }
}

function inferMissionKind(mission: OverlayMission, hasEducation: boolean): 'lesson' | 'survival' | undefined {
  if (mission.kind) return mission.kind;
  if (mission.profile) return mission.profile;
  if (mission.steps && mission.steps.length > 0) return 'survival';
  if (mission.objective) return 'lesson';
  if (hasEducation) return 'lesson';
  return undefined;
}

function collectObjectIds(raw: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(raw.objects)) return ids;
  for (const obj of raw.objects) {
    if (isPlainObject(obj) && typeof obj.id === 'string') ids.add(obj.id);
  }
  return ids;
}

function detectMissionCycles(
  missions: Array<OverlayMission & { kind: 'lesson' | 'survival' }>,
  errors: string[],
): void {
  const byId = new Map(missions.map((m) => [m.id, m]));
  for (const start of missions) {
    const seen = new Set<string>();
    let cursor: string | undefined = start.id;
    while (cursor) {
      if (seen.has(cursor)) {
        errors.push(`missions.${start.id} — ciclo en next (${[...seen, cursor].join(' → ')})`);
        break;
      }
      seen.add(cursor);
      cursor = byId.get(cursor)?.next;
    }
  }
}

function checkRefs(overlay: OverlayDocument, objectIds: Set<string>, errors: string[]): void {
  const npcIds = new Set(overlay.npc.map((n) => n.id));
  const zoneIds = new Set((overlay.zones ?? []).map((z) => z.id));
  const quizIds = new Set((overlay.quizzes ?? []).map((q) => q.id));
  const missionIds = new Set(overlay.missions.map((m) => m.id));

  for (const npc of overlay.npc) {
    if (npc.mission && !missionIds.has(npc.mission)) {
      errors.push(`npc.${npc.id}.mission — no existe missions.${npc.mission}`);
    }
    if (npc.object && !objectIds.has(npc.object) && !npcIds.has(npc.object)) {
      // object puede coincidir con el id visual; si no está, es error de ref
      if (!objectIds.has(npc.object)) {
        errors.push(`npc.${npc.id}.object — no existe objects.${npc.object}`);
      }
    }
  }

  for (const mission of overlay.missions) {
    if (mission.next && !missionIds.has(mission.next)) {
      errors.push(`missions.${mission.id}.next — no existe missions.${mission.next}`);
    }
    const objective = mission.objective;
    if (!objective) continue;
    if (objective.talk && !npcIds.has(objective.talk)) {
      errors.push(`missions.${mission.id}.objective.talk — no existe npc.${objective.talk}`);
    }
    if (objective.interact && !objectIds.has(objective.interact) && !npcIds.has(objective.interact)) {
      errors.push(`missions.${mission.id}.objective.interact — no existe objects/npc.${objective.interact}`);
    }
    if (objective.collect && !objectIds.has(objective.collect)) {
      errors.push(`missions.${mission.id}.objective.collect — no existe objects.${objective.collect}`);
    }
    if (objective.quiz && !quizIds.has(objective.quiz)) {
      errors.push(`missions.${mission.id}.objective.quiz — no existe quizzes.${objective.quiz}`);
    }
    if (objective.enter_zone && !zoneIds.has(objective.enter_zone) && !objectIds.has(objective.enter_zone)) {
      errors.push(`missions.${mission.id}.objective.enter_zone — no existe zones.${objective.enter_zone}`);
    }
  }
}

function splitEvents(rawEvents: unknown[] | undefined): {
  visual: unknown[];
  education: unknown[];
  errors: string[];
} {
  const visual: unknown[] = [];
  const education: unknown[] = [];
  const errors: string[] = [];
  if (!rawEvents) return { visual, education, errors };
  for (const [index, event] of rawEvents.entries()) {
    if (isLightFlashEvent(event)) {
      const parsed = lightFlashEventSchema.safeParse(event);
      if (!parsed.success) {
        errors.push(`events[${index}] — ${parsed.error.issues[0]?.message ?? 'light_flash inválido'}`);
      } else {
        visual.push(parsed.data);
      }
      continue;
    }
    if (isEducationEvent(event)) {
      const parsed = educationEventSchema.safeParse(event);
      if (!parsed.success) {
        errors.push(
          `events[${index}] — ${parsed.error.issues.map((i) => i.message).join('; ') || 'evento educativo inválido'}`,
        );
      } else {
        education.push(parsed.data);
      }
      continue;
    }
    errors.push(`events[${index}] — se espera light_flash (v0.2) o trigger educativo (kit)`);
  }
  return { visual, education, errors };
}

function coerceRoot(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) {
    throwOverlay('el documento raíz debe ser un objeto YAML');
  }
  const version = normalizeVersion(raw.version) ?? '0.1';
  return { ...raw, version };
}

/**
 * Valida un objeto ya parseado (YAML→JS) contra el overlay v0.3 modular.
 * No llama al parser visual ni al compilador WGSL.
 */
export function validateOverlay(raw: unknown, opts: OverlayParseOptions = {}): OverlayParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const coerced = coerceRoot(raw);
  const version = coerced.version as string;

  if (!SUPPORTED_OVERLAY_VERSIONS.includes(version as (typeof SUPPORTED_OVERLAY_VERSIONS)[number])) {
    throwOverlay(
      `m13 v${version} no soportado por el overlay (soporta ${SUPPORTED_OVERLAY_VERSIONS.join(', ')})`,
    );
  }

  const parsed = overlayRootSchema.safeParse(coerced);
  if (!parsed.success) {
    throwOverlay(`Escena .m13 inválida:\n${formatZodIssues(parsed.error.issues)}`);
  }

  const data = parsed.data;
  const hasEducation = data.education !== undefined;
  const hasGame = data.game !== undefined;

  if (version !== '0.3' && (hasEducation || hasGame || data.npc || data.npcs || data.missions)) {
    const msg = `módulos education/game/npc/missions en version "${version}"; el contrato modular es version: "0.3"`;
    if (opts.strict) errors.push(msg);
    else warnings.push(msg);
  }

  for (const key of GAME_CATALOG_KEYS) {
    if ((data as Record<string, unknown>)[key] !== undefined && !hasGame) {
      const msg = `catálogo V2 '${key}' requiere el módulo game: (módulo ausente)`;
      if (opts.strict) errors.push(msg);
      else warnings.push(msg);
    }
  }

  // npc canónico / npcs alias
  const npcList = data.npc;
  const npcsList = data.npcs;
  let npc: OverlayNpc[] = [];
  if (npcList && npcsList) {
    if (canonicalizeNpcList(npcList) !== canonicalizeNpcList(npcsList)) {
      errors.push('npc y npcs ambas pobladas y distintas — una sola colección canónica (npc)');
    } else {
      npc = npcList;
      warnings.push('npcs es alias deprecado de npc (listas idénticas; se conserva npc)');
    }
  } else if (npcList) {
    npc = npcList;
  } else if (npcsList) {
    npc = npcsList;
    warnings.push('npcs es alias deprecado; se normalizó a npc');
  }

  const missions: Array<OverlayMission & { kind: 'lesson' | 'survival' }> = [];
  for (const mission of data.missions ?? []) {
    const kind = inferMissionKind(mission, hasEducation);
    if (!kind) {
      errors.push(`missions.${mission.id} — se necesita kind, objective (lesson) o steps (survival)`);
      continue;
    }
    if (kind === 'lesson') {
      if (!mission.objective) {
        errors.push(`missions.${mission.id} — kind: lesson requiere objective`);
      }
      if (!mission.title) {
        errors.push(`missions.${mission.id} — kind: lesson requiere title`);
      }
    }
    if (kind === 'survival' && (!mission.steps || mission.steps.length === 0)) {
      errors.push(`missions.${mission.id} — kind: survival requiere steps`);
    }
    missions.push({ ...mission, kind });
  }

  uniqueIds(npc, 'npc', errors);
  uniqueIds(missions, 'missions', errors);
  uniqueIds(data.zones ?? [], 'zones', errors);
  uniqueIds(data.quizzes ?? [], 'quizzes', errors);
  uniqueIds(data.items ?? [], 'items', errors);
  const objectIds = collectObjectIds(coerced);
  if (Array.isArray(coerced.objects)) {
    const seen = new Set<string>();
    for (const obj of coerced.objects) {
      if (!isPlainObject(obj) || typeof obj.id !== 'string') continue;
      if (seen.has(obj.id)) errors.push(`objects id duplicado: ${obj.id}`);
      seen.add(obj.id);
    }
  }

  const {
    visual: visualEvents,
    education: educationEvents,
    errors: eventErrors,
  } = splitEvents(Array.isArray(coerced.events) ? coerced.events : data.events);
  errors.push(...eventErrors);
  if (visualEvents.length > 16) {
    errors.push('events light_flash excede el máximo visual (16)');
  }

  const overlay = {
    ...data,
    version: version as OverlayDocument['version'],
    npc,
    npcs: undefined,
    missions,
    educationEvents,
    visualEvents,
  } as OverlayDocument;

  checkRefs(overlay, objectIds, errors);
  detectMissionCycles(overlay.missions, errors);

  if (errors.length > 0) throwInvalid(errors);

  if (!opts.silent && isPlainObject(raw)) {
    for (const key of Object.keys(raw)) {
      if (!VISUAL_ROOT_KEY_SET.has(key) && !MODULE_ROOT_KEY_SET.has(key)) {
        warnings.push(`campo desconocido: ${key}`);
      }
    }
  }

  if (!opts.silent) {
    for (const warning of warnings) {
      console.warn(`[m13/overlay] ${warning}`);
    }
  }

  return {
    overlay,
    visual: stripToVisual(coerced),
    warnings,
  };
}

/**
 * Parsea YAML `.m13` (v0.1 / v0.2 / v0.3) con overlay modular.
 * Extrae education/game y stripea a un doc visual.
 */
export function parseOverlay(yamlText: string, opts: OverlayParseOptions = {}): OverlayParseResult {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (err) {
    throwOverlay(`YAML inválido: ${err instanceof Error ? err.message : String(err)}`);
  }
  return validateOverlay(raw, opts);
}
