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
  runComposeTemporalScene,
  runValidateScene,
  runShareScene,
  runListConcepts,
  runListTemplates,
  runCreateFromTemplate,
} from './tools.js';
import { TEMPLATE_IDS } from './templates.js';
import { buildFormatGuide } from './format-guide.js';

const SERVER_NAME = 'm13';
const SERVER_VERSION = '0.2.0';

const INSTRUCTIONS = `Servidor MCP del motor m13 — entrega espacial local-first (WebGPU/WebXR).
Flujo cobrable EHS: list_m13_templates → create_m13_from_template → share_m13_scene
(con classification S2 = share privado, sin YAML en la URL).
Flujo creativo: generate_m13_scene / compose_temporal_m13_scene → validate → share (S0 público).
Nunca subas planos CAD S3 ni YAML confidencial al hilo del LLM.`;

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
        'Valida y publica una escena. classification S0/S1 puede usar URL pública #scene=; ' +
        'S2/S3 fuerzan private_local (hash + instrucciones airgap — sin YAML en la URL). ' +
        'Incluye ui_card para widgets de ChatGPT Apps.',
      inputSchema: {
        yaml: z.string().describe('Contenido YAML completo del archivo .m13 (debe ser válido)'),
        classification: z
          .enum(['S0', 'S1', 'S2', 'S3'])
          .optional()
          .describe('Clasificación de datos. Default S0. S2/S3 = sin share público.'),
        visibility: z
          .enum(['public', 'private_local'])
          .optional()
          .describe('Visibilidad pedida; S2/S3 ignoran public.'),
      },
    },
    (args) => {
      try {
        return ok(json(runShareScene(args)));
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ---- list_m13_templates ----
  server.registerTool(
    'list_m13_templates',
    {
      title: 'Listar plantillas verticales',
      description:
        'Plantillas cobrables (EHS pasillo, etc.) con checklist y clasificación default. ' +
        'No incluye el YAML completo en el listado.',
    },
    () => ok(json(runListTemplates())),
  );

  // ---- create_m13_from_template ----
  server.registerTool(
    'create_m13_from_template',
    {
      title: 'Crear escena desde plantilla',
      description:
        'Instancia una plantilla validada (parse+compile). EHS default classification=S2 → share privado.',
      inputSchema: {
        template_id: z
          .enum(['ehs_pasillo'])
          .describe(`Id de plantilla (${TEMPLATE_IDS.join(', ')})`),
        classification: z.enum(['S0', 'S1', 'S2', 'S3']).optional(),
        visibility: z.enum(['public', 'private_local']).optional(),
      },
    },
    (args) => {
      try {
        return ok(
          json(
            runCreateFromTemplate(args.template_id, {
              classification: args.classification,
              visibility: args.visibility,
            }),
          ),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ---- compose_temporal_m13_scene ----
  server.registerTool(
    'compose_temporal_m13_scene',
    {
      title: 'Componer escena temporal',
      description:
        'Sabio Compositor local: prompt → .m13 v0.2 con keyframes/light_flash. Sin LLM en runtime.',
      inputSchema: {
        prompt: z.string().describe('Intención temporal en lenguaje natural'),
      },
    },
    ({ prompt }) => {
      try {
        return ok(json(runComposeTemporalScene(prompt)));
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
