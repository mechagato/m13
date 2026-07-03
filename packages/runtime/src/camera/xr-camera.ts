import type { Vec3 } from '../types.js';
import type { CameraVectors } from './fly-camera.js';

/**
 * XRCameraController (Fase 5) — la cámara en VR ES el visor.
 *
 * El "rig" es la posición/orientación del JUGADOR en el mundo (locomoción): el stick
 * izquierdo lo mueve en el plano, el derecho hace snap-turn (anti-mareo). La pose real
 * de cada ojo viene del headset (XRView.transform); la cámara del ojo en world =
 * rig ∘ viewTransform. El raymarcher no cambia: recibe camPos/camDir/camRight/camUp
 * de ESTE ojo (camRight/camUp escalados por el fov del ojo) vía writeUniforms.
 *
 * Determinista y sin DOM: toda la matemática es pura y testeable sin GPU ni headset.
 */

/** Entrada de locomoción de un frame (extraída de XRInputSource.gamepad por el engine). */
export interface XRLocomotionInput {
  /** Stick de movimiento [x, y] en [-1,1] (mano izquierda). y>0 = adelante. */
  move: [number, number];
  /** Stick de giro X en [-1,1] (mano derecha). Snap-turn al cruzar el umbral. */
  turn: number;
}

/** Multiplica dos mat4 column-major (a * b). */
export function mat4mul(a: Float32Array | number[], b: Float32Array | number[]): number[] {
  const out = new Array<number>(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[0 * 4 + r]! * b[c * 4 + 0]! +
        a[1 * 4 + r]! * b[c * 4 + 1]! +
        a[2 * 4 + r]! * b[c * 4 + 2]! +
        a[3 * 4 + r]! * b[c * 4 + 3]!;
    }
  }
  return out;
}

/** tan(fovY/2) desde una matriz de proyección column-major: proj[1][1] = 1/tan(fovY/2). */
export function fovScaleFromProjection(proj: Float32Array | number[]): number {
  const p11 = proj[5]!; // fila 1, col 1 (column-major índice 5)
  return p11 !== 0 ? 1 / Math.abs(p11) : 1;
}

const SNAP_ANGLE = (30 * Math.PI) / 180; // snap-turn de 30°
const SNAP_THRESHOLD = 0.7;
const DEADZONE = 0.15;

export class XRCameraController {
  /** Posición world del rig (jugador). Arranca en el spawn de la escena. Mutable interno. */
  private rigPos: [number, number, number];
  /** Yaw acumulado del rig (rad), por snap-turn. */
  private rigYaw = 0;
  private snapArmed = true; // evita snaps repetidos hasta soltar el stick
  private speed: number;

  constructor(spawn: Vec3, speed = 2.5) {
    this.rigPos = [spawn[0], spawn[1], spawn[2]];
    this.speed = speed;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  reset(spawn: Vec3): void {
    this.rigPos = [spawn[0], spawn[1], spawn[2]];
    this.rigYaw = 0;
    this.snapArmed = true;
  }

  getRigPos(): Vec3 {
    return [this.rigPos[0], this.rigPos[1], this.rigPos[2]];
  }
  getRigYaw(): number {
    return this.rigYaw;
  }

  /** Avanza el rig con la locomoción del frame. dt en segundos. */
  updateRig(dt: number, input: XRLocomotionInput): void {
    // Snap-turn (mano derecha): un giro discreto por cruce de umbral.
    const t = input.turn;
    if (Math.abs(t) > SNAP_THRESHOLD) {
      if (this.snapArmed) {
        this.rigYaw -= Math.sign(t) * SNAP_ANGLE;
        this.snapArmed = false;
      }
    } else if (Math.abs(t) < DEADZONE) {
      this.snapArmed = true;
    }

    // Smooth move (mano izquierda) en el plano, relativo al yaw del rig.
    const mx = Math.abs(input.move[0]) > DEADZONE ? input.move[0] : 0;
    const my = Math.abs(input.move[1]) > DEADZONE ? input.move[1] : 0;
    if (mx !== 0 || my !== 0) {
      const cy = Math.cos(this.rigYaw);
      const sy = Math.sin(this.rigYaw);
      // adelante del rig = -Z rotado por yaw; derecha = +X rotado por yaw
      const fwd: [number, number] = [sy, -cy]; // (x,z) de "adelante"
      const right: [number, number] = [cy, sy]; // (x,z) de "derecha"
      const v = this.speed * dt;
      this.rigPos[0] += (fwd[0] * my + right[0] * mx) * v;
      this.rigPos[2] += (fwd[1] * my + right[1] * mx) * v;
    }
  }

  /** Matriz del rig (yaw + traslación), column-major. */
  rigMatrix(): number[] {
    const c = Math.cos(this.rigYaw);
    const s = Math.sin(this.rigYaw);
    // Rotación Y * traslación (column-major)
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, this.rigPos[0], this.rigPos[1], this.rigPos[2], 1];
  }

  /**
   * Base cámara world de un ojo: rig ∘ viewTransform. `viewMatrix` es
   * XRView.transform.matrix (ojo→reference space, column-major); `proj` es
   * XRView.projectionMatrix. camRight/camUp se escalan por tan(fovY/2) del ojo
   * (fov simétrico aproximado — la asimetría del frustum XR es leve y se documenta).
   */
  eyeVectors(viewMatrix: Float32Array | number[], proj: Float32Array | number[]): CameraVectors {
    const m = mat4mul(this.rigMatrix(), viewMatrix);
    const pos: Vec3 = [m[12]!, m[13]!, m[14]!];
    const right: Vec3 = [m[0]!, m[1]!, m[2]!];
    const up: Vec3 = [m[4]!, m[5]!, m[6]!];
    // WebXR: el ojo mira hacia -Z de su transform.
    const forward: Vec3 = [-m[8]!, -m[9]!, -m[10]!];
    const f = fovScaleFromProjection(proj);
    return {
      pos,
      forward,
      right: [right[0] * f, right[1] * f, right[2] * f],
      up: [up[0] * f, up[1] * f, up[2] * f],
    };
  }

  /** Compat con la interfaz de cámara — en XR el input es frame-driven, no hay listeners. */
  detach(): void {
    /* sin listeners que quitar */
  }
}
