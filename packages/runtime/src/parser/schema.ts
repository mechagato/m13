import { z } from 'zod';

/**
 * .m13 v0.1 — Schema formal del formato.
 *
 * Una escena .m13 describe semánticamente un espacio 3D habitable
 * mediante conceptos materiales y objetos geométricos básicos.
 * El runtime sintetiza geometría y materiales en tiempo real.
 */

// ---------- primitivos ----------

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
// Dimensiones físicas (bounds, scale, size): 0 o negativo produce SDFs degeneradas
// y clamps de cámara invertidos — se rechazan en parse, no en runtime.
const positiveVec3 = z.tuple([
  z.number().positive(),
  z.number().positive(),
  z.number().positive(),
]);
// Canales de color: sin cota superior (HDR válido) pero nunca negativos.
const rgb = z.tuple([z.number().min(0), z.number().min(0), z.number().min(0)]);

// ---------- iluminación ----------

const lightSchema = z.object({
  position: vec3.default([0, 2.5, 0]),
  color: rgb.default([1.0, 0.92, 0.78]),
  intensity: z.number().min(0).default(1.0),
});

const ambientSchema = z.object({
  background: rgb.default([0.05, 0.045, 0.04]),
  ambientColor: rgb.default([0.08, 0.075, 0.07]),
  tint: rgb.default([1.0, 1.0, 1.0]),
  fogColor: rgb.default([0.05, 0.045, 0.04]),
  fogDensity: z.number().min(0).default(0.015),
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

const objectSchema = z
  .object({
    id: z.string(),
    kind: objectKindSchema,
    /** Solo válido (y requerido) cuando `kind === 'concept'`. Id del concepto geométrico. */
    concept: z.string().optional(),
    position: vec3,
    /** Rotación estática en grados (Euler XYZ extrínseco, orden de aplicación X→Y→Z). */
    rotation: vec3.optional(),
    scale: z.union([z.number().positive(), positiveVec3]).default(1),
    /** Seed por instancia (P5/T-251): descorrelaciona el muestreo del material de ESTE
     *  objeto (offset de dominio) → mismo concepto, vetas/grano distintos. No toca la geometría. */
    seed: z.number().optional(),
    /** Requerido cuando kind ≠ 'concept'. Para kind:'concept' el material viene del concept. */
    material: materialSchema.optional(),
    audio_reactive: z.boolean().default(false),
    animate: z
      .object({
        mode: z.enum(['bob', 'rotate', 'pulse']),
        speed: z.number().default(1.0),
        amplitude: z.number().min(0).default(0.1),
      })
      .optional(),
  })
  .superRefine((obj, ctx) => {
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
  });

// ---------- escena raíz ----------

export const m13SceneSchema = z.object({
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
  cameraSpeed: z.number().positive().optional(),
  window: z
    .object({
      position: vec3,
      size: positiveVec3,
    })
    .optional(),
  objects: z.array(objectSchema).default([]),
});

// ---------- tipos exportados ----------

export type M13Scene = z.infer<typeof m13SceneSchema>;
export type M13Object = z.infer<typeof objectSchema>;
export type M13Material = z.infer<typeof materialSchema>;
export type M13Light = z.infer<typeof lightSchema>;
export type M13Surface = z.infer<typeof surfaceSchema>;
