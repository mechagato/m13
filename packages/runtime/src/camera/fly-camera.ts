import type { Vec3 } from '../types.js';

export interface FlyCameraOptions {
  initialPos?: Vec3;
  sensitivity?: number;
  speed?: number;
  bounds?: Vec3;
  /**
   * Habilita requestPointerLock al hacer click en el canvas.
   * Default: auto — solo en dispositivos con puntero fino + hover (desktop).
   * En touch/Quest el lock rompe la UX (no hay teclado para moverse);
   * ahí mandan los controles de arrastre (D-2109).
   */
  pointerLock?: boolean;
}

export interface CameraVectors {
  pos: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
}

/** Vectores de camara desde una pose serializable; replay los usa sin consultar input. */
export function cameraVectorsFromPose(pos: Vec3, yaw: number, pitch: number): CameraVectors {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const forward: Vec3 = [sy * cp, sp, -cy * cp];
  const right: Vec3 = [cy, 0, sy];
  const up: Vec3 = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  return { pos: [pos[0], pos[1], pos[2]], forward, right, up };
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
  private pointerLockEnabled: boolean;
  // Controles de arrastre (touch / Quest / mouse sin lock) — D-2109:
  // lado izquierdo del canvas = joystick de movimiento, lado derecho = mirar.
  private touchMove: [number, number] = [0, 0]; // [strafe, forward] en -1..1
  private lookId: number | null = null;
  private moveId: number | null = null;
  private lookLast: [number, number] = [0, 0];
  private moveStart: [number, number] = [0, 0];

  constructor(canvas: HTMLCanvasElement, opts: FlyCameraOptions = {}) {
    this.canvas = canvas;
    this.pos = [...(opts.initialPos ?? [0, 0, -3.5])];
    this.sensitivity = opts.sensitivity ?? 0.0025;
    this.speed = opts.speed ?? 2.5;
    this.bounds = opts.bounds ?? [4.5, 2.7, 4.5];
    this.pointerLockEnabled =
      opts.pointerLock ??
      (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    this.attach();
  }

  setBounds(bounds: Vec3): void {
    this.bounds = bounds;
  }

  /** Velocidad de desplazamiento en m/s (T-231: `cameraSpeed` de la escena). */
  setSpeed(speed: number): void {
    this.speed = speed;
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
      if (!this.pointerLockEnabled) return;
      try {
        await this.canvas.requestPointerLock();
      } catch {
        // ignore
      }
    };
    const resetInput = (): void => {
      this.input.forward = false;
      this.input.back = false;
      this.input.left = false;
      this.input.right = false;
      this.input.up = false;
      this.input.down = false;
      this.touchMove = [0, 0];
    };
    const onLockChange = (): void => {
      this.locked = document.pointerLockElement === this.canvas;
      // Al salir del lock (Esc, prompt del navegador como "Instalar app", alt-tab) los
      // 'keyup' se pierden y la tecla queda "pegada" → la cámara avanza sola. Reset defensivo.
      if (!this.locked) resetInput();
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
    // --- Controles de arrastre sin pointer lock (touch, Quest, mouse) ---
    const lim = Math.PI / 2 - 0.05;
    const onPointerDown = (e: PointerEvent): void => {
      if (this.locked) return; // el modo lock es dueño del input
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const isLeftHalf = e.clientX - rect.left < rect.width / 2;
      // Touch en mitad izquierda = joystick de movimiento; todo lo demás = mirar.
      if (e.pointerType === 'touch' && isLeftHalf && this.moveId === null) {
        this.moveId = e.pointerId;
        this.moveStart = [e.clientX, e.clientY];
      } else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.lookLast = [e.clientX, e.clientY];
      } else {
        return;
      }
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (e.pointerId === this.moveId) {
        // 70px de arrastre = velocidad máxima
        const clamp1 = (n: number): number => Math.max(-1, Math.min(1, n));
        this.touchMove = [
          clamp1((e.clientX - this.moveStart[0]) / 70),
          clamp1(-(e.clientY - this.moveStart[1]) / 70),
        ];
      } else if (e.pointerId === this.lookId) {
        const dx = e.clientX - this.lookLast[0];
        const dy = e.clientY - this.lookLast[1];
        this.lookLast = [e.clientX, e.clientY];
        // El arrastre absoluto necesita más ganancia que el delta relativo del lock
        const s = this.sensitivity * 2.2;
        this.yaw -= dx * s;
        this.pitch = Math.max(-lim, Math.min(lim, this.pitch - dy * s));
      }
    };
    const onPointerEnd = (e: PointerEvent): void => {
      if (e.pointerId === this.moveId) {
        this.moveId = null;
        this.touchMove = [0, 0];
      } else if (e.pointerId === this.lookId) {
        this.lookId = null;
      }
    };

    this.canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    this.canvas.addEventListener('pointerdown', onPointerDown);
    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerup', onPointerEnd);
    this.canvas.addEventListener('pointercancel', onPointerEnd);
    // Perder foco de la ventana (alt-tab, prompt del navegador) también pierde los keyup.
    window.addEventListener('blur', resetInput);
    this.listeners.push(() => this.canvas.removeEventListener('click', onClick));
    this.listeners.push(() => window.removeEventListener('blur', resetInput));
    this.listeners.push(() => document.removeEventListener('pointerlockchange', onLockChange));
    this.listeners.push(() => document.removeEventListener('mousemove', onMouseMove));
    this.listeners.push(() => document.removeEventListener('keydown', onKeyDown));
    this.listeners.push(() => document.removeEventListener('keyup', onKeyUp));
    this.listeners.push(() => this.canvas.removeEventListener('pointerdown', onPointerDown));
    this.listeners.push(() => this.canvas.removeEventListener('pointermove', onPointerMove));
    this.listeners.push(() => this.canvas.removeEventListener('pointerup', onPointerEnd));
    this.listeners.push(() => this.canvas.removeEventListener('pointercancel', onPointerEnd));
  }

  detach(): void {
    for (const fn of this.listeners) fn();
    this.listeners = [];
  }

  /** Lee el primer gamepad activo (Quest controllers / Xbox): stick izq = moverse,
   *  stick der = mirar. Deadzone 0.15. No-op si no hay gamepads (D-2111). */
  private pollGamepad(dt: number): [number, number] {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return [0, 0];
    for (const gp of navigator.getGamepads()) {
      if (!gp || gp.axes.length < 4) continue;
      const dz = (v: number): number => (Math.abs(v) > 0.15 ? v : 0);
      const lookX = dz(gp.axes[2] ?? 0);
      const lookY = dz(gp.axes[3] ?? 0);
      if (lookX !== 0 || lookY !== 0) {
        const lim = Math.PI / 2 - 0.05;
        this.yaw -= lookX * 2.2 * dt;
        this.pitch = Math.max(-lim, Math.min(lim, this.pitch - lookY * 1.6 * dt));
      }
      return [dz(gp.axes[0] ?? 0), -dz(gp.axes[1] ?? 0)];
    }
    return [0, 0];
  }

  update(dt: number): CameraVectors {
    const gamepadMove = this.pollGamepad(dt);
    const vectors = cameraVectorsFromPose(this.pos, this.yaw, this.pitch);
    const { forward: fwd, right } = vectors;
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
    // Joystick táctil (D-2109) + stick izquierdo del gamepad (D-2111):
    // [strafe, forward] proporcional
    const tx = this.touchMove[0] + gamepadMove[0];
    const tz = this.touchMove[1] + gamepadMove[1];
    if (tx !== 0 || tz !== 0) {
      this.pos[0] += (fwd[0] * tz + right[0] * tx) * v;
      this.pos[1] += fwd[1] * tz * v;
      this.pos[2] += (fwd[2] * tz + right[2] * tx) * v;
    }
    const [bx, by, bz] = this.bounds;
    this.pos[0] = Math.max(-bx, Math.min(bx, this.pos[0]));
    this.pos[1] = Math.max(-by, Math.min(by, this.pos[1]));
    this.pos[2] = Math.max(-bz, Math.min(bz, this.pos[2]));
    return cameraVectorsFromPose(this.pos, this.yaw, this.pitch);
  }
}
