/**
 * Registro de escenas .m13 reales para el tab "Explorar" (walkthrough).
 * Extraído de main.ts en la refactorización a tabs (junio 2026).
 */

export interface SceneEntry {
  id: string;
  label: string;
  file: string;
  description: string;
}

export const SCENES: SceneEntry[] = [
  {
    id: 'galeria',
    label: 'galería',
    file: '/scenes/sala_galeria.m13',
    description:
      'Galería de arte minimalista. Pedestales de mármol + esfera escultórica con iridiscencia + torus de bronce. Atmósfera cool, luz cenital.',
  },
  {
    id: 'cocina',
    label: 'cocina',
    file: '/scenes/cocina_industrial.m13',
    description:
      'Cocina loft mexicano. Ladrillo expuesto + concreto pulido + lámpara colgante dorada + isla con tope de bronce + taburetes de cuero.',
  },
  {
    id: 'oficina',
    label: 'oficina',
    file: '/scenes/oficina_neonodos.m13',
    description:
      'Oficina identidad NeoNodos. Tint terracota cálido + madera oscura + esfera dorada audio-reactiva central + vitrina de vidrio esmerilado.',
  },
  {
    id: 'templo',
    label: 'templo',
    file: '/scenes/templo_mexica.m13',
    description:
      'Templo prehispánico con piedra volcánica tallada y brasero ardiente central audio-reactivo. Identidad mexicana.',
  },
  {
    id: 'showcase',
    label: 'showcase',
    file: '/scenes/_concepts_showcase.m13',
    description:
      'Vitrina de los 18 conceptos del catálogo Fase 1 — bootstrap (8) + D-3 (6 materiales + 4 geométricos) lado a lado.',
  },
  // ===== FlowCAD assembly converter (mayo 2026) — sub-piezas REALES con nombres =====
  // assembly_to_m13.py extrae 43-73 componentes del cq.Assembly de NeoCAD,
  // cada uno con bbox + color + concept m13 apropiado. Reemplaza pipeline Blender.
  {
    id: 'fc_lineal',
    label: 'FC lineal',
    file: '/scenes/flowcad_asm_lineal.m13',
    description:
      'FlowCAD — cocina lineal con 43 sub-piezas individuales (gabinetes, puertas, manijas, encimera, electrodomésticos) extraídas del cq.Assembly de NeoCAD. Reemplaza pipeline Blender.',
  },
  {
    id: 'fc_isla',
    label: 'FC isla',
    file: '/scenes/flowcad_asm_con_isla.m13',
    description: 'FlowCAD — cocina con isla central, 43 sub-piezas reales del Assembly de NeoCAD renderizadas en m13.',
  },
  {
    id: 'fc_l',
    label: 'FC L',
    file: '/scenes/flowcad_asm_en_l.m13',
    description: 'FlowCAD — cocina en L, 58 sub-piezas individuales en disposición esquinada.',
  },
  {
    id: 'fc_u',
    label: 'FC U',
    file: '/scenes/flowcad_asm_en_u.m13',
    description: 'FlowCAD — cocina en U, 73 sub-piezas reales — la más rica del demo en componentes individuales.',
  },
  {
    id: 'fc_esc',
    label: 'FC escuadra',
    file: '/scenes/flowcad_asm_escuadra.m13',
    description: 'FlowCAD — cocina en escuadra, 58 sub-piezas con encimera y gabinetes.',
  },
];
