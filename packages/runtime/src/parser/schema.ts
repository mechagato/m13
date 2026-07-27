import { z } from 'zod';

/**
 * .m13 v0.1 — Schema formal del formato.
 *
 * Una escena .m13 describe semánticamente un espacio 3D habitable
 * mediante conceptos materiales y objetos geométricos básicos.
 * El runtime sintetiza geometría y materiales en tiempo real.
 */

// ---------- primitivos ----------

const finiteNumber = z.number().finite();
const vec3 = z.tuple([finiteNumber, finiteNumber, finiteNumber]);
// Dimensiones físicas (bounds, scale, size): 0 o negativo produce SDFs degeneradas
// y clamps de cámara invertidos — se rechazan en parse, no en runtime.
const positiveVec3 = z.tuple([
  finiteNumber.positive(),
  finiteNumber.positive(),
  finiteNumber.positive(),
]);
// Canales de color: sin cota superior (HDR válido) pero nunca negativos.
const rgb = z.tuple([finiteNumber.min(0), finiteNumber.min(0), finiteNumber.min(0)]);

/** Límite de complejidad para evitar shaders generados que bloqueen la GPU. */
export const MAX_SCENE_OBJECTS = 256;

// ---------- iluminación ----------

const lightSchema = z.object({
  position: vec3.default([0, 2.5, 0]),
  color: rgb.default([1.0, 0.92, 0.78]),
  intensity: finiteNumber.min(0).default(1.0),
});

const ambientSchema = z.object({
  background: rgb.default([0.05, 0.045, 0.04]),
  ambientColor: rgb.default([0.08, 0.075, 0.07]),
  tint: rgb.default([1.0, 1.0, 1.0]),
  fogColor: rgb.default([0.05, 0.045, 0.04]),
  fogDensity: finiteNumber.min(0).default(0.015),
});

// ---------- material (concepto) ----------

const materialSchema = z.union([
  z.string(), // referencia simple al concept id
  z.object({
    concept: z.string(),
    params: z.record(z.unknown()).optional(),
  }),
]);

// ---------- superficies del cuarto ----------

const surfaceSchema = z.object({
  concept: z.string(),
  params: z.record(z.unknown()).optional(),
});

// ---------- objetos ----------

const objectKindSchema = z.enum([
  'sphere',
  'box',
  'round_box',
  'cylinder',
  'torus',
  'concept', // T-021: delega geometría al SDF del concept (category 'object_geo')
]);

const legacyAnimateSchema = z.object({
  mode: z.enum(['bob', 'rotate', 'pulse']),
  speed: finiteNumber.default(1.0),
  amplitude: finiteNumber.min(0).default(0.1),
});

export const MAX_KEYFRAMES_PER_OBJECT = 16;
export const MAX_SCENE_EVENTS = 16;

/** Evento temporal P1: pulso de luz puramente funcional, evaluado por el shader. */
const lightFlashEventSchema = z.object({
  t: finiteNumber.min(0),
  kind: z.literal('light_flash'),
  /** Semiancho del pulso triangular, en segundos. */
  duration: finiteNumber.positive().default(0.15),
  /** Multiplicador adicional sobre la intensidad base de la luz. */
  intensity: finiteNumber.min(0).default(1),
});

const keyframeSchema = z
  .object({
    t: finiteNumber.min(0),
    position: vec3.optional(),
    rotation: vec3.optional(),
    scale: z.union([finiteNumber.positive(), positiveVec3]).optional(),
    ease: z.enum(['linear', 'smooth', 'in', 'out']).default('smooth'),
  })
  .superRefine((keyframe, ctx) => {
    if (keyframe.position === undefined && keyframe.rotation === undefined && keyframe.scale === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'keyframe requiere position, rotation o scale',
      });
    }
  });

const timelineAnimateSchema = z
  .object({
    duration: finiteNumber.positive(),
    loop: z.boolean().default(false),
    keyframes: z.array(keyframeSchema).min(1).max(MAX_KEYFRAMES_PER_OBJECT),
  })
  .superRefine((timeline, ctx) => {
    const seen = new Set<number>();
    for (const [index, keyframe] of timeline.keyframes.entries()) {
      if (keyframe.t > timeline.duration) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['keyframes', index, 't'], message: 't no puede exceder duration' });
      }
      if (seen.has(keyframe.t)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['keyframes', index, 't'], message: 't debe ser único' });
      }
      seen.add(keyframe.t);
    }
  })
  .transform((timeline) => ({
    ...timeline,
    keyframes: [...timeline.keyframes].sort((a, b) => a.t - b.t),
  }));

const objectBaseSchema = z
  .object({
    id: z.string(),
    kind: objectKindSchema,
    /** Solo válido (y requerido) cuando `kind === 'concept'`. Id del concepto geométrico. */
    concept: z.string().optional(),
    position: vec3,
    /** Rotación estática en grados (Euler XYZ extrínseco, orden de aplicación X→Y→Z). */
    rotation: vec3.optional(),
    scale: z.union([finiteNumber.positive(), positiveVec3]).default(1),
    /** Seed por instancia (P5/T-251): descorrelaciona el muestreo del material de ESTE
     *  objeto (offset de dominio) → mismo concepto, vetas/grano distintos. No toca la geometría.
     *  `.finite()`: NaN/Infinity romperían el literal WGSL del offset (F3 auditoría). */
    seed: z.number().finite().optional(),
    /** Requerido cuando kind ≠ 'concept'. Para kind:'concept' el material viene del concept. */
    material: materialSchema.optional(),
    /** Reactividad a audio (P4/T-242): `true` = amplitud global (compat); `{ band }` =
     *  reacciona a una banda FFT específica (graves/medios/agudos). */
    audio_reactive: z
      .union([z.boolean(), z.object({ band: z.enum(['bass', 'mid', 'treble']) })])
      .default(false),
    animate: legacyAnimateSchema.optional(),
  });

type ObjectKindRuleInput = {
  kind: z.infer<typeof objectKindSchema>;
  concept?: string;
  material?: unknown;
};

function addObjectKindIssues(obj: ObjectKindRuleInput, ctx: z.RefinementCtx): void {
    if (obj.kind === 'concept') {
      if (obj.concept === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'kind: "concept" requiere el campo `concept` (id del concepto geométrico)',
          path: ['concept'],
        });
      }
    } else {
      if (obj.material === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `kind: "${obj.kind}" requiere el campo \`material\``,
          path: ['material'],
        });
      }
    }
}

const objectSchema = objectBaseSchema.superRefine(addObjectKindIssues);

const objectSchemaV02 = objectBaseSchema.extend({
  animate: z.union([legacyAnimateSchema, timelineAnimateSchema]).optional(),
}).superRefine(addObjectKindIssues);

// ---------- escena raíz ----------

const m13SceneBaseSchema = z.object({
  version: z.string().default('0.1'),
  name: z.string(),
  description: z.string().optional(),
  bounds: positiveVec3.default([5, 3, 5]),
  spawn: vec3.default([0, 0, -3.5]),
  ambient: ambientSchema.default({}),
  light: lightSchema.default({}),
  // Fase 2 (T-231): walls/ceiling opcionales → escenas de EXTERIOR (campo abierto).
  // Si falta cualquiera de las dos, el compilador entra en modo exterior: suelo
  // plano extendido + cielo, sin caja de cuarto. `floor` sigue siendo obligatorio
  // (siempre hay suelo). Las escenas con walls+ceiling se comportan idénticas (interior).
  walls: surfaceSchema.optional(),
  floor: surfaceSchema,
  ceiling: surfaceSchema.optional(),
  // Cielo de exterior: gradiente de color horizonte→cénit (T-232 lo consume).
  sky: z
    .object({
      horizon: rgb,
      zenith: rgb,
    })
    .optional(),
  // Velocidad de cámara (m/s) para la escena. Útil en explanadas grandes; default 2.5.
  cameraSpeed: finiteNumber.positive().optional(),
  window: z
    .object({
      position: vec3,
      size: positiveVec3,
    })
    .optional(),
  objects: z.array(objectSchema).max(MAX_SCENE_OBJECTS).default([]),
});

/** Schema de escenas legadas. Mantenerlo estable protege el WGSL v0.1. */
export const m13SceneV01Schema = m13SceneBaseSchema.extend({
  version: z.literal('0.1').default('0.1'),
});

/** v0.2 reserva el contrato versionado; T-602 agrega timeline/keyframes a este schema. */
export const m13SceneV02Schema = m13SceneBaseSchema.extend({
  version: z.literal('0.2'),
  objects: z.array(objectSchemaV02).max(MAX_SCENE_OBJECTS).default([]),
  events: z.array(lightFlashEventSchema).max(MAX_SCENE_EVENTS).default([]),
});

export const m13SceneSchema = z.discriminatedUnion('version', [m13SceneV01Schema, m13SceneV02Schema]);

// ---------- tipos exportados ----------

export type M13SceneV01 = z.infer<typeof m13SceneV01Schema>;
export type M13SceneV02 = z.infer<typeof m13SceneV02Schema>;
export type M13Scene = z.infer<typeof m13SceneSchema>;
export type M13Object = z.infer<typeof objectSchema>;
export type M13ObjectV02 = z.infer<typeof objectSchemaV02>;
export type M13Timeline = z.infer<typeof timelineAnimateSchema>;
export type M13LightFlashEvent = z.infer<typeof lightFlashEventSchema>;
export type M13Material = z.infer<typeof materialSchema>;
export type M13Light = z.infer<typeof lightSchema>;
export type M13Surface = z.infer<typeof surfaceSchema>;

/** Migración explícita y sin pérdidas; no se aplica implícitamente al compilar una escena v0.1. */
export function migrateSceneToV02(scene: M13Scene): M13SceneV02 {
  if (scene.version === '0.2') return scene;
  return { ...scene, version: '0.2', events: [] };
}
