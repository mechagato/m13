/**
 * Shared types used across the runtime.
 */

export type Vec3 = readonly [number, number, number];

export interface FrameStats {
  fps: number;
  ms: number;
  frameCount: number;
  cameraPos: Vec3;
  audioAmplitude: number;
}
