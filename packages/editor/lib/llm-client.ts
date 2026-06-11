/**
 * Cliente del phi-llm-gateway desde el browser del editor m13.
 *
 * El gateway corre en `http://localhost:9095` en dev. En producción,
 * apuntará a `https://phi-llm.neonodos.com` o similar. Configurable via
 * `NEXT_PUBLIC_PHI_LLM_URL` env var.
 *
 * Auth: Bearer token con `NEXT_PUBLIC_PHI_LLM_TOKEN`. En desarrollo, el
 * token default es `phi-dev-local`.
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_PHI_LLM_URL ?? 'http://localhost:9095';
const GATEWAY_TOKEN = process.env.NEXT_PUBLIC_PHI_LLM_TOKEN ?? 'phi-dev-local';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model?: string; // default "auto" — fallback chain del gateway
  system?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  project_id?: string;
  cache?: boolean;
}

export interface ChatTelemetry {
  cache: 'HIT' | 'MISS';
  provider: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  saved_usd: number;
  latency_ms: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  role: 'assistant';
  content: Array<{ type: string; text: string }>;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  telemetry: ChatTelemetry;
}

/** Timeout por request (ms). Configurable via NEXT_PUBLIC_PHI_LLM_TIMEOUT_MS. */
const DEFAULT_TIMEOUT_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_PHI_LLM_TIMEOUT_MS ?? '60000',
  10,
);

/** Backoff antes del único retry (ms). */
const RETRY_BACKOFF_MS = 1500;

/** Un fetch con AbortController + timeout. Lanza Error con mensaje claro en español. */
async function fetchWithTimeout(body: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${GATEWAY_URL}/llm/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        `El gateway LLM no respondió en ${Math.round(timeoutMs / 1000)}s — tiempo de espera agotado. Intenta de nuevo.`,
      );
    }
    throw new Error(
      'No se pudo conectar con el gateway LLM. Verifica que phi-llm-gateway esté corriendo y tu conexión de red.',
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Llama `/llm/chat` del phi-llm-gateway. Devuelve la respuesta del LLM
 * + telemetría parsed de los X-Phi-* headers.
 *
 * Robustez: timeout de 60s (configurable via NEXT_PUBLIC_PHI_LLM_TIMEOUT_MS)
 * y 1 retry con backoff en errores de red, timeout o respuestas 5xx.
 * Los errores 4xx NO se reintentan (son del request, no transitorios).
 */
export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const payload = JSON.stringify({
    model: req.model ?? 'auto',
    system: req.system ?? '',
    messages: req.messages,
    max_tokens: req.max_tokens ?? 4096,
    temperature: req.temperature,
    project_id: req.project_id ?? 'm13-editor',
    cache: req.cache ?? true,
  });

  let res: Response;
  try {
    res = await fetchWithTimeout(payload, DEFAULT_TIMEOUT_MS);
    if (res.status >= 500) {
      // 5xx transitorio: un retry con backoff.
      throw new Error(`gateway respondió ${res.status}`);
    }
  } catch {
    // Error de red, timeout o 5xx → esperar backoff y reintentar UNA vez.
    await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
    res = await fetchWithTimeout(payload, DEFAULT_TIMEOUT_MS);
  }

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(
      `El gateway LLM devolvió un error (${res.status}). Detalle: ${bodyText.slice(0, 500)}`,
    );
  }

  const body = (await res.json()) as Omit<ChatResponse, 'telemetry'>;
  const telemetry: ChatTelemetry = {
    cache: (res.headers.get('X-Phi-Cache') as 'HIT' | 'MISS') ?? 'MISS',
    provider: res.headers.get('X-Phi-Provider') ?? 'unknown',
    model: res.headers.get('X-Phi-Model') ?? body.model,
    tokens_in: Number.parseInt(res.headers.get('X-Phi-Tokens-In') ?? '0', 10),
    tokens_out: Number.parseInt(res.headers.get('X-Phi-Tokens-Out') ?? '0', 10),
    cost_usd: Number.parseFloat(res.headers.get('X-Phi-Cost-USD') ?? '0'),
    saved_usd: Number.parseFloat(res.headers.get('X-Phi-Saved-USD') ?? '0'),
    latency_ms: Number.parseFloat(res.headers.get('X-Phi-Latency-MS') ?? '0'),
  };

  return { ...body, telemetry };
}

/**
 * Extrae el primer bloque de texto de la respuesta. La mayoría de respuestas
 * tienen un solo bloque tipo `text`; este helper lo devuelve directo.
 */
export function extractText(response: ChatResponse): string {
  const block = response.content.find((c) => c.type === 'text');
  return block?.text ?? '';
}

/**
 * Extrae el primer bloque de código YAML del texto. Si el LLM devuelve markdown
 * tipo ```yaml ... ``` lo extrae limpio. Si no hay backticks, asume que TODO
 * el texto es YAML.
 */
export function extractYaml(text: string): string {
  const fenceMatch = text.match(/```(?:yaml|m13)?\s*\n([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();
  // Sin fences — quitar texto introductorio común tipo "Aquí está:..." si lo hay
  const lines = text.split('\n');
  const yamlStartIdx = lines.findIndex((l) => /^(version|name|bounds|walls|floor|ceiling):/i.test(l.trim()));
  if (yamlStartIdx >= 0) return lines.slice(yamlStartIdx).join('\n').trim();
  return text.trim();
}
