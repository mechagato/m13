import type { Vec3 } from '../types.js';

export const M13_REPLAY_VERSION = 'm13replay-1';
export const DEFAULT_REPLAY_HZ = 15;

export interface CameraPose {
  pos: Vec3;
  yaw: number;
  pitch: number;
}

export interface M13Replay {
  version: typeof M13_REPLAY_VERSION;
  /** Hash del WGSL: evita reproducir un paseo sobre una escena distinta. */
  sceneHash: string;
  /** Frames compactos: [segundos, x, y, z, yaw, pitch]. */
  frames: Array<[number, number, number, number, number, number]>;
}

/**
 * Registro/reproduccion determinista de camara 2D. El tiempo lo aporta el
 * engine; este modulo no lee reloj, DOM ni input y por eso es testeable puro.
 */
export class RecordController {
  private recording = false;
  private sceneHash = '';
  private sampleInterval = 1 / DEFAULT_REPLAY_HZ;
  private recordStart: number | null = null;
  private lastSample = -Infinity;
  private frames: M13Replay['frames'] = [];
  private replay: M13Replay | null = null;

  startRecording(sceneHash: string, sampleHz = DEFAULT_REPLAY_HZ): void {
    if (!Number.isFinite(sampleHz) || sampleHz <= 0 || sampleHz > 60) {
      throw new Error('[m13/replay] sampleHz debe estar entre 0 y 60.');
    }
    this.recording = true;
    this.sceneHash = sceneHash;
    this.sampleInterval = 1 / sampleHz;
    this.recordStart = null;
    this.lastSample = -Infinity;
    this.frames = [];
  }

  stopRecording(): M13Replay {
    this.recording = false;
    if (this.frames.length === 0) throw new Error('[m13/replay] No hay frames grabados.');
    return { version: M13_REPLAY_VERSION, sceneHash: this.sceneHash, frames: [...this.frames] };
  }

  record(time: number, pose: CameraPose): void {
    if (!this.recording) return;
    if (!Number.isFinite(time) || !isFinitePose(pose)) {
      throw new Error('[m13/replay] Frame de grabacion invalido.');
    }
    if (this.recordStart === null) this.recordStart = time;
    const localTime = time - this.recordStart;
    if (this.frames.length > 0 && localTime - this.lastSample < this.sampleInterval - 1e-9) return;
    const sampledTime = roundReplayValue(localTime);
    this.frames.push([
      sampledTime,
      roundReplayValue(pose.pos[0]),
      roundReplayValue(pose.pos[1]),
      roundReplayValue(pose.pos[2]),
      roundReplayValue(pose.yaw),
      roundReplayValue(pose.pitch),
    ]);
    this.lastSample = localTime;
  }

  export(): string {
    const replay = this.stopRecording();
    return JSON.stringify(replay);
  }

  load(serialized: string, expectedSceneHash?: string): M13Replay {
    let raw: unknown;
    try {
      raw = JSON.parse(serialized);
    } catch {
      throw new Error('[m13/replay] JSON invalido.');
    }
    const replay = validateReplay(raw);
    if (expectedSceneHash !== undefined && replay.sceneHash !== expectedSceneHash) {
      throw new Error('[m13/replay] El replay pertenece a otra escena (hash distinto).');
    }
    this.replay = replay;
    return replay;
  }

  clearReplay(): void {
    this.replay = null;
  }

  replayAt(time: number): CameraPose | null {
    if (!this.replay || !Number.isFinite(time)) return null;
    return interpolateReplayPose(this.replay.frames, Math.max(0, time));
  }
}

export function interpolateReplayPose(
  frames: M13Replay['frames'],
  time: number,
): CameraPose | null {
  if (frames.length === 0) return null;
  const first = frames[0];
  if (time <= first[0]) return poseFromFrame(first);
  const last = frames[frames.length - 1];
  if (time >= last[0]) return poseFromFrame(last);
  for (let i = 0; i < frames.length - 1; i += 1) {
    const a = frames[i];
    const b = frames[i + 1];
    if (time < a[0] || time > b[0]) continue;
    const t = (time - a[0]) / (b[0] - a[0]);
    return {
      pos: [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)],
      yaw: mixAngle(a[4], b[4], t),
      pitch: mix(a[5], b[5], t),
    };
  }
  return poseFromFrame(last);
}

function validateReplay(raw: unknown): M13Replay {
  if (!isObject(raw) || raw.version !== M13_REPLAY_VERSION || typeof raw.sceneHash !== 'string' || !Array.isArray(raw.frames)) {
    throw new Error('[m13/replay] Contrato .m13replay invalido.');
  }
  if (raw.frames.length === 0 || raw.frames.length > 36_000) {
    throw new Error('[m13/replay] El replay debe contener entre 1 y 36000 frames.');
  }
  let previousTime = -1;
  const frames = raw.frames.map((frame) => {
    if (!Array.isArray(frame) || frame.length !== 6 || !frame.every((v) => typeof v === 'number' && Number.isFinite(v))) {
      throw new Error('[m13/replay] Frame invalido.');
    }
    const typed = frame as [number, number, number, number, number, number];
    if (typed[0] < 0 || typed[0] <= previousTime) throw new Error('[m13/replay] Los frames deben estar ordenados por tiempo.');
    previousTime = typed[0];
    return [...typed] as [number, number, number, number, number, number];
  });
  return { version: M13_REPLAY_VERSION, sceneHash: raw.sceneHash, frames };
}

function poseFromFrame(frame: M13Replay['frames'][number]): CameraPose {
  return { pos: [frame[1], frame[2], frame[3]], yaw: frame[4], pitch: frame[5] };
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Evita residuos binarios en JSON sin perder precision perceptible de camara. */
function roundReplayValue(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Interpola por el arco corto para no girar casi 360 grados al cruzar -PI/PI. */
function mixAngle(a: number, b: number, t: number): number {
  const tau = Math.PI * 2;
  const delta = ((b - a + Math.PI) % tau + tau) % tau - Math.PI;
  return a + delta * t;
}

function isFinitePose(pose: CameraPose): boolean {
  return [...pose.pos, pose.yaw, pose.pitch].every(Number.isFinite);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
