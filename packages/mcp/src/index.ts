/**
 * @m13/mcp — barrel export.
 *
 * Uso programático: crea el server con `createM13McpServer()` y conéctalo al
 * transporte que quieras (stdio en cli.ts). Las funciones run* son la lógica
 * de negocio pura de cada tool — testeables sin levantar el protocolo.
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
} from './tools.js';
export type {
  GenerateSceneInput,
  GenerateSceneOutput,
  ValidateSceneOutput,
  ValidateSceneStats,
  ShareSceneOutput,
  ConceptSummary,
} from './tools.js';
export { buildFormatGuide } from './format-guide.js';
