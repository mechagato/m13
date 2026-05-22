import { parseScene } from './parser/index.js';
import type { M13Scene } from './parser/schema.js';
import { compileScene, type CompiledScene } from './compiler/index.js';
import {
  initRenderer,
  renderFrame,
  writeUniforms,
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
  private rafId = 0;
  private lastTime = 0;
  private t0 = 0;
  private frameCount = 0;
  private fpsAccum = 0;
  private fpsCounter = 0;
  private fpsTimer = 0;
  private lastFps = 0;
  private lastMs = 0;

  constructor(canvas: HTMLCanvasElement, opts: M13EngineOptions = {}) {
    this.canvas = canvas;
    this.opts = opts;
  }

  /**
   * Carga una escena desde un texto YAML (.m13). También acepta una URL absoluta o relativa.
   */
  async loadScene(yamlOrUrl: string): Promise<M13Scene> {
    const text = looksLikeUrl(yamlOrUrl) ? await fetchText(yamlOrUrl) : yamlOrUrl;
    const scene = parseScene(text);
    const compiled = compileScene(scene);
    if (this.renderer) {
      // re-create pipeline con el nuevo shader
      this.renderer = await initRenderer(this.canvas, compiled);
    } else {
      this.renderer = await initRenderer(this.canvas, compiled);
    }
    this.compiled = compiled;
    if (this.camera) {
      this.camera.setBounds(boundsForCamera(scene.bounds));
      this.camera.reset(scene.spawn);
    }
    return scene;
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
      this.tick(now);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
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
