/**
 * One MCP active at a time. Order: m13 → flowcad → comp3d.
 */

export type McpId = 'm13' | 'flowcad' | 'comp3d';

export const MCP_ORDER: McpId[] = ['m13', 'flowcad', 'comp3d'];

export interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ProviderStatus {
  id: McpId;
  label: string;
  ready: boolean;
  detail: string;
  hint?: string;
}

export function openaiToolsFor(id: McpId): ToolDef[] {
  if (id === 'm13') return M13_TOOLS;
  if (id === 'flowcad') return FLOWCAD_TOOLS;
  return COMP3D_TOOLS;
}

const M13_TOOLS: ToolDef[] = [
  {
    name: 'list_m13_templates',
    description: 'Lista plantillas verticales (EHS, etc.)',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'create_m13_from_template',
    description: 'Crea escena desde plantilla (ehs_pasillo). S2 = share privado.',
    parameters: {
      type: 'object',
      properties: {
        template_id: { type: 'string', enum: ['ehs_pasillo'] },
        classification: { type: 'string', enum: ['S0', 'S1', 'S2', 'S3'] },
      },
      required: ['template_id'],
    },
  },
  {
    name: 'generate_m13_scene',
    description: 'Genera escena paramétrica local (style o prompt).',
    parameters: {
      type: 'object',
      properties: {
        style: { type: 'string' },
        prompt: { type: 'string' },
        seed: { type: 'integer' },
      },
    },
  },
  {
    name: 'validate_m13_scene',
    description: 'Valida YAML .m13',
    parameters: {
      type: 'object',
      properties: { yaml: { type: 'string' } },
      required: ['yaml'],
    },
  },
  {
    name: 'share_m13_scene',
    description: 'Share público o private_local según classification',
    parameters: {
      type: 'object',
      properties: {
        yaml: { type: 'string' },
        classification: { type: 'string', enum: ['S0', 'S1', 'S2', 'S3'] },
        visibility: { type: 'string', enum: ['public', 'private_local'] },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'publish_m13_scene',
    description: 'Publish tokenizado vía M13_GATEWAY_URL (S2/S3)',
    parameters: {
      type: 'object',
      properties: {
        yaml: { type: 'string' },
        classification: { type: 'string', enum: ['S0', 'S1', 'S2', 'S3'] },
        org_id: { type: 'string' },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'list_m13_concepts',
    description: 'Catálogo de conceptos materiales',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'compose_temporal_m13_scene',
    description: 'Compone escena temporal v0.2 desde prompt',
    parameters: {
      type: 'object',
      properties: { prompt: { type: 'string' } },
      required: ['prompt'],
    },
  },
];

const FLOWCAD_TOOLS: ToolDef[] = [
  {
    name: 'flowcad_health',
    description: 'Health del backend FlowCAD',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_capabilities',
    description: 'Capabilities del MCP FlowCAD',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'dispatch_operator',
    description: 'Routing CAD determinista (ej. extrude 20mm)',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
  {
    name: 'design_from_prompt',
    description: 'Mapea NL → config cocina y opcionalmente crea job',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        start_job: { type: 'boolean' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'bom_summary',
    description: 'BOM de un job_id',
    parameters: {
      type: 'object',
      properties: { job_id: { type: 'string' } },
      required: ['job_id'],
    },
  },
  {
    name: 'export_artifacts',
    description: 'URLs de artefactos (sin binarios)',
    parameters: {
      type: 'object',
      properties: { job_id: { type: 'string' } },
      required: ['job_id'],
    },
  },
  {
    name: 'open_in_desktop',
    description: 'Deep-link flowcad://',
    parameters: {
      type: 'object',
      properties: { job_id: { type: 'string' }, path: { type: 'string' } },
    },
  },
  {
    name: 'spatial_preview',
    description: 'Hint preview espacial m13 para un job',
    parameters: {
      type: 'object',
      properties: { job_id: { type: 'string' } },
      required: ['job_id'],
    },
  },
];

const COMP3D_TOOLS: ToolDef[] = [
  {
    name: 'comp3d_product_summary',
    description: 'Resumen producto Comp3D',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'comp3d_compression_demo',
    description: 'Demo CompData Compression',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'comp3d_viewer_demo',
    description: 'Demo viewer ligero',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'comp3d_optimization_demo',
    description: 'Demo weight reduction',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'comp3d_roi_snapshot',
    description: 'Snapshot ROI',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'comp3d_readiness',
    description: 'Readiness gate',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'comp3d_list_capabilities',
    description: 'Capabilities + security',
    parameters: { type: 'object', properties: {} },
  },
];
