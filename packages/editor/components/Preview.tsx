'use client';

import { type JSX, useEffect, useRef, useState } from 'react';

export interface PreviewProps {
  /** YAML actual del editor (cambia en cada keystroke después del debounce). */
  yaml: string;
  /** Callback cuando ocurre un error en parse/compile. null = sin error. */
  onError: (msg: string | null) => void;
  /** Callback cuando se completa una carga (para HUD del shell). */
  onLoadInfo?: (info: { wgslHash: string; reused: boolean; ms: number }) => void;
}

/**
 * Canvas WebGPU + M13Engine. Se monta una vez y reutiliza la instancia del
 * engine entre cambios de YAML — gracias al shader cache (T-013), si el WGSL
 * es idéntico, sólo se actualiza el matParamsBuffer (live edit de params es
 * casi instantáneo).
 *
 * El M13Engine se importa DINAMICAMENTE para evitar que Next.js intente
 * resolver `navigator.gpu` en SSR (el browser SSR no lo tiene).
 */
export function Preview({ yaml, onError, onLoadInfo }: PreviewProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<{
    loadScene: (yaml: string) => Promise<unknown>;
    start: () => void;
    stop: () => void;
    attachFlyCamera: () => unknown;
    attachAudioInput: () => unknown;
    getLastLoadInfo: () => { wgslHash: string; reusedPipeline: boolean } | null;
    resize: () => void;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  // Mount: cargar M13Engine dinámicamente y arrancar
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      if (!canvasRef.current) return;
      if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
        setBootError(
          'WebGPU no disponible. Usa Chrome/Edge 113+, Safari Tech Preview con flag, o el navegador del Quest 3.',
        );
        return;
      }
      try {
        const mod = await import('@m13/runtime');
        if (cancelled) return;
        const engine = new mod.M13Engine(canvasRef.current);
        engineRef.current = engine as unknown as typeof engineRef.current;
        await engine.loadScene(yaml);
        engine.attachFlyCamera();
        engine.attachAudioInput();
        engine.start();
        setReady(true);

        const onResize = (): void => engine.resize();
        window.addEventListener('resize', onResize);
        cleanup = (): void => {
          window.removeEventListener('resize', onResize);
          engine.stop();
        };
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        setBootError(msg);
        onError(msg);
      }
    })();

    return (): void => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-cargar la escena cuando cambia el YAML (debounced upstream)
  useEffect(() => {
    if (!ready || !engineRef.current) return;
    const engine = engineRef.current;
    const t0 = performance.now();
    engine
      .loadScene(yaml)
      .then(() => {
        const info = engine.getLastLoadInfo();
        const ms = performance.now() - t0;
        onError(null);
        if (info) onLoadInfo?.({ wgslHash: info.wgslHash, reused: info.reusedPipeline, ms });
      })
      .catch((err: unknown) => {
        const msg = (err as Error).message ?? String(err);
        onError(msg);
      });
  }, [yaml, ready, onError, onLoadInfo]);

  return (
    <div className="relative h-full w-full bg-bg">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ touchAction: 'none' }}
      />
      {!ready && !bootError && (
        <div className="absolute inset-0 flex items-center justify-center text-text-dim">
          inicializando webgpu…
        </div>
      )}
      {bootError && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="border border-critical/60 bg-critical/5 p-6 max-w-md">
            <div className="text-critical font-bold tracking-widest text-xs uppercase mb-3">
              :: error de inicialización ::
            </div>
            <pre className="text-text text-xs whitespace-pre-wrap">{bootError}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
