import { parseScene } from './parser/index.js';
import type { M13Scene } from './parser/schema.js';
import { compileScene, hashWgsl, type CompiledScene } from './compiler/index.js';
import {
  initRendererCore,
  buildSceneResources,
  destroySceneResources,
  destroyRendererCore,
  renderFrame,
  renderEyePass,
  writeUniforms,
  writeMatParams,
  type RendererState,
  type RendererCore,
  type SceneResources,
  type UniformInputs,
} from './renderer/index.js';
import { FlyCamera, type FlyCameraOptions } from './camera/fly-camera.js';
import { XRCameraController, type XRLocomotionInput } from './camera/xr-camera.js';
import { MicAudioInput } from './audio/mic-input.js';
import type { FrameStats, Vec3 } from './types.js';

// ---- Tipos WebXR mínimos (Fase 5). @types/webxr no trae XRGPUBinding aún, así que
// declaramos localmente solo lo que usamos y accedemos vía cast — sin dependencia nueva.
interface XRRigidTransformLike { matrix: Float32Array }
interface XRViewLike { transform: XRRigidTransformLike; projectionMatrix: Float32Array; eye: string }
interface XRViewerPoseLike { views: readonly XRViewLike[] }
interface XRInputSourceLike { handedness: string; gamepad?: { axes: readonly number[] } | null }
interface XRSessionLike {
  requestReferenceSpace(type: string): Promise<unknown>;
  requestAnimationFrame(cb: (t: number, frame: XRFrameLike) => void): number;
  cancelAnimationFrame(id: number): void;
  updateRenderState(state: { layers?: unknown[] }): void;
  addEventListener(type: string, cb: () => void): void;
  end(): Promise<void>;
  readonly inputSources: readonly XRInputSourceLike[];
}
interface XRFrameLike { session: XRSessionLike; getViewerPose(space: unknown): XRViewerPoseLike | null }
interface XRSubImageLike { colorTexture: GPUTexture; viewport: { x: number; y: number; width: number; height: number } }
type XRProjectionLayerLike = object;
interface XRGPUBindingLike {
  createProjectionLayer(init?: { colorFormat?: GPUTextureFormat }): XRProjectionLayerLike;
  getViewSubImage(layer: XRProjectionLayerLike, view: XRViewLike): XRSubImageLike;
}

/** Lee locomoción de los input sources XR: mano izq = mover, mano der = girar. */
function readXRInput(sources: readonly XRInputSourceLike[]): XRLocomotionInput {
  let move: [number, number] = [0, 0];
  let turn = 0;
  for (const s of sources) {
    const ax = s.gamepad?.axes;
    if (!ax || ax.length < 4) continue;
    if (s.handedness === 'left') move = [ax[2] ?? 0, -(ax[3] ?? 0)];
    else if (s.handedness === 'right') turn = ax[2] ?? 0;
  }
  return { move, turn };
}

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
 * Calidad de render (T-213) — se aplica vía uniforms SIN recompilar el shader.
 * renderScale es informativo para la app (el canvas lo dimensiona la app).
 */
export interface Quality {
  maxSteps: number;
  shadowSteps: number;
  aoSamples: number;
  /** Tope de octaves para el detalle continuo (P2 lo consume) */
  octaveCap: number;
  /** Multiplicador de resolución sugerido (la app lo aplica al canvas) */
  renderScale: number;
  /** Detalle continuo (Sonido 13) on/off. Off → octavas fijas (look Fase 1). Default on. */
  continuousDetail: boolean;
}

export type QualityPreset = 'quest' | 'quest_xr' | 'mobile' | 'desktop' | 'ultra';

export const QUALITY_PRESETS: Record<QualityPreset, Quality> = {
  // Quest 3 standalone: medido 37-48fps a dpr 1 (D-2112) — presupuesto agresivo
  // Quest re-balanceado (ultra-opt): sombras/AO/pasos más baratos liberan presupuesto
  // para que la resolución dinámica suba la nitidez manteniendo ~72fps. renderScale es el
  // PISO inicial; la app lo sube en vivo según el FPS (ver autoResolution en examples).
  quest: { maxSteps: 78, shadowSteps: 8, aoSamples: 2, octaveCap: 3, renderScale: 0.7, continuousDetail: true },
  // Fase 5: en VR el raymarch corre ×2 (un pass por ojo) → presupuesto aún más agresivo
  // para sostener 72fps estéreo. El microbench en Quest (T-501) afina estos números.
  quest_xr: { maxSteps: 52, shadowSteps: 6, aoSamples: 2, octaveCap: 3, renderScale: 1, continuousDetail: true },
  mobile: { maxSteps: 112, shadowSteps: 24, aoSamples: 4, octaveCap: 4, renderScale: 1.5, continuousDetail: true },
  // desktop = comportamiento histórico exacto del motor (pre-T-212)
  desktop: { maxSteps: 128, shadowSteps: 32, aoSamples: 5, octaveCap: 5, renderScale: 2, continuousDetail: true },
  ultra: { maxSteps: 192, shadowSteps: 48, aoSamples: 8, octaveCap: 7, renderScale: 2, continuousDetail: true },
};

/** Heurística de preset por dispositivo (absorbe D-2110/D-2112). */
export function detectQualityPreset(): QualityPreset {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'desktop';
  if (/OculusBrowser|Quest/i.test(navigator.userAgent)) return 'quest';
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return 'mobile';
  return 'desktop';
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
  /** Core GPU persistente (device/context/uniformBuffer) — UNA vez por engine (D-3004). */
  private core: RendererCore | null = null;
  /** LRU de recursos por escena, keyed por hash WGSL (B3). Map preserva orden de inserción. */
  private sceneCache = new Map<string, SceneResources>();
  private static readonly SCENE_CACHE_MAX = 4;
  private compiled: CompiledScene | null = null;
  private camera: FlyCamera | null = null;
  private audio: MicAudioInput | null = null;
  private running = false;
  private disposed = false;
  private quality: Quality = { ...QUALITY_PRESETS.desktop };
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
  /** Cola de serialización de loadScene — nunca corren dos cargas en paralelo. */
  private loadChain: Promise<unknown> = Promise.resolve();
  /** true mientras una carga reemplaza el renderer — el tick no toca el contexto. */
  private loading = false;
  // --- Estado WebXR (Fase 5) ---
  private xrSession: XRSessionLike | null = null;
  private xrRefSpace: unknown = null;
  private xrBinding: XRGPUBindingLike | null = null;
  private xrLayer: XRProjectionLayerLike | null = null;
  private xrCamera: XRCameraController | null = null;
  private xrRafId = 0;
  private xrLastTime = 0;
  private preXRQuality: Quality | null = null;

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
   *
   * SERIALIZADO: dos llamadas concurrentes se encolan. Ambas comparten el mismo
   * GPUCanvasContext — sin la cola, el unconfigure de una aterriza después del
   * configure de la otra y el canvas queda negro con "context is not configured".
   */
  async loadScene(yamlOrUrl: string): Promise<M13Scene> {
    const run = this.loadChain.then(() => this.doLoadScene(yamlOrUrl));
    // La cadena nunca se rompe: un fallo no debe bloquear cargas futuras.
    this.loadChain = run.catch(() => undefined);
    return run;
  }

  private async doLoadScene(yamlOrUrl: string): Promise<M13Scene> {
    if (this.disposed) {
      throw new Error('[m13/engine] El engine ya fue liberado con dispose() — crea una nueva instancia.');
    }
    const text = looksLikeUrl(yamlOrUrl) ? await fetchText(yamlOrUrl) : yamlOrUrl;
    const scene = parseScene(text, { strict: true });
    const compiled = compileScene(scene);
    const newHash = await hashWgsl(compiled.wgsl);

    // dispose() pudo llegar mientras fetchText/hashWgsl estaban en vuelo.
    // Sin este guard, las asignaciones de abajo "revivirían" un engine disposed.
    if (this.disposed) {
      throw new Error('[m13/engine] dispose() llamado durante loadScene — operación cancelada.');
    }

    const cacheHit = this.renderer !== null && newHash === this.lastWgslHash;
    // reusedPipeline también es true cuando la escena vino del LRU (B3)
    let reusedPipeline = cacheHit;

    if (!cacheHit) {
      // D-3004 (B3/B4): el core GPU es persistente y el context NUNCA se
      // des-configura entre escenas — la clase entera de races de canvas
      // negro (7ec1fc8) desaparece por diseño. Por escena solo se construyen
      // pipeline/matParams/bindGroup, cacheados en un LRU de 4.
      if (!this.core) {
        // Primera escena: crear el core. El flag loading cubre el configure
        // del context (único momento donde el tick no debe tocarlo).
        this.loading = true;
        try {
          this.core = await initRendererCore(this.canvas);
        } finally {
          this.loading = false;
        }
        if (this.disposed) {
          // dispose() llegó mientras el core se creaba: liberar de inmediato
          // o queda un GPUDevice huérfano fuera del alcance de dispose().
          destroyRendererCore(this.core);
          this.core = null;
          throw new Error('[m13/engine] dispose() llamado durante loadScene — recursos GPU liberados.');
        }
      }

      let resources = this.sceneCache.get(newHash);
      const reusedFromLru = resources !== undefined;
      reusedPipeline = reusedFromLru;
      if (resources) {
        this.sceneCache.delete(newHash); // touch LRU (se re-inserta al final)
      } else {
        // B4: si el WGSL falla en GPU, esto RECHAZA sin haber destruido nada —
        // la escena que corría sigue viva y el trabajo del usuario no se pierde.
        resources = await buildSceneResources(this.core, compiled);
        if (this.disposed) {
          destroySceneResources(resources);
          throw new Error('[m13/engine] dispose() llamado durante loadScene — recursos GPU liberados.');
        }
      }
      this.sceneCache.set(newHash, resources);
      if (this.sceneCache.size > M13Engine.SCENE_CACHE_MAX) {
        const oldestKey = this.sceneCache.keys().next().value as string;
        const evicted = this.sceneCache.get(oldestKey)!;
        this.sceneCache.delete(oldestKey);
        destroySceneResources(evicted);
      }

      this.renderer = { ...this.core, ...resources };
      this.lastWgslHash = newHash;

      // LRU hit: mismo WGSL pero los VALORES de matParams pueden diferir
      // (mismo concepto, params distintos → mismo shader, otro Float32Array).
      if (reusedFromLru && compiled.matParams.totalFloats > 0) {
        writeMatParams(this.renderer, compiled.matParams.values);
      }
    } else if (this.renderer && compiled.matParams.totalFloats > 0) {
      // Cache hit del shader pero los VALORES de matParams pueden haber cambiado
      // (mismo concepto, params distintos → mismo WGSL, distinto Float32Array).
      // Sin esto, cambiar params no surte efecto cuando hay shader cache hit.
      writeMatParams(this.renderer, compiled.matParams.values);
    }

    this.compiled = compiled;
    this.lastLoadInfo = { wgslHash: newHash, reusedPipeline };

    if (this.camera) {
      // F9: en exterior no hay paredes → no clampar XZ a bounds (sería pared invisible en
      // pleno campo abierto); solo se mantiene el clamp de altura (no caer bajo el suelo).
      const exterior = scene.walls === undefined || scene.ceiling === undefined;
      const camBounds: Vec3 = exterior
        ? [Math.max(scene.bounds[0], 250), scene.bounds[1] - 0.3, Math.max(scene.bounds[2], 250)]
        : boundsForCamera(scene.bounds);
      this.camera.setBounds(camBounds);
      this.camera.reset(scene.spawn);
      // T-231: la escena puede fijar su velocidad de cámara (explanadas grandes).
      if (scene.cameraSpeed !== undefined) this.camera.setSpeed(scene.cameraSpeed);
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
    // B14: attach repetido sin detach dejaba listeners huérfanos en canvas/document
    this.camera?.detach();
    const scene = this.compiled?.scene;
    this.camera = new FlyCamera(this.canvas, {
      ...opts,
      initialPos: opts.initialPos ?? scene?.spawn,
      bounds: opts.bounds ?? (scene ? boundsForCamera(scene.bounds) : undefined),
    });
    return this.camera;
  }

  attachAudioInput(): MicAudioInput {
    // B14: attach repetido sin stop dejaba el stream del mic anterior vivo
    if (this.audio) void this.audio.stop();
    this.audio = new MicAudioInput();
    return this.audio;
  }

  /**
   * Cambia la calidad de render EN VIVO — vía uniforms, sin recompilar shader
   * (T-213). Acepta un preset por nombre o un parcial de Quality.
   * Nota: renderScale es sugerido — la app dimensiona el canvas (ver resize()).
   */
  setQuality(q: QualityPreset | Partial<Quality>): Quality {
    const next = typeof q === 'string' ? QUALITY_PRESETS[q] : q;
    this.quality = { ...this.quality, ...next };
    // octaveCap es MAGNITUD >= 1: el signo de quality.w es interno del toggle de detalle
    // continuo (negativo = octavas fijas). Clampar evita que 0/negativo invierta el toggle.
    this.quality.octaveCap = Math.max(1, Math.abs(this.quality.octaveCap));
    return { ...this.quality };
  }

  getQuality(): Quality {
    return { ...this.quality };
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

  /** Partes NO-cámara del uniform (luz/ambiente/fog/quality/audio) — compartidas por 2D y XR. */
  private sceneUniforms(
    scene: M13Scene,
    time: number,
    amp: number,
    bands: number[],
  ): Omit<UniformInputs, 'resolution' | 'camPos' | 'camDir' | 'camRight' | 'camUp' | 'xr' | 'viewport'> {
    return {
      time,
      audioAmp: amp,
      lightPos: [...scene.light.position],
      lightColor: [...scene.light.color],
      lightIntensity: scene.light.intensity,
      ambientColor: [...scene.ambient.ambientColor],
      fogColor: [...scene.ambient.fogColor],
      fogDensity: scene.ambient.fogDensity,
      tint: [...scene.ambient.tint],
      // .w = octaveCap con SIGNO = toggle detalle continuo (negativo = octavas fijas), magnitud >= 1.
      quality: [
        this.quality.maxSteps,
        this.quality.shadowSteps,
        this.quality.aoSamples,
        (this.quality.continuousDetail ? 1 : -1) * Math.max(this.quality.octaveCap, 1),
      ],
      audioBands: [bands[0] ?? 0, bands[1] ?? 0, bands[2] ?? 0, amp],
    };
  }

  // ============================================================
  // WebXR — sesión inmersiva estéreo (Fase 5)
  // ============================================================

  /** true si el navegador soporta una sesión immersive-vr (Quest). */
  async isXRSupported(): Promise<boolean> {
    const xr = (navigator as unknown as { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    if (!xr) return false;
    try {
      return await xr.isSessionSupported('immersive-vr');
    } catch {
      return false;
    }
  }

  /**
   * Entra en VR: crea la sesión immersive-vr, el binding WebGPU↔WebXR y arranca el
   * loop estéreo. Pausa el loop 2D. Requiere una escena cargada y XRGPUBinding
   * (WebGPU+WebXR) — si el navegador aún no lo trae, lanza error claro (T-501).
   */
  async enterXR(): Promise<void> {
    if (this.xrSession) return;
    if (!this.core || !this.renderer || !this.compiled) {
      throw new Error('[m13/xr] enterXR() sin escena cargada');
    }
    const xr = (navigator as unknown as {
      xr?: { requestSession(m: string, init?: unknown): Promise<XRSessionLike> };
    }).xr;
    if (!xr) throw new Error('[m13/xr] WebXR no disponible en este navegador');
    const XRGPUBindingCtor = (globalThis as unknown as {
      XRGPUBinding?: new (s: XRSessionLike, d: GPUDevice) => XRGPUBindingLike;
    }).XRGPUBinding;
    if (!XRGPUBindingCtor) {
      throw new Error(
        '[m13/xr] Este navegador no soporta WebGPU+WebXR (XRGPUBinding no existe). ' +
          'T-501: interop pendiente — usa la vista 2D en el navegador del Quest mientras tanto.',
      );
    }

    const session = await xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor'],
    });
    try {
      this.xrSession = session;
    const binding = new XRGPUBindingCtor(session, this.core.device);
    this.xrBinding = binding;
    const layer = binding.createProjectionLayer({ colorFormat: this.core.format });
    this.xrLayer = layer;
    session.updateRenderState({ layers: [layer] });
    this.xrRefSpace = await session
      .requestReferenceSpace('local-floor')
      .catch(() => session.requestReferenceSpace('local'));

    const scene = this.compiled.scene;
    this.xrCamera = new XRCameraController(scene.spawn, scene.cameraSpeed ?? 2.5);

    // Presupuesto estéreo (×2 ojos) — guardar la calidad 2D para restaurarla al salir.
    this.preXRQuality = { ...this.quality };
    this.setQuality('quest_xr');

    this.stop(); // pausar el loop 2D
    session.addEventListener('end', () => this.onXRSessionEnd());
    this.xrLastTime = 0;
      this.xrRafId = session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));
    } catch (err) {
      this.xrSession = null;
      this.xrBinding = null;
      this.xrLayer = null;
      this.xrRefSpace = null;
      this.xrCamera = null;
      if (this.preXRQuality) {
        this.quality = this.preXRQuality;
        this.preXRQuality = null;
      }
      await session.end().catch(() => undefined);
      throw err;
    }
  }

  /** Sale de VR (termina la sesión; el 'end' event reanuda el loop 2D). */
  async exitXR(): Promise<void> {
    if (this.xrSession) await this.xrSession.end().catch(() => undefined);
  }

  /** true si hay una sesión XR activa. */
  isXRActive(): boolean {
    return this.xrSession !== null;
  }

  private onXRSessionEnd(): void {
    if (this.xrSession) this.xrSession.cancelAnimationFrame(this.xrRafId);
    this.xrRafId = 0;
    this.xrSession = null;
    this.xrBinding = null;
    this.xrLayer = null;
    this.xrCamera = null;
    this.xrRefSpace = null;
    // Restaurar la calidad 2D previa a VR.
    if (this.preXRQuality) {
      this.quality = this.preXRQuality;
      this.preXRQuality = null;
    }
    if (!this.disposed && this.renderer && this.compiled) this.start();
  }

  private onXRFrame(t: number, frame: XRFrameLike): void {
    if (!this.xrSession) return;
    this.xrRafId = this.xrSession.requestAnimationFrame((tt, ff) => this.onXRFrame(tt, ff));
    if (!this.renderer || !this.compiled || !this.core || !this.xrBinding || !this.xrLayer || !this.xrCamera) {
      return;
    }
    const pose = frame.getViewerPose(this.xrRefSpace);
    if (!pose) return;

    const dt = this.xrLastTime ? Math.min((t - this.xrLastTime) / 1000, 0.05) : 0;
    this.xrLastTime = t;
    const time = t / 1000;

    // Locomoción del rig (thumbsticks) + fps
    this.xrCamera.updateRig(dt, readXRInput(this.xrSession.inputSources));
    this.fpsTimer += dt;
    if (this.fpsTimer > 0.5 && dt > 0) {
      this.lastFps = 1 / dt;
      this.lastMs = dt * 1000;
      this.fpsTimer = 0;
    }

    const scene = this.compiled.scene;
    const amp = this.audio ? this.audio.sample() : 0;
    const bands = this.audio ? this.audio.getBands() : [0, 0, 0];
    const base = this.sceneUniforms(scene, time, amp, bands);
    const device = this.core.device;

    // Un ojo a la vez: writeUniforms (buffer compartido) + submit inmediato garantizan
    // que cada pass lea SUS uniforms (el orden en la queue del device se respeta).
    pose.views.forEach((view, i) => {
      const sub = this.xrBinding!.getViewSubImage(this.xrLayer!, view);
      const cam = this.xrCamera!.eyeVectors(view.transform.matrix, view.projectionMatrix);
      const vp = sub.viewport;
      writeUniforms(this.renderer!, {
        ...base,
        resolution: [vp.width, vp.height],
        camPos: [cam.pos[0], cam.pos[1], cam.pos[2]],
        camDir: [cam.forward[0], cam.forward[1], cam.forward[2]],
        camRight: [cam.right[0], cam.right[1], cam.right[2]],
        camUp: [cam.up[0], cam.up[1], cam.up[2]],
        xr: [i + 1, 0, 0, 0],
        viewport: [vp.x, vp.y, vp.width, vp.height],
      });
      const encoder = device.createCommandEncoder();
      renderEyePass(this.renderer!, encoder, sub.colorTexture.createView(), vp, i === 0);
      device.queue.submit([encoder.finish()]);
    });

    this.frameCount++;
    this.opts.onFrame?.({
      fps: this.lastFps,
      ms: this.lastMs,
      frameCount: this.frameCount,
      cameraPos: this.xrCamera.getRigPos(),
      audioAmplitude: amp,
    });
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

    // Terminar sesión XR si estaba activa (fire-and-forget).
    if (this.xrSession) {
      this.xrSession.cancelAnimationFrame(this.xrRafId);
      void this.xrSession.end().catch(() => undefined);
      this.xrSession = null;
      this.xrBinding = null;
      this.xrLayer = null;
      this.xrCamera = null;
    }

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

    // Destruir recursos WebGPU: cada escena cacheada y luego el core.
    for (const res of this.sceneCache.values()) {
      destroySceneResources(res);
    }
    this.sceneCache.clear();
    if (this.core) {
      destroyRendererCore(this.core);
      this.core = null;
    }
    this.renderer = null;

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

    // `loading`: hay un reemplazo de renderer en vuelo — el contexto puede estar
    // sin configurar y getCurrentTexture lanzaría InvalidStateError.
    if (this.loading || !this.renderer || !this.compiled) return;
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
    const bands = this.audio ? this.audio.getBands() : [0, 0, 0];

    writeUniforms(this.renderer, {
      ...this.sceneUniforms(scene, time, amp, bands),
      resolution: [this.canvas.width, this.canvas.height],
      camPos: [cam.pos[0], cam.pos[1], cam.pos[2]],
      camDir: [cam.forward[0], cam.forward[1], cam.forward[2]],
      camRight: [cam.right[0], cam.right[1], cam.right[2]],
      camUp: [cam.up[0], cam.up[1], cam.up[2]],
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
