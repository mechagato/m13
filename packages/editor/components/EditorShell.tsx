'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MonacoYaml } from './MonacoYaml';
import { Preview } from './Preview';
import { ErrorPanel } from './ErrorPanel';
import { INITIAL_SCENE } from '@/lib/initial-scene';
import { errorToMarkers, type YamlMarker } from '@/lib/yaml-marker-bridge';

/**
 * Shell del editor — orquesta los 3 paneles:
 *
 *   ┌─────────────────────────────────────┐
 *   │  Header (title + actions)            │
 *   ├──────────────────┬───────────────────┤
 *   │ Monaco YAML      │ Preview WebGPU    │  ← split 50/50, resizable (futuro)
 *   ├──────────────────┴───────────────────┤
 *   │ Error / Status panel                 │  ← collapsable
 *   └─────────────────────────────────────┘
 *
 * Live reload con debounce 250ms — cambios en Monaco se aplican a Preview
 * después de inactividad. Suficiente para edits manuales sin saturar el
 * compiler.
 */
export function EditorShell(): JSX.Element {
  const [yaml, setYaml] = useState(INITIAL_SCENE);
  const [debouncedYaml, setDebouncedYaml] = useState(INITIAL_SCENE);
  const [error, setError] = useState<string | null>(null);
  const [loadInfo, setLoadInfo] = useState<{ wgslHash: string; reused: boolean; ms: number } | undefined>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce de 250ms — al teclear el preview no se actualiza por cada keystroke
  useEffect(() => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedYaml(yaml), 250);
    return (): void => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [yaml]);

  const markers: YamlMarker[] = useMemo(() => {
    if (!error) return [];
    return errorToMarkers(yaml, error);
  }, [error, yaml]);

  const handleError = useCallback((msg: string | null) => setError(msg), []);
  const handleLoadInfo = useCallback(
    (info: { wgslHash: string; reused: boolean; ms: number }) => setLoadInfo(info),
    [],
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-bg text-text">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-soft">
        <div className="flex items-baseline gap-3">
          <h1 className="text-accent font-bold tracking-widest text-sm">m13 · editor</h1>
          <span className="text-text-dim text-[10px] tracking-wider">.m13 v0.1</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-dim tracking-wider uppercase">
          <span>{error ? '⚠ scene error' : '● scene live'}</span>
          {loadInfo && !error && (
            <>
              <span className="text-border">·</span>
              <span>{loadInfo.ms.toFixed(0)}ms</span>
              {loadInfo.reused && <span className="text-accent">cached</span>}
            </>
          )}
        </div>
      </header>

      {/* Split principal — Monaco izquierda, Preview derecha */}
      <main className="flex-1 grid grid-cols-2 min-h-0">
        <section className="border-r border-border min-h-0 min-w-0">
          <MonacoYaml value={yaml} onChange={setYaml} markers={markers} />
        </section>
        <section className="min-h-0 min-w-0">
          <Preview yaml={debouncedYaml} onError={handleError} onLoadInfo={handleLoadInfo} />
        </section>
      </main>

      {/* Footer error/status */}
      <footer className="h-16 shrink-0">
        <ErrorPanel error={error} info={loadInfo} />
      </footer>
    </div>
  );
}
