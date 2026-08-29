import { z } from 'zod';
import {
  MAX_CRAFTING,
  MAX_ITEMS,
  MAX_LOOT_TABLES,
  MAX_MISSIONS,
  MAX_NPC,
  MAX_OVERLAY_EVENTS,
  MAX_PORTALS,
  MAX_QUIZZES,
  MAX_SPAWNERS,
  MAX_ZONES,
} from './keys.js';

const finiteNumber = z.number().finite();
export const vec3 = z.tuple([finiteNumber, finiteNumber, finiteNumber]);
const positiveVec3 = z.tuple([finiteNumber.positive(), finiteNumber.positive(), finiteNumber.positive()]);

export const SUPPORTED_OVERLAY_VERSIONS = ['0.1', '0.2', '0.3'] as const;
export type OverlayVersion = (typeof SUPPORTED_OVERLAY_VERSIONS)[number];

const bloomLevelSchema = z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);

/**
 * Vertical 1 — campos reales del kit/studio (English Lab, supermercado).
 * No se simplifica a `{ locale, lesson }` del YAML resumido del SDD:
 * esos van opcionales para no rechazar copias SDD, pero el contrato shipped
 * es subject/grade/durationMin/language/difficulty/objectives/bloom/stem/mode.
 */
export const educationSchema = z
  .object({
    subject: z.string().min(1),
    grade: z.string().min(1),
    durationMin: finiteNumber.positive(),
    language: z.string().min(1),
    difficulty: z.enum(['intro', 'easy', 'medium', 'hard']),
    objectives: z.array(z.string()).min(1),
    bloom: z.array(bloomLevelSchema).min(1),
    stem: z.boolean(),
    mode: z.enum(['student', 'teacher']),
    competencies: z.array(z.string()).optional(),
    locale: z.string().optional(),
    lesson: z.string().optional(),
  })
  .passthrough();

export const gamePlayerSchema = z
  .object({
    health: finiteNumber.optional(),
    hunger: finiteNumber.optional(),
    inventory_capacity: z.number().int().positive().optional(),
    hotbar: z.number().int().positive().optional(),
  })
  .passthrough();

/** Vertical 2 — bloque `game`. */
export const gameSchema = z
  .object({
    mode: z.string().default('survival'),
    seed: finiteNumber,
    tick_hz: finiteNumber.positive().default(20),
    interact_range: finiteNumber.positive().optional(),
    player: gamePlayerSchema.optional(),
    bounds_policy: z.string().optional(),
  })
  .passthrough();

const dialogObjectSchema = z
  .object({
    text: z.string(),
    when: z.enum(['idle', 'mission', 'success', 'hint']).optional(),
    mission: z.string().optional(),
  })
  .passthrough();

export const dialogLineSchema = z.union([z.string(), dialogObjectSchema]);

export const npcSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    role: z.string().optional(),
    position: vec3.optional(),
    dialog: z.union([z.string(), z.array(dialogLineSchema)]).optional(),
    voice: z.string().optional(),
    mission: z.string().optional(),
    hint: z.string().optional(),
    reward: z.record(z.unknown()).optional(),
    object: z.string().optional(),
    health: finiteNumber.optional(),
    ai: z
      .object({
        profile: z.string(),
        radius: finiteNumber.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .superRefine((npc, ctx) => {
    const kitShape = npc.position !== undefined && npc.dialog !== undefined;
    const gameShape = npc.object !== undefined;
    if (!kitShape && !gameShape) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'npc requiere position+dialog (kit/studio) u object (game)',
      });
    }
  });

const LESSON_OBJECTIVE_KEYS = ['talk', 'interact', 'quiz', 'enter_zone', 'collect', 'reach'] as const;

/** Kit: `objective: { talk: miss_luna }` — una clave de verbo, no `{ type, npc }`. */
export const lessonObjectiveSchema = z
  .object({
    talk: z.string().optional(),
    interact: z.string().optional(),
    quiz: z.string().optional(),
    enter_zone: z.string().optional(),
    collect: z.string().optional(),
    reach: vec3.optional(),
    radius: finiteNumber.positive().optional(),
  })
  .passthrough()
  .superRefine((objective, ctx) => {
    const present = LESSON_OBJECTIVE_KEYS.filter((key) => objective[key] !== undefined);
    if (present.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'objective requiere talk | interact | quiz | enter_zone | collect | reach',
      });
    }
  });

export const missionStepSchema = z
  .object({
    id: z.string().min(1),
    require: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const missionKindSchema = z.enum(['lesson', 'survival']);

export const missionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    kind: missionKindSchema.optional(),
    profile: missionKindSchema.optional(),
    objective: lessonObjectiveSchema.optional(),
    steps: z.array(missionStepSchema).optional(),
    rewards: z
      .object({
        xp: finiteNumber.optional(),
        stars: finiteNumber.optional(),
        badge: z.string().optional(),
        coins: finiteNumber.optional(),
        item: z.string().optional(),
      })
      .passthrough()
      .optional(),
    next: z.string().optional(),
    hints: z.array(z.string()).optional(),
    success: z.string().optional(),
    failure: z.string().optional(),
    required: z.boolean().optional(),
  })
  .passthrough();

export const zoneSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['box', 'sphere']).optional(),
    shape: z.enum(['aabb', 'box', 'sphere']).optional(),
    position: vec3.optional(),
    size: positiveVec3.optional(),
    radius: finiteNumber.positive().optional(),
    min: vec3.optional(),
    max: vec3.optional(),
    label: z.string().optional(),
    hidden: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough()
  .superRefine((zone, ctx) => {
    const kind = zone.kind ?? (zone.shape === 'aabb' ? 'box' : zone.shape);
    if (kind === 'sphere') {
      if (zone.radius === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['radius'],
          message: 'zone sphere requiere radius',
        });
      }
    } else {
      // kit box: size; SDD aabb: min+max
      if (zone.size === undefined && (zone.min === undefined || zone.max === undefined)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'zone box requiere size (kit) o min+max (aabb)',
        });
      }
    }
    if (zone.position === undefined && (zone.min === undefined || zone.max === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['position'],
        message: 'zone requiere position o min+max',
      });
    }
  });

export const quizSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    choices: z.array(z.string()).min(2).max(6),
    answer: z.number().int().min(0),
    bloom: z.string().optional(),
    xp: finiteNumber.optional(),
  })
  .passthrough()
  .superRefine((quiz, ctx) => {
    if (quiz.answer >= quiz.choices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answer'],
        message: 'answer fuera de rango de choices',
      });
    }
  });

export const playerSchema = z
  .object({
    spawn: vec3.optional(),
    height: finiteNumber.positive().optional(),
    speed: finiteNumber.positive().optional(),
    role: z.string().optional(),
  })
  .passthrough();

export const uiSchema = z
  .object({
    hud: z.enum(['education', 'minimal', 'none']).optional(),
    locale: z.string().optional(),
    map: z.boolean().optional(),
    hints: z.boolean().optional(),
  })
  .passthrough();

export const scoreSchema = z
  .object({
    xp: finiteNumber.optional(),
    stars: finiteNumber.optional(),
    coins: finiteNumber.optional(),
  })
  .passthrough();

export const itemSchema = z
  .object({
    id: z.string().min(1),
    stack: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    hunger_restore: finiteNumber.optional(),
  })
  .passthrough();

export const lootTableSchema = z
  .object({
    id: z.string().min(1),
    count: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
    entries: z
      .array(
        z
          .object({
            item: z.string(),
            weight: finiteNumber.optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export const spawnerSchema = z
  .object({
    id: z.string().min(1),
    position: vec3.optional(),
    npc: z.string().optional(),
    table: z.string().optional(),
    budget: z.number().int().positive().optional(),
    radius: finiteNumber.positive().optional(),
  })
  .passthrough();

export const portalSchema = z
  .object({
    id: z.string().min(1),
    position: vec3.optional(),
    to: vec3.optional(),
    destination: z
      .union([
        z.string(),
        z
          .object({
            scene: z.string().optional(),
            position: vec3.optional(),
          })
          .passthrough(),
      ])
      .optional(),
    radius: finiteNumber.positive().optional(),
  })
  .passthrough();

export const craftingRecipeSchema = z
  .object({
    id: z.string().min(1),
    bench: z.string().optional(),
    station: z.string().optional(),
    inputs: z
      .array(
        z
          .object({
            item: z.string(),
            count: z.number().int().positive().optional(),
            n: z.number().int().positive().optional(),
          })
          .passthrough(),
      )
      .optional(),
    output: z
      .object({
        item: z.string(),
        count: z.number().int().positive().optional(),
        n: z.number().int().positive().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const educationEventSchema = z
  .object({
    trigger: z.enum([
      'enter_zone',
      'exit_zone',
      'interact',
      'talk',
      'mission_completed',
      'mission_failed',
      'quiz_passed',
      'spawn',
      'timer',
    ]),
    target: z.string().optional(),
    action: z
      .object({
        next: z.string().optional(),
        xp: finiteNumber.optional(),
        badge: z.string().optional(),
        dialog: z.string().optional(),
        sound: z.string().optional(),
        fireworks: z.boolean().optional(),
        teleport: vec3.optional(),
        unlock: z.string().optional(),
        hint: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const lightFlashEventSchema = z
  .object({
    t: finiteNumber.min(0),
    kind: z.literal('light_flash'),
    duration: finiteNumber.positive().optional(),
    intensity: finiteNumber.min(0).optional(),
  })
  .passthrough();

export const overlayEventSchema = z.union([lightFlashEventSchema, educationEventSchema]);

/**
 * Root overlay: valida módulos. Los campos visuales pasan intactos
 * (parseScene v0.1/v0.2 es la fuente de verdad visual).
 */
export const overlayRootSchema = z
  .object({
    version: z.enum(SUPPORTED_OVERLAY_VERSIONS).default('0.1'),
    name: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    education: educationSchema.optional(),
    game: gameSchema.optional(),
    npc: z.array(npcSchema).max(MAX_NPC).optional(),
    npcs: z.array(npcSchema).max(MAX_NPC).optional(),
    missions: z.array(missionSchema).max(MAX_MISSIONS).optional(),
    quizzes: z.array(quizSchema).max(MAX_QUIZZES).optional(),
    zones: z.array(zoneSchema).max(MAX_ZONES).optional(),
    player: playerSchema.optional(),
    ui: uiSchema.optional(),
    score: scoreSchema.optional(),
    items: z.array(itemSchema).max(MAX_ITEMS).optional(),
    loot_tables: z.array(lootTableSchema).max(MAX_LOOT_TABLES).optional(),
    spawners: z.array(spawnerSchema).max(MAX_SPAWNERS).optional(),
    portals: z.array(portalSchema).max(MAX_PORTALS).optional(),
    crafting: z.array(craftingRecipeSchema).max(MAX_CRAFTING).optional(),
    events: z.array(z.unknown()).max(MAX_OVERLAY_EVENTS).optional(),
    plugins: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type OverlayEducation = z.infer<typeof educationSchema>;
export type OverlayGame = z.infer<typeof gameSchema>;
export type OverlayNpc = z.infer<typeof npcSchema>;
export type OverlayMission = z.infer<typeof missionSchema>;
export type OverlayZone = z.infer<typeof zoneSchema>;
export type OverlayQuiz = z.infer<typeof quizSchema>;
export type OverlayItem = z.infer<typeof itemSchema>;
export type OverlayRoot = z.infer<typeof overlayRootSchema>;

export function isLightFlashEvent(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { kind?: unknown }).kind === 'light_flash'
  );
}

export function isEducationEvent(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { trigger?: unknown }).trigger === 'string'
  );
}
