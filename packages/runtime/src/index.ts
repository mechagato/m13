/**
 * @m13/runtime — public API
 *
 * Local-first world synthesis engine for WebGPU.
 * Loads .m13 semantic scene descriptors and renders them as continuous
 * SDF-based 3D environments with procedural materials.
 */

export { M13Engine } from './engine.js';
export type { M13EngineOptions, SceneLoadInfo } from './engine.js';

export { writeMatParams, destroyRenderer } from './renderer/index.js';

export { parseScene, validateScene, SUPPORTED_VERSION } from './parser/index.js';
export type { ParseOptions } from './parser/index.js';
export type { M13Scene, M13Object, M13Material, M13Light } from './parser/schema.js';

export { compileScene, hashWgsl } from './compiler/index.js';
export type { CompiledScene, MatParamSlot, MatParamsLayout } from './compiler/index.js';

export { FlyCamera } from './camera/fly-camera.js';
export type { FlyCameraOptions } from './camera/fly-camera.js';

export { MicAudioInput } from './audio/mic-input.js';

export type { Vec3, FrameStats } from './types.js';

export const VERSION = '0.1.0';
