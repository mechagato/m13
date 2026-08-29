/**
 * @m13/spec — overlay Zod v0.3 modular.
 *
 * No importa renderer, compiler ni WGSL.
 * El parser visual v0.1/v0.2 vive en @m13/runtime y se deja intacto.
 */

export { parseOverlay, validateOverlay } from './overlay.js';
export type { OverlayDocument, OverlayParseOptions, OverlayParseResult } from './overlay.js';

export { stripToVisual, hasModuleKeys, normalizeVersion } from './strip.js';

export {
  MODULE_ROOT_KEYS,
  MODULE_ROOT_KEY_SET,
  VISUAL_ROOT_KEYS,
  VISUAL_ROOT_KEY_SET,
  VISUAL_OBJECT_KEYS,
  GAME_CATALOG_KEYS,
  MAX_NPC,
  MAX_MISSIONS,
  MAX_ZONES,
  MAX_OVERLAY_EVENTS,
} from './keys.js';

export {
  overlayRootSchema,
  educationSchema,
  gameSchema,
  npcSchema,
  missionSchema,
  zoneSchema,
  quizSchema,
  SUPPORTED_OVERLAY_VERSIONS,
} from './schema.js';
export type {
  OverlayEducation,
  OverlayGame,
  OverlayNpc,
  OverlayMission,
  OverlayZone,
  OverlayQuiz,
  OverlayRoot,
  OverlayVersion,
} from './schema.js';
