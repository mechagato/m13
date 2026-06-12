#!/usr/bin/env node
/**
 * Entry stdio del servidor MCP de m13.
 *
 * REGLA DURA: en un server MCP por stdio JAMÁS se escribe a stdout — el
 * protocolo JSON-RPC vive ahí y cualquier byte extra lo corrompe. Todo log
 * va a stderr (console.error). console.log queda PROHIBIDO en este proceso.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createM13McpServer } from './server.js';

async function main(): Promise<void> {
  const server = createM13McpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr — no contamina el protocolo
  console.error('[m13-mcp] servidor listo en stdio — 5 tools registrados');
}

main().catch((err) => {
  console.error('[m13-mcp] error fatal:', err);
  process.exit(1);
});
