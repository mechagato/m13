/**
 * DeepSeek OpenAI-compatible chat + tools loop.
 * If it works here, same tool schemas work with other OpenAI-compatible hosts.
 */

import type { McpId } from './providers.js';
import { openaiToolsFor } from './providers.js';
import { executeTool } from './adapters.js';

const DEFAULT_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

function systemPrompt(mcp: McpId): string {
  return [
    `Eres un copiloto de prueba del MCP activo: ${mcp}.`,
    'Usa SOLO las tools disponibles. No inventes geometria CAD ni bytes de archivos.',
    'Para S2/S3 no pegues YAML/CAD completos en la conversacion; usa publish/private o hrefs.',
    'Responde en espanol, breve, y muestra links/cta utiles.',
    mcp === 'm13'
      ? 'Flujo tipico EHS: list_m13_templates → create_m13_from_template → publish_m13_scene (si hay gateway) o share.'
      : '',
    mcp === 'flowcad'
      ? 'Desktop es la superficie CAD. Usa deep-links; no pidas STEP en el chat.'
      : '',
    mcp === 'comp3d'
      ? 'zero_retention por defecto. No echo de file_bytes. Landings diferidas.'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function toOpenAiTools(mcp: McpId) {
  return openaiToolsFor(mcp).map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export async function runDeepseekChat(input: {
  mcp: McpId;
  messages: ChatMessage[];
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): Promise<{
  messages: ChatMessage[];
  assistant_text: string;
  tool_trace: Array<{ name: string; args: unknown; result: unknown }>;
}> {
  const apiKey = input.apiKey || process.env.DEEPSEEK_API_KEY || '';
  if (!apiKey) {
    throw new Error('Falta DEEPSEEK_API_KEY (env) o api_key en el body');
  }
  const base = (input.baseUrl || process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const model = input.model || process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(input.mcp) },
    ...input.messages.filter((m) => m.role !== 'system'),
  ];
  const tool_trace: Array<{ name: string; args: unknown; result: unknown }> = [];
  const tools = toOpenAiTools(input.mcp);

  for (let round = 0; round < 6; round += 1) {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek HTTP ${res.status}: ${errText.slice(0, 500)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: ChatMessage; finish_reason?: string }>;
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('DeepSeek: empty message');

    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    const calls = msg.tool_calls ?? [];
    if (!calls.length) {
      return {
        messages: messages.filter((m) => m.role !== 'system'),
        assistant_text: msg.content ?? '',
        tool_trace,
      };
    }

    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
      } catch {
        args = {};
      }
      let result: unknown;
      try {
        result = await executeTool(input.mcp, call.function.name, args);
      } catch (err) {
        result = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
      tool_trace.push({ name: call.function.name, args, result });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    messages: messages.filter((m) => m.role !== 'system'),
    assistant_text: '(max tool rounds reached)',
    tool_trace,
  };
}
