/**
 * Vertical templates for billable MCP/ChatGPT flows (canon D1/D2).
 * YAML is validated at call time via parseScene + compileScene.
 */

export type TemplateId = 'ehs_pasillo';

export interface SceneTemplate {
  id: TemplateId;
  title: string;
  vertical: 'ehs' | 'spatial';
  /** Default classification when publishing */
  default_classification: 'S0' | 'S1' | 'S2' | 'S3';
  description: string;
  /** Induction checklist items shown in chat cards / future player */
  checklist: string[];
  yaml: string;
}

const EHS_PASILLO_YAML = `# ehs_pasillo — plantilla inducción industrial (P0)
# Tres riesgos + layout de pasillo. Checklist en metadata del template MCP.
version: "0.1"
name: ehs_pasillo_montacargas
description: "Inducción EHS — pasillo de montacargas con 3 puntos de riesgo. Plantilla m13 P0."

bounds: [8, 3.2, 14]
spawn: [0, 0, -5.5]

ambient:
  background: [0.06, 0.07, 0.08]
  ambientColor: [0.12, 0.13, 0.14]
  tint: [1.0, 1.0, 0.98]
  fogColor: [0.06, 0.07, 0.08]
  fogDensity: 0.018

light:
  position: [0, 2.4, 0]
  color: [1.0, 0.95, 0.85]
  intensity: 1.35

walls:
  concept: pared_concreto_pulido
  params:
    darkness: 0.55
    roughness: 0.45

floor:
  concept: piso_concreto_industrial

ceiling:
  concept: pared_yeso_blanco

objects:
  # Marcador riesgo 1 — cruce peatonal / zona de atropello
  - id: riesgo_atropello
    kind: cylinder
    position: [-2.2, -2.55, -1.5]
    scale: [0.35, 0.12, 0.35]
    material:
      concept: metal_oxidado
      params:
        rustAmount: 0.7

  # Marcador riesgo 2 — área restringida
  - id: riesgo_zona_restringida
    kind: box
    position: [2.4, -2.2, 1.2]
    scale: [0.5, 0.5, 0.5]
    material:
      concept: metal_dorado_pulido

  # Marcador riesgo 3 — punto de EPP obligatorio
  - id: riesgo_epp
    kind: sphere
    position: [0, -2.1, 3.5]
    scale: [0.4, 0.4, 0.4]
    material:
      concept: metal_bronce_pulido
      params:
        shimmer: 0.4

  # Estantería / carga lateral (contexto de almacén)
  - id: rack_izq
    kind: round_box
    position: [-3.2, -1.6, 0]
    scale: [0.35, 1.4, 4.5]
    material:
      concept: metal_oxidado
      params:
        rustAmount: 0.35

  - id: rack_der
    kind: round_box
    position: [3.2, -1.6, 0]
    scale: [0.35, 1.4, 4.5]
    material:
      concept: metal_oxidado
      params:
        rustAmount: 0.35
`;

export const TEMPLATES: Record<TemplateId, SceneTemplate> = {
  ehs_pasillo: {
    id: 'ehs_pasillo',
    title: 'Pasillo montacargas (EHS)',
    vertical: 'ehs',
    default_classification: 'S2',
    description:
      'Inducción industrial: pasillo de almacén con 3 riesgos marcados (atropello, zona restringida, EPP). Lista para checklist y publish privado.',
    checklist: [
      'Identificar zona de cruce peatonal / riesgo de atropello',
      'Respetar área restringida señalizada',
      'Confirmar uso de EPP en el punto marcado',
    ],
    yaml: EHS_PASILLO_YAML,
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

export function getTemplate(id: string): SceneTemplate {
  const t = TEMPLATES[id as TemplateId];
  if (!t) {
    throw new Error(
      `Template desconocido: "${id}". Válidos: ${TEMPLATE_IDS.join(', ')}`,
    );
  }
  return t;
}

export function listTemplates(): Omit<SceneTemplate, 'yaml'>[] {
  return TEMPLATE_IDS.map((id) => {
    const { yaml: _yaml, ...rest } = TEMPLATES[id];
    return rest;
  });
}
