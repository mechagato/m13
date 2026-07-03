import { describe, it, expect } from 'vitest';
import {
  XRCameraController,
  mat4mul,
  fovScaleFromProjection,
} from '../xr-camera.js';

/**
 * Tests de la matemática de la cámara XR (Fase 5) — pura, sin headset ni GPU.
 * Fija: composición de matrices, extracción del fov, locomoción del rig
 * (smooth-move + snap-turn) y la base cámara por ojo (rig ∘ viewTransform).
 */

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps;

describe('XR camera — matemática (Fase 5)', () => {
  it('mat4mul: identidad es neutro', () => {
    const M = [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 5, 6, 7, 1];
    expect(mat4mul(IDENT, M)).toEqual(M);
    expect(mat4mul(M, IDENT)).toEqual(M);
  });

  it('mat4mul: traslación compone (t2∘t1 suma las traslaciones)', () => {
    const t1 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1];
    const t2 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 30, 1];
    const r = mat4mul(t2, t1);
    expect(r[12]).toBe(11);
    expect(r[13]).toBe(22);
    expect(r[14]).toBe(33);
  });

  it('fovScaleFromProjection: p[1][1]=2 → tan(fovY/2)=0.5', () => {
    const proj = [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0];
    expect(fovScaleFromProjection(proj)).toBeCloseTo(0.5, 6);
  });

  it('eyeVectors: rig y view identidad → cámara canónica (mira -Z)', () => {
    const xr = new XRCameraController([0, 0, 0], 2.5);
    const proj = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0]; // fovScale=1
    const cam = xr.eyeVectors(IDENT, proj);
    expect(cam.pos).toEqual([0, 0, 0]);
    // normalizar -0 → 0 para la comparación
    const norm = (a: readonly number[]): number[] => a.map((v) => Math.round(v) + 0);
    expect(norm(cam.forward)).toEqual([0, 0, -1]);
    expect(norm(cam.right)).toEqual([1, 0, 0]);
    expect(norm(cam.up)).toEqual([0, 1, 0]);
  });

  it('eyeVectors: el offset del ojo (IPD) desplaza camPos lateralmente', () => {
    const xr = new XRCameraController([0, 0, 0], 2.5);
    const proj = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0];
    // viewMatrix del ojo izquierdo: trasladado -0.03m en X (media IPD)
    const leftEye = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -0.03, 0, 0, 1];
    const rightEye = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.03, 0, 0, 1];
    expect(xr.eyeVectors(leftEye, proj).pos[0]).toBeCloseTo(-0.03, 6);
    expect(xr.eyeVectors(rightEye, proj).pos[0]).toBeCloseTo(0.03, 6);
  });

  it('eyeVectors: la altura del rig se suma a camPos.y', () => {
    const xr = new XRCameraController([1, -20, 5], 2.5);
    const proj = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0];
    const cam = xr.eyeVectors(IDENT, proj);
    expect(cam.pos).toEqual([1, -20, 5]);
  });

  it('eyeVectors: camRight/camUp escalan por el fov del ojo (tan(fovY/2))', () => {
    const xr = new XRCameraController([0, 0, 0], 2.5);
    const proj = [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0]; // fovScale=0.5
    const cam = xr.eyeVectors(IDENT, proj);
    expect(near(cam.right[0]!, 0.5)).toBe(true);
    expect(near(cam.up[1]!, 0.5)).toBe(true);
    // forward queda unitario (dirección, no escala)
    expect(near(cam.forward[2]!, -1)).toBe(true);
  });

  it('locomoción: smooth-move adelante avanza el rig hacia -Z con yaw=0', () => {
    const xr = new XRCameraController([0, -20, 0], 2.0);
    xr.updateRig(1.0, { move: [0, 1], turn: 0 }); // stick adelante 1s
    const p = xr.getRigPos();
    expect(p[2]).toBeCloseTo(-2.0, 5); // 2 m/s * 1s hacia -Z
    expect(p[0]).toBeCloseTo(0, 5);
    expect(p[1]).toBe(-20); // la altura no cambia con locomoción plana
  });

  it('locomoción: deadzone ignora movimientos pequeños', () => {
    const xr = new XRCameraController([0, 0, 0], 2.0);
    xr.updateRig(1.0, { move: [0.1, 0.1], turn: 0 }); // < deadzone 0.15
    expect(xr.getRigPos()).toEqual([0, 0, 0]);
  });

  it('snap-turn: un cruce de umbral = un giro de 30°, no se repite hasta soltar', () => {
    const xr = new XRCameraController([0, 0, 0], 2.0);
    const y0 = xr.getRigYaw();
    xr.updateRig(0.016, { move: [0, 0], turn: 1.0 }); // cruza umbral
    const y1 = xr.getRigYaw();
    expect(Math.abs(y1 - y0)).toBeCloseTo((30 * Math.PI) / 180, 6);
    // manteniendo el stick: NO gira de nuevo
    xr.updateRig(0.016, { move: [0, 0], turn: 1.0 });
    expect(xr.getRigYaw()).toBeCloseTo(y1, 6);
    // soltar (vuelve a deadzone) rearma
    xr.updateRig(0.016, { move: [0, 0], turn: 0.0 });
    xr.updateRig(0.016, { move: [0, 0], turn: 1.0 });
    expect(Math.abs(xr.getRigYaw() - y1)).toBeCloseTo((30 * Math.PI) / 180, 6);
  });

  it('reset restaura rig al spawn', () => {
    const xr = new XRCameraController([0, 0, 0], 2.0);
    xr.updateRig(1.0, { move: [1, 1], turn: 1.0 });
    xr.reset([3, -5, 9]);
    expect(xr.getRigPos()).toEqual([3, -5, 9]);
    expect(xr.getRigYaw()).toBe(0);
  });
});
