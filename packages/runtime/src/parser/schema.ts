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
const rgb = z.tuple([z.number(), z.number(), z.number()]);

// ---------- iluminación ----------

const lightSchema = z.object({
  position: vec3.default([0, 2.5, 0]),
  color: rgb.default([1.0, 0.92, 0.78]),
  intensity: z.number().default(1.0),
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
]);

const objectSchema = z.object({
  id: z.string(),
  kind: objectKindSchema,
  position: vec3,
  rotation: vec3.optional(),
  scale: z.union([z.number(), vec3]).default(1),
  material: materialSchema,
  audio_reactive: z.boolean().default(false),
  animate: z
    .object({
      mode: z.enum(['bob', 'rotate', 'pulse']),
      speed: z.number().default(1.0),
      amplitude: z.number().default(0.1),
    })
    .optional(),
});

// ---------- escena raíz ----------

export const m13SceneSchema = z.object({
  version: z.string().default('0.1'),
  name: z.string(),
  description: z.string().optional(),
  bounds: vec3.default([5, 3, 5]),
  spawn: vec3.default([0, 0, -3.5]),
  ambient: ambientSchema.default({}),
  light: lightSchema.default({}),
  walls: surfaceSchema,
  floor: surfaceSchema,
  ceiling: surfaceSchema,
  window: z
    .object({
      position: vec3,
      size: vec3,
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
