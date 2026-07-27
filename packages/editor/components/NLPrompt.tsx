'use client';

import { type JSX, useState } from 'react';
import { chat, extractText, extractYaml, type ChatTelemetry } from '@/lib/llm-client';
import { FEW_SHOT_MESSAGES, SYSTEM_PROMPT } from '@/lib/system-prompt';
import { parseScene, compileScene } from '@m13/runtime';

export interface NLPromptProps {
  /** Callback cuando el LLM produce un .m13 válido. El padre lo inserta al Monaco. */
  onGenerated: (yaml: string) => void;
}

/**
 * Panel "describe en lenguaje natural → genera escena .m13".
 *
 * Flow:
 *   1. Usuario escribe descripción ("una galería con esfera blanca sobre pedestal")
 *   2. Click "Generar" → llamada a phi-llm-gateway con system + few-shots + user msg
 *   3. Gateway routea a Llama 3.3 70B free (o fallback) → response YAML
 *   4. Extraemos el YAML del response, llamamos onGenerated → Monaco lo carga
 *   5. Mostramos telemetría: provider usado, tokens, ms, USD ahorrado (cache hit)
 */
export function NLPrompt({ onGenerated }: NLPromptProps): JSX.Element {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTelemetry, setLastTelemetry] = useState<ChatTelemetry | null>(null);

  // B5 (auditoría 06-12): el editor valida la salida del LLM contra el
  // parser/compiler REALES y, si falla, regresa el error de Zod al LLM para
  // que se corrija (máx 2 reintentos) — el mismo patrón del MCP. Antes el
  // error moría en el ErrorPanel del humano.
  const MAX_RETRIES = 2;

  const submit = async (): Promise<void> => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const baseRequest = {
        model: 'auto' as const, // gateway elige free first, fallback paid
        system: SYSTEM_PROMPT,
        max_tokens: 2048,
        temperature: 0.3, // bajo para output estructurado consistente
        project_id: 'm13-editor',
      };
      const messages = [...FEW_SHOT_MESSAGES, { role: 'user' as const, content: input.trim() }];

      let res = await chat({ ...baseRequest, messages });
      let yaml = '';
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        yaml = extractYaml(extractText(res)) ?? '';
        if (!yaml) {
          throw new Error('El LLM no devolvió YAML válido en su respuesta.');
        }
        try {
          compileScene(parseScene(yaml, { strict: true })); // validación real + typos anidados (B9)
          onGenerated(yaml);
          setLastTelemetry(res.telemetry);
          return;
        } catch (validationErr) {
          if (attempt === MAX_RETRIES) break;
          messages.push(
            { role: 'assistant' as const, content: yaml },
            {
              role: 'user' as const,
              content: `Tu YAML falló la validación del motor: ${(validationErr as Error).message}. Corrige el problema y devuelve SOLO el YAML completo corregido, sin explicaciones.`,
            },
          );
          res = await chat({ ...baseRequest, messages });
        }
      }
      // Agotados los reintentos: entregar el último intento — el ErrorPanel
      // del editor mostrará el detalle al humano.
      onGenerated(yaml);
      setLastTelemetry(res.telemetry);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-border bg-bg-soft px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-[10px] text-text-dim tracking-widest uppercase">
          ✨ describe la escena
        </label>
        {lastTelemetry && !loading && (
          <div className="ml-auto flex items-center gap-3 text-[10px] text-text-dim">
            <span className={lastTelemetry.cache === 'HIT' ? 'text-accent' : 'text-signal'}>
              {lastTelemetry.cache === 'HIT' ? '⚡ cache' : '◌'} {lastTelemetry.provider}
            </span>
            <span title="modelo usado" className="font-mono">
              {lastTelemetry.model.slice(0, 28)}{lastTelemetry.model.length > 28 ? '…' : ''}
            </span>
            <span title="tokens in / out">
              {lastTelemetry.tokens_in}↓ / {lastTelemetry.tokens_out}↑
            </span>
            <span title="latencia">{lastTelemetry.latency_ms.toFixed(0)}ms</span>
            {lastTelemetry.saved_usd > 0 && (
              <span className="text-accent" title="USD ahorrado por cache hit">
                ↓ ${lastTelemetry.saved_usd.toFixed(5)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="ej. una galería minimalista con esfera escultórica blanca sobre pedestal"
          disabled={loading}
          className="flex-1 bg-bg border border-border px-3 py-1.5 text-sm text-text font-mono placeholder:text-text-dim/60 focus:outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={() => void submit()}
          disabled={loading || !input.trim()}
          className="px-4 py-1.5 bg-accent/10 border border-accent text-accent text-xs font-bold tracking-widest uppercase hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'generando…' : 'generar'}
        </button>
      </div>

      {error && (
        <div className="mt-2 text-critical text-[11px] font-mono">⚠ {error}</div>
      )}
    </div>
  );
}
