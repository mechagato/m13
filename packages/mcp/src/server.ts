/**
 * Servidor MCP de m13 — convierte a cualquier LLM (Claude, ChatGPT, etc.)
 * en front-end del motor: el modelo genera/valida/comparte escenas .m13 y el
 * humano recibe un link que abre el mundo 3D caminable en su navegador.
 *
 * Constitution §3: LLM solo en editor-time — este servidor ES editor-time.
 * El runtime que renderiza las escenas jamás llama a un LLM ni a la red.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  STYLE_IDS,
  runGenerateScene,
  runValidateScene,
  runShareScene,
  runListConcepts,
} from './tools.js';
import { buildFormatGuide } from './format-guide.js';

const SERVER_NAME = 'm13';
const SERVER_VERSION = '0.1.0';

const INSTRUCTIONS = `Servidor MCP del motor m13 — síntesis semántica de mundos 3D (WebGPU, local-first).
Flujo típico: generate_m13_scene (paramétrico) o escribe el YAML a mano siguiendo
get_m13_format_guide → validate_m13_scene hasta que pase → share_m13_scene para
obtener el link caminable. La URL contiene la escena completa (base64url), cero backend.`;

/** Resultado de texto estándar para un tool MCP. */
function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

/** Resultado de error — el LLM lo recibe como contenido para autocorregirse. */
function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

const json = (value: unknown): string => JSON.stringify(value, null, 2);

/**
 * Crea el servidor MCP con los 5 tools de m13 registrados.
 * No abre ningún transporte — eso lo hace el caller (cli.ts para stdio).
 */
export function createM13McpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  // ---- generate_m13_scene ----
  server.registerTool(
    'generate_m13_scene',
    {
      title: 'Generar escena m13',
      description:
        'Genera una escena .m13 válida con el generador paramétrico local (cero LLM, determinista por seed). ' +
        `Pasa \`style\` (${STYLE_IDS.join(' | ')}) o \`prompt\` (descripción libre — se mapea por keywords). ` +
        'Devuelve el YAML completo + share_url que abre el mundo 3D caminable en el navegador.',
      inputSchema: {
        style: z.enum(STYLE_IDS).optional().describe('Estilo del generador paramétrico (gana sobre prompt)'),
        prompt: z.string().optional().describe('Descripción libre del espacio, en español o inglés'),
        seed: z.number().int().optional().describe('Seed reproducible (solo aplica con style)'),
      },
    },
    (args) => {
      try {
        return ok(json(runGenerateScene(args)));
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ---- validate_m13_scene ----
  server.registerTool(
    'validate_m13_scene',
    {
      title: 'Validar escena m13',
      description:
        'Valida un YAML .m13 contra el schema (parse) y el compilador WGSL (conceptos reales). ' +
        'Si pasa: ok + stats (objetos, conceptos usados, bytes, versión). ' +
        'Si falla: el mensaje de error exacto para que corrijas tu YAML y reintentes.',
      inputSchema: {
        yaml: z.string().describe('Contenido YAML completo del archivo .m13'),
      },
    },
    ({ yaml }) => ok(json(runValidateScene(yaml))),
  );

  // ---- share_m13_scene ----
  server.registerTool(
    'share_m13_scene',
    {
      title: 'Compartir escena m13',
      description:
        'Valida un YAML .m13 y devuelve un share_url que abre el mundo 3D caminable en el navegador ' +
        '(WASD + mouse). La URL ES la escena (base64url en el hash) — cero backend, local-first.',
      inputSchema: {
        yaml: z.string().describe('Contenido YAML completo del archivo .m13 (debe ser válido)'),
      },
    },
    ({ yaml }) => {
      try {
        return ok(json(runShareScene(yaml)));
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ---- list_m13_concepts ----
  server.registerTool(
    'list_m13_concepts',
    {
      title: 'Listar conceptos m13',
      description:
        'Lista los conceptos materiales y geométricos disponibles en @m13/synth ' +
        '(id, categoría, descripción, params editables). Catálogo vivo — siempre refleja el registry real.',
    },
    () => ok(json(runListConcepts())),
  );

  // ---- get_m13_format_guide ----
  server.registerTool(
    'get_m13_format_guide',
    {
      title: 'Guía del formato .m13',
      description:
        'Devuelve la guía de autoría completa del formato .m13: reglas, restricciones numéricas, ' +
        'catálogo de conceptos y ejemplos. Léela antes de escribir una escena a mano.',
    },
    () => ok(buildFormatGuide()),
  );

  return server;
}
