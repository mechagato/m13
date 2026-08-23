/**
 * @m13/mcp — barrel export.
 *
 * Uso programático: crea el server con `createM13McpServer()` y conéctalo al
 * transporte que quieras (stdio en cli.ts). Las funciones run* son la lógica
 * de negocio pura de cada tool — testeables sin levantar el protocolo.
 *
 * ChatGPT App adapter files live in packages/mcp/chatgpt-app/ (OpenAPI + README).
 */

export { createM13McpServer } from './server.js';
export {
  SHARE_BASE_URL,
  STYLE_IDS,
  buildShareUrl,
  runGenerateScene,
  runComposeTemporalScene,
  runValidateScene,
  runShareScene,
  runListConcepts,
  runListTemplates,
  runCreateFromTemplate,
} from './tools.js';
export type {
  GenerateSceneInput,
  GenerateSceneOutput,
  ValidateSceneOutput,
  ValidateSceneStats,
  ShareSceneInput,
  ShareSceneOutput,
  ConceptSummary,
  CreateFromTemplateOutput,
  DataClass,
  ShareVisibility,
  UiCard,
  TemplateId,
} from './tools.js';
export {
  policyFor,
  resolveShareVisibility,
  buildPrivateShareDescriptor,
  sha256Hex,
} from './security.js';
export { TEMPLATES, TEMPLATE_IDS, getTemplate, listTemplates } from './templates.js';
export { cardWorldReady, cardPrivateShare, cardTemplate } from './cards.js';
export { buildFormatGuide } from './format-guide.js';
