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

/**
 * Llama `/llm/chat` del phi-llm-gateway. Devuelve la respuesta del LLM
 * + telemetría parsed de los X-Phi-* headers.
 */
export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${GATEWAY_URL}/llm/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model ?? 'auto',
      system: req.system ?? '',
      messages: req.messages,
      max_tokens: req.max_tokens ?? 4096,
      temperature: req.temperature,
      project_id: req.project_id ?? 'm13-editor',
      cache: req.cache ?? true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`phi-llm-gateway ${res.status}: ${body.slice(0, 500)}`);
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
