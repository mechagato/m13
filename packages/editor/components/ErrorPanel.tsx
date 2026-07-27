'use client';

export interface ErrorPanelProps {
  error: string | null;
  /** Info del último load OK — para mostrar diagnóstico cuando todo va bien. */
  info?: { wgslHash: string; reused: boolean; ms: number };
}

export function ErrorPanel({ error, info }: ErrorPanelProps): JSX.Element {
  if (error) {
    return (
      <div className="h-full overflow-auto p-3 bg-critical/5 border-t border-critical/40">
        <div className="text-critical font-bold tracking-widest text-[10px] uppercase mb-2">
          :: error ::
        </div>
        <pre className="text-critical/90 text-xs whitespace-pre-wrap leading-relaxed">
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-3 py-2 bg-bg-soft border-t border-border">
      <div className="flex items-center gap-4 text-[11px] text-text-dim">
        <span className="text-signal">●</span>
        <span>scene compiled OK</span>
        {info && (
          <>
            <span className="text-border">·</span>
            <span>
              {info.ms.toFixed(1)} ms {info.reused && <span className="text-accent">(cached)</span>}
            </span>
            <span className="text-border">·</span>
            <span className="font-mono text-[10px]" title={info.wgslHash}>
              wgsl: {info.wgslHash.slice(0, 8)}…
            </span>
          </>
        )}
      </div>
    </div>
  );
}
import type { JSX } from 'react';
