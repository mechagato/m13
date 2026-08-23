/**
 * Execute tools for the active MCP. m13 = in-process; others = HTTP backends.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  runListTemplates,
  runCreateFromTemplate,
  runGenerateScene,
  runValidateScene,
  runShareScene,
  runPublishScene,
  runListConcepts,
  runComposeTemporalScene,
  buildFormatGuide,
} from '@m13/mcp';
import type { McpId, ProviderStatus } from './providers.js';

function env(name: string, fallback: string): string {
  return (process.env[name] ?? fallback).replace(/\/$/, '');
}

export function flowcadBase(): string {
  return env('FLOWCAD_BACKEND_URL', 'http://127.0.0.1:8787');
}

export function comp3dBase(): string {
  return env('COMP3D_API_URL', 'http://127.0.0.1:8080');
}

export async function probeProviders(): Promise<ProviderStatus[]> {
  const m13: ProviderStatus = {
    id: 'm13',
    label: 'm13 Spatial',
    ready: true,
    detail: 'In-process (@m13/mcp). Gateway opcional vía M13_GATEWAY_URL.',
  };

  const flowcad: ProviderStatus = {
    id: 'flowcad',
    label: 'FlowCAD',
    ready: false,
    detail: 'Backend offline',
    hint: `Arranca FlowCAD API en ${flowcadBase()}`,
  };
  try {
    const r = await fetch(`${flowcadBase()}/health`, { signal: AbortSignal.timeout(2500) });
    flowcad.ready = r.ok;
    flowcad.detail = r.ok ? `OK ${flowcadBase()}` : `HTTP ${r.status}`;
  } catch (e) {
    flowcad.detail = String(e);
  }

  const comp3d: ProviderStatus = {
    id: 'comp3d',
    label: 'Comp3D',
    ready: false,
    detail: 'API offline',
    hint: `Arranca proy3 API en ${comp3dBase()} (o usa modo Python local)`,
  };
  try {
    const r = await fetch(`${comp3dBase()}/health`, { signal: AbortSignal.timeout(2500) });
    comp3d.ready = r.ok;
    comp3d.detail = r.ok ? `OK ${comp3dBase()}` : `HTTP ${r.status}`;
  } catch {
    // Fallback: try invoking Python MCP module without HTTP
    const py = await tryComp3dPython('comp3d_readiness', {});
    if (py && (py as { ready?: boolean }).ready !== undefined) {
      comp3d.ready = true;
      comp3d.detail = 'Python in-process via proy3-qro services/mcp';
    } else {
      comp3d.detail = 'HTTP y Python fallback no disponibles';
    }
  }

  return [m13, flowcad, comp3d];
}

function defaultComp3dRoot(): string {
  const fromEnv = process.env.COMP3D_ROOT;
  if (fromEnv) return fromEnv;
  // pnpm --filter runs with cwd=packages/playground
  const candidates = [
    resolve(process.cwd(), '../../11-proy3-qro'),
    resolve(process.cwd(), '../11-proy3-qro'),
    resolve(process.cwd(), 'C:/WorkInProgress/11-proy3-qro'),
  ];
  for (const c of candidates) {
    if (existsSync(resolve(c, 'services/mcp/app.py'))) return c;
  }
  return candidates[0]!;
}

async function tryComp3dPython(name: string, args: Record<string, unknown>): Promise<unknown | null> {
  const root = defaultComp3dRoot();
  const mcpDir = resolve(root, 'services/mcp').replace(/\\/g, '/');
  const script = `
import json, sys
sys.path.insert(0, r"${mcpDir}")
import app
print(json.dumps(app.call_tool(${JSON.stringify(name)}, ${JSON.stringify(args)}), ensure_ascii=False))
`;
  return await new Promise((resolvePromise) => {
    const child = spawn('python', ['-c', script], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += String(d)));
    child.stderr.on('data', (d) => (err += String(d)));
    child.on('close', (code) => {
      if (code !== 0) {
        resolvePromise(null);
        return;
      }
      try {
        resolvePromise(JSON.parse(out));
      } catch {
        resolvePromise(null);
      }
    });
    child.on('error', () => resolvePromise(null));
  });
}

export async function executeTool(
  mcp: McpId,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (mcp === 'm13') return executeM13(name, args);
  if (mcp === 'flowcad') return executeFlowcad(name, args);
  return executeComp3d(name, args);
}

async function executeM13(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'list_m13_templates':
      return runListTemplates();
    case 'create_m13_from_template':
      return runCreateFromTemplate(String(args.template_id ?? 'ehs_pasillo'), {
        classification: args.classification as 'S0' | 'S1' | 'S2' | 'S3' | undefined,
      });
    case 'generate_m13_scene':
      return runGenerateScene({
        style: args.style as never,
        prompt: args.prompt as string | undefined,
        seed: typeof args.seed === 'number' ? args.seed : undefined,
      });
    case 'validate_m13_scene':
      return runValidateScene(String(args.yaml ?? ''));
    case 'share_m13_scene':
      return runShareScene({
        yaml: String(args.yaml ?? ''),
        classification: args.classification as never,
        visibility: args.visibility as never,
      });
    case 'publish_m13_scene':
      return runPublishScene({
        yaml: String(args.yaml ?? ''),
        classification: args.classification as never,
        org_id: args.org_id as string | undefined,
      });
    case 'list_m13_concepts':
      return runListConcepts();
    case 'compose_temporal_m13_scene':
      return runComposeTemporalScene(String(args.prompt ?? ''));
    case 'get_m13_format_guide':
      return { guide: buildFormatGuide() };
    default:
      throw new Error(`Unknown m13 tool: ${name}`);
  }
}

async function executeFlowcad(name: string, args: Record<string, unknown>): Promise<unknown> {
  const base = flowcadBase();
  if (name === 'flowcad_health') {
    const r = await fetch(`${base}/health`);
    return { ok: r.ok, status: r.status, body: await safeJson(r) };
  }
  if (name === 'list_capabilities') {
    return {
      ok: true,
      surfaces: ['desktop', 'mcp', 'playground'],
      backend: base,
      tools: [
        'flowcad_health',
        'dispatch_operator',
        'design_from_prompt',
        'bom_summary',
        'export_artifacts',
        'open_in_desktop',
        'spatial_preview',
      ],
    };
  }
  if (name === 'dispatch_operator') {
    const r = await fetch(`${base}/api/neocad/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(args.text ?? '') }),
    });
    return { status: r.status, ...(await safeJson(r)) };
  }
  if (name === 'design_from_prompt') {
    // Mirror FlowCAD MCP keyword mapper lightly + optional job
    const prompt = String(args.prompt ?? '');
    const start = args.start_job !== false;
    const config = mapKitchen(prompt);
    if (!start) return { ok: true, config, prompt };
    const r = await fetch(`${base}/api/cocinas/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const body = await safeJson(r);
    return {
      ok: r.ok,
      status: r.status,
      config,
      ...body,
      desktop_deep_link: body && typeof body === 'object' && 'job_id' in body
        ? `flowcad://open?job=${(body as { job_id: string }).job_id}`
        : undefined,
    };
  }
  if (name === 'bom_summary') {
    const id = String(args.job_id ?? '');
    const r = await fetch(`${base}/api/cocinas/job/${id}`);
    return { status: r.status, ...(await safeJson(r)) };
  }
  if (name === 'export_artifacts') {
    const id = String(args.job_id ?? '');
    return {
      ok: true,
      job_id: id,
      artifact_urls: {
        status: `${base}/api/cocinas/job/${id}`,
        pdf: `${base}/api/cocinas/job/${id}/pdf`,
        glb: `${base}/api/cocinas/job/${id}/model.glb`,
        m13: `${base}/api/cocinas/job/${id}/model.m13`,
        share: `${base}/share/${id}`,
      },
      desktop_deep_link: `flowcad://open?job=${id}`,
    };
  }
  if (name === 'open_in_desktop') {
    const id = args.job_id ? String(args.job_id) : '';
    return {
      ok: true,
      deep_link: id ? `flowcad://open?job=${id}` : 'flowcad://open?new=1',
    };
  }
  if (name === 'spatial_preview') {
    const id = String(args.job_id ?? '');
    return {
      ok: true,
      m13_artifact_url: `${base}/api/cocinas/job/${id}/model.m13`,
      note: 'm13 layout preview — not mesh CAD',
    };
  }
  throw new Error(`Unknown flowcad tool: ${name}`);
}

function mapKitchen(prompt: string): Record<string, unknown> {
  const p = prompt.toLowerCase();
  let tipo = 'lineal';
  if (p.includes('isla')) tipo = 'con_isla';
  else if (/\ben\s*u\b/.test(p)) tipo = 'en_u';
  else if (/\ben\s*l\b/.test(p) || p.includes('escuadra')) tipo = 'en_l';
  let ancho = 2400;
  const mm = p.match(/(\d{3,4})\s*mm/);
  if (mm) ancho = Math.max(600, Math.min(4000, Number(mm[1])));
  let cubierta = 'cuarzo';
  if (p.includes('granito')) cubierta = 'granito';
  else if (p.includes('madera')) cubierta = 'madera';
  return {
    tipo_cocina: tipo,
    ancho_mm: ancho,
    profundidad_mm: 600,
    altura_piso_techo_mm: 2700,
    superiores_al_techo: false,
    tipo_cubierta: cubierta,
    color_dominante: 'blanco',
    color_cubierta: 'gris',
    nombre_proyecto: 'Playground MCP',
  };
}

async function executeComp3d(name: string, args: Record<string, unknown>): Promise<unknown> {
  // Prefer Python module (works even without HTTP server)
  const viaPy = await tryComp3dPython(name, args);
  if (viaPy !== null) return viaPy;

  const base = comp3dBase();
  const routeMap: Record<string, string> = {
    comp3d_product_summary: '/product/summary',
    comp3d_compression_demo: '/compression/demo',
    comp3d_viewer_demo: '/viewer/demo',
    comp3d_optimization_demo: '/optimization/demo',
    comp3d_roi_snapshot: '/roi-snapshot',
    comp3d_readiness: '/readiness',
  };
  if (name in routeMap) {
    const r = await fetch(`${base}${routeMap[name]}`);
    return { status: r.status, ...(await safeJson(r)) };
  }
  if (name === 'comp3d_list_capabilities') {
    return {
      ok: true,
      tools: Object.keys(routeMap).concat(['comp3d_list_capabilities']),
      landings: 'deferred_to_end',
    };
  }
  if (name === 'comp3d_compress_file' || name === 'comp3d_optimize_file') {
    const path = name === 'comp3d_compress_file' ? '/compression/process' : '/optimization/process';
    const r = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...args, zero_retention: args.zero_retention ?? true }),
    });
    return { status: r.status, ...(await safeJson(r)) };
  }
  throw new Error(`Unknown comp3d tool: ${name}`);
}

async function safeJson(r: Response): Promise<Record<string, unknown>> {
  try {
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return { raw: await r.text() };
  }
}
