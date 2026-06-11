import { parseScene } from './parser/index.js';
import type { M13Scene } from './parser/schema.js';
import { compileScene, hashWgsl, type CompiledScene } from './compiler/index.js';
import {
  initRenderer,
  renderFrame,
  writeUniforms,
  writeMatParams,
  destroyRenderer,
  type RendererState,
} from './renderer/index.js';
import { FlyCamera, type FlyCameraOptions } from './camera/fly-camera.js';
import { MicAudioInput } from './audio/mic-input.js';
import type { FrameStats, Vec3 } from './types.js';

export interface M13EngineOptions {
  /** Capa de pixel ratio (default: min(devicePixelRatio, 2)) */
  pixelRatio?: number;
  /** Callback opcional para stats de cada frame */
  onFrame?: (stats: FrameStats) => void;
  /**
   * Callback opcional cuando una excepción dentro del loop de render detiene
   * el motor. Sin esto, el error solo se loggea en consola con prefijo [m13/engine].
   */
  onError?: (e: Error) => void;
}

export interface SceneLoadInfo {
  /** Hash SHA-256 del WGSL compilado. Identidad de la escena renderizada. */
  wgslHash: string;
  /** true si el pipeline GPU se reutilizó (cache hit), false si se reconstruyó. */
  reusedPipeline: boolean;
}

/**
 * M13Engine — clase principal del motor.
 *
 * Uso típico:
 * ```ts
 * const engine = new M13Engine(canvas);
 * await engine.loadScene(yamlText);
 * engine.attachFlyCamera();
 * engine.start();
 * ```
 */
export class M13Engine {
  private canvas: HTMLCanvasElement;
  private opts: M13EngineOptions;
  private renderer: RendererState | null = null;
  private compiled: CompiledScene | null = null;
  private camera: FlyCamera | null = null;
  private audio: MicAudioInput | null = null;
  private running = false;
  private disposed = false;
  private rafId = 0;
  private lastTime = 0;
  private t0 = 0;
  private frameCount = 0;
  private fpsAccum = 0;
  private fpsCounter = 0;
  private fpsTimer = 0;
  private lastFps = 0;
  private lastMs = 0;
  /** Hash del WGSL del último shader cargado. null si no hay shader cargado. */
  private lastWgslHash: string | null = null;
  /** Info de la última operación loadScene (cache hit/miss + hash). */
  private lastLoadInfo: SceneLoadInfo | null = null;

  constructor(canvas: HTMLCanvasElement, opts: M13EngineOptions = {}) {
    this.canvas = canvas;
    this.opts = opts;
  }

  /**
   * Carga una escena desde un texto YAML (.m13). También acepta una URL absoluta o relativa.
   *
   * Aplica caché de pipeline GPU: si el WGSL del nuevo shader es idéntico al
   * último cargado (mismo hash SHA-256), se reutiliza el `RendererState` y se
   * evita `initRenderer` (que es el costo dominante de un re-load).
   */
  async loadScene(yamlOrUrl: string): Promise<M13Scene> {
    if (this.disposed) {
      throw new Error('[m13/engine] El engine ya fue liberado con dispose() — crea una nueva instancia.');
    }
    const text = looksLikeUrl(yamlOrUrl) ? await fetchText(yamlOrUrl) : yamlOrUrl;
    const scene = parseScene(text);
    const compiled = compileScene(scene);
    const newHash = await hashWgsl(compiled.wgsl);

    // dispose() pudo llegar mientras fetchText/hashWgsl estaban en vuelo.
    // Sin este guard, las asignaciones de abajo "revivirían" un engine disposed.
    if (this.disposed) {
      throw new Error('[m13/engine] dispose() llamado durante loadScene — operación cancelada.');
    }

    const cacheHit = this.renderer !== null && newHash === this.lastWgslHash;

    if (!cacheHit) {
      const newRenderer = await initRenderer(this.canvas, compiled);
      if (this.disposed) {
        // dispose() llegó mientras initRenderer creaba el device: liberarlo
        // de inmediato o queda un GPUDevice huérfano fuera del alcance de dispose().
        destroyRenderer(newRenderer);
        throw new Error('[m13/engine] dispose() llamado durante loadScene — recursos GPU liberados.');
      }
      // Cache-miss con renderer previo: destruir el anterior antes de reemplazarlo.
      // Sin esto, cada cambio de shader filtra un GPUDevice completo.
      if (this.renderer) {
        destroyRenderer(this.renderer);
      }
      this.renderer = newRenderer;
      this.lastWgslHash = newHash;
    } else if (this.renderer && compiled.matParams.totalFloats > 0) {
      // Cache hit del shader pero los VALORES de matParams pueden haber cambiado
      // (mismo concepto, params distintos → mismo WGSL, distinto Float32Array).
      // Sin esto, cambiar params no surte efecto cuando hay shader cache hit.
      writeMatParams(this.renderer, compiled.matParams.values);
    }

    this.compiled = compiled;
    this.lastLoadInfo = { wgslHash: newHash, reusedPipeline: cacheHit };

    if (this.camera) {
      this.camera.setBounds(boundsForCamera(scene.bounds));
      this.camera.reset(scene.spawn);
    }
    return scene;
  }

  /** Hash SHA-256 del WGSL actualmente cargado, o null si no hay escena. */
  getWgslHash(): string | null {
    return this.lastWgslHash;
  }

  /** Info de la última operación `loadScene`. Útil para diagnóstico y tests. */
  getLastLoadInfo(): SceneLoadInfo | null {
    return this.lastLoadInfo;
  }

  attachFlyCamera(opts: FlyCameraOptions = {}): FlyCamera {
    const scene = this.compiled?.scene;
    this.camera = new FlyCamera(this.canvas, {
      ...opts,
      initialPos: opts.initialPos ?? scene?.spawn,
      bounds: opts.bounds ?? (scene ? boundsForCamera(scene.bounds) : undefined),
    });
    return this.camera;
  }

  attachAudioInput(): MicAudioInput {
    this.audio = new MicAudioInput();
    return this.audio;
  }

  resize(): void {
    const dpr = this.opts.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
  }

  start(): void {
    if (this.disposed) {
      throw new Error('[m13/engine] El engine ya fue liberado con dispose() — crea una nueva instancia.');
    }
    if (this.running) return;
    if (!this.renderer || !this.compiled) {
      throw new Error('[m13/engine] start() llamado sin loadScene previo');
    }
    this.resize();
    this.running = true;
    this.t0 = performance.now();
    this.lastTime = this.t0;
    const loop = (now: number): void => {
      if (!this.running) return;
      // Una excepción en tick() NO debe matar el RAF loop en silencio:
      // detenemos el loop limpiamente, loggeamos y notificamos via onError.
      try {
        this.tick(now);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        this.stop();
        console.error('[m13/engine] excepción en el loop de render — motor detenido:', e);
        this.opts.onError?.(e);
        return;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelRaf(this.rafId);
  }

  /**
   * Libera todos los recursos GPU y deja el engine en estado no-usable.
   *
   * - Cancela el loop de render activo (requestAnimationFrame).
   * - Desacopla la FlyCamera (quita event listeners del canvas y document).
   * - Para el input de audio si estaba activo.
   * - Destruye device, context y buffers WebGPU vía destroyRenderer().
   * - Es idempotente: llamadas posteriores son no-op seguras.
   * - Tras dispose(), loadScene() y start() lanzan error claro.
   *
   * Caso de uso principal: regla "solo-un-ACTIVE" de FlowCAD — liberar la GPU
   * al hacer promote de un engine a otro, evitando el leak de device tras 2-3 ciclos.
   */
  dispose(): void {
    // Idempotente: segunda llamada es no-op.
    if (this.disposed) return;
    this.disposed = true;

    // Detener el loop de render primero para que el tick no acceda a recursos
    // ya destruidos si hay un frame en vuelo.
    this.running = false;
    cancelRaf(this.rafId);
    this.rafId = 0;

    // Desacoplar cámara — quita event listeners de canvas y document.
    if (this.camera) {
      this.camera.detach();
      this.camera = null;
    }

    // Detener audio (fire-and-forget; el stream de MediaDevices se cierra solo).
    if (this.audio) {
      void this.audio.stop();
      this.audio = null;
    }

    // Destruir recursos WebGPU.
    if (this.renderer) {
      destroyRenderer(this.renderer);
      this.renderer = null;
    }

    // Limpiar el estado de compilación para dejar al engine inerte.
    this.compiled = null;
    this.lastWgslHash = null;
    this.lastLoadInfo = null;
  }

  /** Devuelve true si dispose() ya fue llamado en este engine. */
  isDisposed(): boolean {
    return this.disposed;
  }

  private tick(now: number): void {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    const time = (now - this.t0) / 1000;
    this.frameCount++;
    this.fpsAccum += 1 / Math.max(dt, 0.0001);
    this.fpsCounter++;
    this.fpsTimer += dt;
    if (this.fpsTimer > 0.5) {
      this.lastFps = this.fpsAccum / this.fpsCounter;
      this.lastMs = 1000 / this.lastFps;
      this.fpsAccum = 0;
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    if (!this.renderer || !this.compiled) return;
    const scene = this.compiled.scene;

    const cam = this.camera
      ? this.camera.update(dt)
      : {
          pos: [...scene.spawn] as Vec3,
          forward: [0, 0, 1] as Vec3,
          right: [1, 0, 0] as Vec3,
          up: [0, 1, 0] as Vec3,
        };
    const amp = this.audio ? this.audio.sample() : 0;

    writeUniforms(this.renderer, {
      resolution: [this.canvas.width, this.canvas.height],
      time,
      audioAmp: amp,
      camPos: [cam.pos[0], cam.pos[1], cam.pos[2]],
      camDir: [cam.forward[0], cam.forward[1], cam.forward[2]],
      camRight: [cam.right[0], cam.right[1], cam.right[2]],
      camUp: [cam.up[0], cam.up[1], cam.up[2]],
      lightPos: [...scene.light.position],
      lightColor: [...scene.light.color],
      lightIntensity: scene.light.intensity,
      ambientColor: [...scene.ambient.ambientColor],
      fogColor: [...scene.ambient.fogColor],
      fogDensity: scene.ambient.fogDensity,
      tint: [...scene.ambient.tint],
    });
    renderFrame(this.renderer);

    this.opts.onFrame?.({
      fps: this.lastFps,
      ms: this.lastMs,
      frameCount: this.frameCount,
      cameraPos: cam.pos,
      audioAmplitude: amp,
    });
  }
}

// cancelAnimationFrame no existe fuera del browser (Node, SSR, tests).
// dispose()/stop() deben ser seguros en cualquier entorno.
function cancelRaf(id: number): void {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
  }
}

function boundsForCamera(bounds: Vec3): Vec3 {
  // dejamos un pequeño margen para no atravesar las paredes
  return [bounds[0] - 0.5, bounds[1] - 0.3, bounds[2] - 0.5] as const;
}

function looksLikeUrl(s: string): boolean {
  return /^(https?:\/\/|\/|\.\/|\.\.\/)/.test(s) && !s.includes('\n');
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`[m13/engine] fetch falló ${url}: ${r.status}`);
  }
  return r.text();
}
