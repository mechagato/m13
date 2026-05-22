import type { Vec3 } from '../types.js';

export interface FlyCameraOptions {
  initialPos?: Vec3;
  sensitivity?: number;
  speed?: number;
  bounds?: Vec3;
}

export interface CameraVectors {
  pos: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
}

export class FlyCamera {
  pos: [number, number, number];
  yaw = 0;
  pitch = 0;
  private locked = false;
  private input = {
    forward: false,
    back: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };
  private sensitivity: number;
  private speed: number;
  private bounds: Vec3;
  private canvas: HTMLCanvasElement;
  private listeners: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, opts: FlyCameraOptions = {}) {
    this.canvas = canvas;
    this.pos = [...(opts.initialPos ?? [0, 0, -3.5])];
    this.sensitivity = opts.sensitivity ?? 0.0025;
    this.speed = opts.speed ?? 2.5;
    this.bounds = opts.bounds ?? [4.5, 2.7, 4.5];
    this.attach();
  }

  setBounds(bounds: Vec3): void {
    this.bounds = bounds;
  }

  setPosition(pos: Vec3): void {
    this.pos = [...pos];
  }

  reset(pos: Vec3 = [0, 0, -3.5]): void {
    this.pos = [...pos];
    this.yaw = 0;
    this.pitch = 0;
  }

  isLocked(): boolean {
    return this.locked;
  }

  private attach(): void {
    const onClick = async (): Promise<void> => {
      try {
        await this.canvas.requestPointerLock();
      } catch {
        // ignore
      }
    };
    const onLockChange = (): void => {
      this.locked = document.pointerLockElement === this.canvas;
    };
    const onMouseMove = (e: MouseEvent): void => {
      if (!this.locked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      const lim = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      switch (e.code) {
        case 'KeyW': this.input.forward = true; break;
        case 'KeyS': this.input.back = true; break;
        case 'KeyA': this.input.left = true; break;
        case 'KeyD': this.input.right = true; break;
        case 'Space': this.input.up = true; e.preventDefault(); break;
        case 'ShiftLeft':
        case 'ShiftRight': this.input.down = true; break;
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      switch (e.code) {
        case 'KeyW': this.input.forward = false; break;
        case 'KeyS': this.input.back = false; break;
        case 'KeyA': this.input.left = false; break;
        case 'KeyD': this.input.right = false; break;
        case 'Space': this.input.up = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.input.down = false; break;
      }
    };
    this.canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    this.listeners.push(() => this.canvas.removeEventListener('click', onClick));
    this.listeners.push(() => document.removeEventListener('pointerlockchange', onLockChange));
    this.listeners.push(() => document.removeEventListener('mousemove', onMouseMove));
    this.listeners.push(() => document.removeEventListener('keydown', onKeyDown));
    this.listeners.push(() => document.removeEventListener('keyup', onKeyUp));
  }

  detach(): void {
    for (const fn of this.listeners) fn();
    this.listeners = [];
  }

  update(dt: number): CameraVectors {
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const fwd: Vec3 = [sy * cp, sp, -cy * cp];
    const right: Vec3 = [cy, 0, sy];
    const up: Vec3 = [
      right[1] * fwd[2] - right[2] * fwd[1],
      right[2] * fwd[0] - right[0] * fwd[2],
      right[0] * fwd[1] - right[1] * fwd[0],
    ];
    const v = this.speed * dt;
    if (this.input.forward) {
      this.pos[0] += fwd[0] * v;
      this.pos[1] += fwd[1] * v;
      this.pos[2] += fwd[2] * v;
    }
    if (this.input.back) {
      this.pos[0] -= fwd[0] * v;
      this.pos[1] -= fwd[1] * v;
      this.pos[2] -= fwd[2] * v;
    }
    if (this.input.right) {
      this.pos[0] += right[0] * v;
      this.pos[2] += right[2] * v;
    }
    if (this.input.left) {
      this.pos[0] -= right[0] * v;
      this.pos[2] -= right[2] * v;
    }
    if (this.input.up) this.pos[1] += v;
    if (this.input.down) this.pos[1] -= v;
    const [bx, by, bz] = this.bounds;
    this.pos[0] = Math.max(-bx, Math.min(bx, this.pos[0]));
    this.pos[1] = Math.max(-by, Math.min(by, this.pos[1]));
    this.pos[2] = Math.max(-bz, Math.min(bz, this.pos[2]));
    return { pos: [this.pos[0], this.pos[1], this.pos[2]], forward: fwd, right, up };
  }
}
