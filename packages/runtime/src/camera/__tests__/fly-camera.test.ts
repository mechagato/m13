import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlyCamera } from '../fly-camera.js';

/**
 * Tests de la lógica pura de FlyCamera (deuda de cobertura señalada en auditoría).
 *
 * Estrategia: el entorno de Vitest es node (sin jsdom), así que se stubbean
 * `document`, `window` y `navigator` con vi.stubGlobal, y el canvas es un fake
 * con bag de listeners. El input de teclado/pointer se despacha por los handlers
 * REALES que registra attach() — no se toca estado privado de la instancia.
 *
 * Trigonometría verificada contra update():
 *   fwd  = [sin(yaw)·cos(pitch), sin(pitch), -cos(yaw)·cos(pitch)]
 *   → yaw=0   ⇒ fwd = [0, 0, -1]
 *   → yaw=π/2 ⇒ fwd = [1, 0,  0]
 */

type Listener = (e: unknown) => void;

/** Target de eventos mínimo: registra listeners y permite despacharlos. */
function makeEventTarget() {
  const bag = new Map<string, Set<Listener>>();
  return {
    addEventListener: vi.fn((type: string, fn: Listener) => {
      if (!bag.has(type)) bag.set(type, new Set());
      bag.get(type)!.add(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: Listener) => {
      bag.get(type)?.delete(fn);
    }),
    dispatch(type: string, e: unknown): void {
      for (const fn of bag.get(type) ?? []) fn(e);
    },
  };
}

type FakeTarget = ReturnType<typeof makeEventTarget>;

/** Canvas fake: listeners + getBoundingClientRect + setPointerCapture no-op. */
function makeFakeCanvas() {
  const target = makeEventTarget();
  return {
    ...target,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    setPointerCapture: vi.fn(),
    requestPointerLock: vi.fn(),
  };
}

type FakeCanvas = ReturnType<typeof makeFakeCanvas>;

let fakeDocument: FakeTarget & { pointerLockElement: unknown };
let fakeWindow: FakeTarget & { matchMedia: (q: string) => { matches: boolean } };
let canvas: FakeCanvas;

/** Simula presionar/soltar una tecla vía los handlers reales de document. */
const keyDown = (code: string): void =>
  fakeDocument.dispatch('keydown', { code, preventDefault: () => {} });
const keyUp = (code: string): void =>
  fakeDocument.dispatch('keyup', { code, preventDefault: () => {} });

function makeCamera(opts: ConstructorParameters<typeof FlyCamera>[1] = {}): FlyCamera {
  return new FlyCamera(canvas as unknown as HTMLCanvasElement, opts);
}

beforeEach(() => {
  fakeDocument = { ...makeEventTarget(), pointerLockElement: null };
  fakeWindow = { ...makeEventTarget(), matchMedia: () => ({ matches: false }) };
  canvas = makeFakeCanvas();
  vi.stubGlobal('document', fakeDocument);
  vi.stubGlobal('window', fakeWindow);
  // Sin getGamepads → pollGamepad es no-op determinista (D-2111).
  vi.stubGlobal('navigator', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FlyCamera — lógica pura de update()', () => {
  it('forward con yaw=0 mueve pos en -z (fwd = [0, 0, -1])', () => {
    const cam = makeCamera({ initialPos: [0, 0, 0] });
    keyDown('KeyW');
    const { forward } = cam.update(0.1);

    expect(forward[0]).toBeCloseTo(0, 6);
    expect(forward[1]).toBeCloseTo(0, 6);
    expect(forward[2]).toBeCloseTo(-1, 6);
    // speed default 2.5 · dt 0.1 = 0.25 en -z
    expect(cam.pos[0]).toBeCloseTo(0, 6);
    expect(cam.pos[1]).toBeCloseTo(0, 6);
    expect(cam.pos[2]).toBeCloseTo(-0.25, 6);
  });

  it('yaw=π/2 → forward apunta a +x y el movimiento forward va en +x', () => {
    const cam = makeCamera({ initialPos: [0, 0, 0] });
    cam.yaw = Math.PI / 2;
    keyDown('KeyW');
    const { forward } = cam.update(0.1);

    expect(forward[0]).toBeCloseTo(1, 6);
    expect(forward[1]).toBeCloseTo(0, 6);
    expect(forward[2]).toBeCloseTo(0, 6);
    expect(cam.pos[0]).toBeCloseTo(0.25, 6);
    expect(cam.pos[2]).toBeCloseTo(0, 6);
  });

  it('clamp de bounds: pos nunca sale de ±bounds tras updates grandes', () => {
    const cam = makeCamera({ initialPos: [0, 0, 0] });
    const bounds = [4.5, 2.7, 4.5]; // defaults del constructor

    keyDown('KeyW'); // -z
    keyDown('KeyD'); // +x
    keyDown('Space'); // +y
    for (let i = 0; i < 5; i++) cam.update(1000);

    expect(Math.abs(cam.pos[0])).toBeLessThanOrEqual(bounds[0]);
    expect(Math.abs(cam.pos[1])).toBeLessThanOrEqual(bounds[1]);
    expect(Math.abs(cam.pos[2])).toBeLessThanOrEqual(bounds[2]);
    // Con dt gigante debe quedar pegado exactamente al límite.
    expect(cam.pos[0]).toBeCloseTo(4.5, 6);
    expect(cam.pos[1]).toBeCloseTo(2.7, 6);
    expect(cam.pos[2]).toBeCloseTo(-4.5, 6);
  });

  it('setSpeed escala la distancia recorrida proporcionalmente', () => {
    const cam = makeCamera({ initialPos: [0, 0, 0], speed: 2.5 });
    keyDown('KeyW');

    cam.update(0.1);
    const d1 = Math.abs(cam.pos[2]); // 2.5 · 0.1 = 0.25

    cam.reset([0, 0, 0]); // reset no limpia input — la tecla sigue presionada
    cam.setSpeed(5);
    cam.update(0.1);
    const d2 = Math.abs(cam.pos[2]); // 5 · 0.1 = 0.5

    expect(d1).toBeCloseTo(0.25, 6);
    expect(d2).toBeCloseTo(0.5, 6);
    expect(d2).toBeCloseTo(d1 * 2, 6);
  });

  it('reset() restaura pos, yaw y pitch', () => {
    const cam = makeCamera({ initialPos: [1, 1, 1] });
    cam.yaw = 1.2;
    cam.pitch = 0.4;
    keyDown('KeyW');
    cam.update(0.5);
    keyUp('KeyW');

    cam.reset(); // default [0, 0, -3.5]
    expect(cam.pos).toEqual([0, 0, -3.5]);
    expect(cam.yaw).toBe(0);
    expect(cam.pitch).toBe(0);

    cam.reset([1, 2, 3]);
    expect(cam.pos).toEqual([1, 2, 3]);
  });

  it('setBounds actualiza el clamp', () => {
    const cam = makeCamera({ initialPos: [0, 0, 0] });
    cam.setBounds([1, 1, 1]);

    keyDown('KeyW');
    keyDown('Space');
    cam.update(1000);

    expect(cam.pos[1]).toBeCloseTo(1, 6);
    expect(cam.pos[2]).toBeCloseTo(-1, 6);
    expect(Math.abs(cam.pos[0])).toBeLessThanOrEqual(1);
  });

  it('pitch nunca excede ±(π/2 - 0.05) con arrastre de pointer extremo', () => {
    const cam = makeCamera({ initialPos: [0, 0, 0], pointerLock: false });
    const lim = Math.PI / 2 - 0.05;

    // Arrastre con mouse (sin lock) — ruta "mirar" de D-2109.
    canvas.dispatch('pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    // dy positivo gigante → pitch hacia -lim
    canvas.dispatch('pointermove', { pointerId: 1, clientX: 400, clientY: 300 + 1e6 });
    expect(cam.pitch).toBeCloseTo(-lim, 6);
    expect(Math.abs(cam.pitch)).toBeLessThanOrEqual(lim);

    // dy negativo gigante → pitch hacia +lim
    canvas.dispatch('pointermove', { pointerId: 1, clientX: 400, clientY: 300 - 1e6 });
    expect(cam.pitch).toBeCloseTo(lim, 6);
    expect(Math.abs(cam.pitch)).toBeLessThanOrEqual(lim);
  });

  it('detach() remueve todos los listeners registrados', () => {
    const cam = makeCamera();
    const registered =
      fakeDocument.addEventListener.mock.calls.length +
      fakeWindow.addEventListener.mock.calls.length +
      canvas.addEventListener.mock.calls.length;

    cam.detach();

    const removed =
      fakeDocument.removeEventListener.mock.calls.length +
      fakeWindow.removeEventListener.mock.calls.length +
      canvas.removeEventListener.mock.calls.length;
    expect(removed).toBe(registered);
  });
});
