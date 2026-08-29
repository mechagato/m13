/**
 * Claves raíz visuales (contrato parseScene v0.1/v0.2).
 * Cualquier otra clave raíz se considera módulo / overlay y se stripea.
 */
export const VISUAL_ROOT_KEYS = [
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
] as const;

export type VisualRootKey = (typeof VISUAL_ROOT_KEYS)[number];

export const VISUAL_ROOT_KEY_SET: ReadonlySet<string> = new Set(VISUAL_ROOT_KEYS);

/** Campos de object[] que el parser visual v0.1/v0.2 conoce. */
export const VISUAL_OBJECT_KEYS = [
  'id',
  'kind',
  'concept',
  'position',
  'rotation',
  'scale',
  'seed',
  'material',
  'audio_reactive',
  'animate',
] as const;

export const VISUAL_OBJECT_KEY_SET: ReadonlySet<string> = new Set(VISUAL_OBJECT_KEYS);

/** light_flash v0.2. El resto de events[] es overlay (educación / juego). */
export const VISUAL_EVENT_KEYS = ['t', 'kind', 'duration', 'intensity'] as const;

export const VISUAL_EVENT_KEY_SET: ReadonlySet<string> = new Set(VISUAL_EVENT_KEYS);

/**
 * Módulos y colecciones v0.3. El renderer no las interpreta.
 * `npcs` es alias deprecado de `npc`.
 */
export const MODULE_ROOT_KEYS = [
  'title',
  'education',
  'game',
  'npc',
  'npcs',
  'missions',
  'quizzes',
  'zones',
  'player',
  'ui',
  'score',
  'items',
  'loot_tables',
  'spawners',
  'portals',
  'crafting',
  'plugins',
] as const;

export const MODULE_ROOT_KEY_SET: ReadonlySet<string> = new Set(MODULE_ROOT_KEYS);

/** Catálogos Vertical 2: sin `game:` → warning (strict: error). */
export const GAME_CATALOG_KEYS = ['items', 'loot_tables', 'spawners', 'portals', 'crafting'] as const;

export const GAME_CATALOG_KEY_SET: ReadonlySet<string> = new Set(GAME_CATALOG_KEYS);

export const MAX_NPC = 24;
export const MAX_MISSIONS = 32;
export const MAX_ZONES = 48;
export const MAX_OVERLAY_EVENTS = 48;
export const MAX_QUIZZES = 32;
export const MAX_ITEMS = 64;
export const MAX_SPAWNERS = 32;
export const MAX_PORTALS = 16;
export const MAX_CRAFTING = 16;
export const MAX_LOOT_TABLES = 32;
