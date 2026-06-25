/**
 * Generador paramétrico LOCAL de escenas .m13 — tab "Crear".
 *
 * Demuestra D-025-06: el motor NO necesita IA para crear mundos. Plantillas
 * TS arman el YAML variando materiales (18 conceptos de @m13/synth), colores
 * de luz, bounds y objetos con un RNG sembrado. Cada click = escena distinta.
 *
 * Cero red, cero LLM: corre 100% en el dispositivo del usuario.
 */

// ============================================
// RNG sembrado (mulberry32) — determinista por seed
// ============================================
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;
const range = (rng: Rng, min: number, max: number): number => min + rng() * (max - min);
const r2 = (n: number): string => (Math.round(n * 100) / 100).toString();
const vec = (x: number, y: number, z: number): string => `[${r2(x)}, ${r2(y)}, ${r2(z)}]`;

// ============================================
// Pools de conceptos (ids reales de @m13/synth)
// ============================================
const WALLS = ['pared_yeso_blanco', 'pared_ladrillo_viejo', 'pared_concreto_pulido', 'pared_madera_oscura'] as const;
const FLOORS = ['piso_madera_envejecida', 'piso_concreto_industrial', 'piso_marmol_blanco'] as const;
const UNIVERSAL = ['marmol_blanco_vetas', 'piedra_volcanica'] as const;
const OBJ_MATS = [
  'metal_dorado_pulido',
  'metal_bronce_pulido',
  'metal_oxidado',
  'cuero_vintage',
  'vidrio_esmerilado',
  'marmol_blanco_vetas',
  'piedra_volcanica',
] as const;
const PRIMS = ['sphere', 'box', 'round_box', 'cylinder', 'torus'] as const;

export interface GenResult {
  /** Etiqueta del estilo generado (para el HUD) */
  label: string;
  /** YAML .m13 completo, listo para M13Engine.loadScene */
  yaml: string;
  /** Seed usado — reproducible */
  seed: number;
}

export type StyleId = 'galeria' | 'cocina' | 'oficina' | 'templo' | 'minimalista' | 'sorpresa';

export const STYLES: Array<{ id: StyleId; label: string }> = [
  { id: 'galeria', label: 'Galería de arte' },
  { id: 'cocina', label: 'Cocina industrial' },
  { id: 'oficina', label: 'Oficina ejecutiva' },
  { id: 'templo', label: 'Templo' },
  { id: 'minimalista', label: 'Sala minimalista' },
  { id: 'sorpresa', label: 'Sorpréndeme' },
];

// ============================================
// Bloques YAML reutilizables
// ============================================
function header(name: string, desc: string, w: number, h: number, d: number): string {
  return [
    'version: "0.1"',
    `name: ${name}`,
    `description: "${desc}"`,
    `bounds: ${vec(w, h, d)}`,
    `spawn: ${vec(0, 0, -d + 1.2)}`,
  ].join('\n');
}

function ambientBlock(tint: [number, number, number], amb: [number, number, number], fog: number): string {
  return [
    'ambient:',
    `  ambientColor: ${vec(amb[0], amb[1], amb[2])}`,
    `  tint: ${vec(tint[0], tint[1], tint[2])}`,
    `  fogDensity: ${r2(fog)}`,
  ].join('\n');
}

function lightBlock(pos: [number, number, number], color: [number, number, number], intensity: number): string {
  return [
    'light:',
    `  position: ${vec(pos[0], pos[1], pos[2])}`,
    `  color: ${vec(color[0], color[1], color[2])}`,
    `  intensity: ${r2(intensity)}`,
  ].join('\n');
}

function surfaces(wall: string, floor: string, ceiling: string): string {
  return [`walls:\n  concept: ${wall}`, `floor:\n  concept: ${floor}`, `ceiling:\n  concept: ${ceiling}`].join('\n');
}

interface ObjSpec {
  id: string;
  kind: string;
  concept?: string;
  material?: string;
  position: [number, number, number];
  scale: [number, number, number] | number;
  audioReactive?: boolean;
  animate?: { mode: 'bob' | 'rotate' | 'pulse'; speed: number; amplitude: number };
}

function objYaml(o: ObjSpec): string {
  const lines = [`  - id: ${o.id}`, `    kind: ${o.kind}`];
  if (o.concept) lines.push(`    concept: ${o.concept}`);
  if (o.material) lines.push(`    material: ${o.material}`);
  lines.push(`    position: ${vec(o.position[0], o.position[1], o.position[2])}`);
  lines.push(
    typeof o.scale === 'number'
      ? `    scale: ${r2(o.scale)}`
      : `    scale: ${vec(o.scale[0], o.scale[1], o.scale[2])}`,
  );
  if (o.audioReactive) lines.push('    audio_reactive: true');
  if (o.animate) {
    lines.push('    animate:');
    lines.push(`      mode: ${o.animate.mode}`);
    lines.push(`      speed: ${r2(o.animate.speed)}`);
    lines.push(`      amplitude: ${r2(o.animate.amplitude)}`);
  }
  return lines.join('\n');
}

function assemble(parts: string[], objects: ObjSpec[]): string {
  const objBlock = objects.length > 0 ? 'objects:\n' + objects.map(objYaml).join('\n') : '';
  return [...parts, objBlock].filter(Boolean).join('\n') + '\n';
}

// ============================================
// Plantillas por estilo
// ============================================
function genGaleria(rng: Rng, seed: number): GenResult {
  const w = range(rng, 5, 7);
  const d = range(rng, 5, 7);
  const floor = pick(rng, ['piso_marmol_blanco', 'piso_madera_envejecida'] as const);
  const objects: ObjSpec[] = [];
  const nPiezas = 2 + Math.floor(rng() * 3); // 2-4 piezas
  for (let i = 0; i < nPiezas; i++) {
    const x = i === 0 ? 0 : range(rng, -w + 2, w - 2);
    const z = i === 0 ? 0 : range(rng, -d + 2, d - 2);
    const s = range(rng, 0.28, 0.42);
    objects.push({
      id: `pedestal_${i}`,
      kind: 'concept',
      concept: 'pedestal_marmol',
      position: [x, -2.6, z],
      scale: [0.35, 0.4, 0.35],
    });
    const tipo = pick(rng, ['esfera', 'torus', 'cubo'] as const);
    if (tipo === 'esfera') {
      objects.push({
        id: `pieza_${i}`,
        kind: 'concept',
        concept: 'esfera_decorativa',
        position: [x, -1.5, z],
        scale: s,
        animate: { mode: 'bob', speed: range(rng, 0.2, 0.5), amplitude: 0.04 },
      });
    } else {
      objects.push({
        id: `pieza_${i}`,
        kind: tipo === 'torus' ? 'torus' : 'box',
        material: pick(rng, ['metal_bronce_pulido', 'marmol_blanco_vetas', 'vidrio_esmerilado'] as const),
        position: [x, -1.7, z],
        scale: tipo === 'torus' ? [s, s * 0.3, s] : [s * 0.7, s * 0.7, s * 0.7],
        animate: rng() > 0.5 ? { mode: 'rotate', speed: range(rng, 0.2, 0.6), amplitude: 0 } : undefined,
      });
    }
  }
  return {
    label: 'galería de arte',
    seed,
    yaml: assemble(
      [
        header('galeria_generada', 'Galería de arte minimalista — generada localmente', w, 3.5, d),
        ambientBlock([0.98, 1.0, 1.03], [0.18, 0.19, 0.21], range(rng, 0.008, 0.014)),
        lightBlock([0, 3.1, 0], [0.98, 0.99, 1.03], range(rng, 1.1, 1.4)),
        surfaces('pared_yeso_blanco', floor, 'pared_yeso_blanco'),
      ],
      objects,
    ),
  };
}

function genCocina(rng: Rng, seed: number): GenResult {
  const w = range(rng, 4.5, 6);
  const d = range(rng, 4.5, 6);
  const wall = pick(rng, ['pared_ladrillo_viejo', 'pared_concreto_pulido'] as const);
  const objects: ObjSpec[] = [
    {
      id: 'lampara',
      kind: 'concept',
      concept: 'lampara_colgante',
      position: [0, 1.0, 0],
      scale: [0.15, range(rng, 0.25, 0.4), 0.15],
    },
    {
      id: 'isla',
      kind: 'round_box',
      material: pick(rng, ['metal_bronce_pulido', 'metal_oxidado', 'marmol_blanco_vetas'] as const),
      position: [0, -2.3, 0],
      scale: [range(rng, 0.9, 1.3), 0.55, range(rng, 0.5, 0.8)],
    },
  ];
  const nTaburetes = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < nTaburetes; i++) {
    objects.push({
      id: `taburete_${i}`,
      kind: 'cylinder',
      material: 'cuero_vintage',
      position: [-1.2 + i * 1.2, -2.5, range(rng, 1.2, 1.8)],
      scale: [0.2, 0.35, 0.2],
    });
  }
  return {
    label: 'cocina industrial',
    seed,
    yaml: assemble(
      [
        header('cocina_generada', 'Cocina loft industrial — generada localmente', w, 3, d),
        ambientBlock([range(rng, 1.05, 1.14), 0.95, range(rng, 0.75, 0.86)], [0.08, 0.06, 0.04], range(rng, 0.015, 0.025)),
        lightBlock([0, 1.0, 0], [1.0, range(rng, 0.8, 0.9), range(rng, 0.5, 0.62)], range(rng, 1.3, 1.7)),
        surfaces(wall, 'piso_concreto_industrial', 'pared_yeso_blanco'),
      ],
      objects,
    ),
  };
}

function genOficina(rng: Rng, seed: number): GenResult {
  const w = range(rng, 5, 6.5);
  const d = range(rng, 5, 6.5);
  const objects: ObjSpec[] = [
    {
      id: 'pedestal',
      kind: 'concept',
      concept: 'pedestal_marmol',
      position: [0, -2.5, 0],
      scale: [0.45, 0.45, 0.45],
    },
    {
      id: 'esfera_emblema',
      kind: 'sphere',
      material: 'metal_dorado_pulido',
      position: [0, -1.5, 0],
      scale: range(rng, 0.35, 0.48),
      audioReactive: true,
      animate: { mode: 'bob', speed: range(rng, 0.4, 0.8), amplitude: 0.1 },
    },
    {
      id: 'vitrina',
      kind: 'box',
      material: 'vidrio_esmerilado',
      position: [range(rng, 1.8, 2.6), -1.8, range(rng, -2, 2)],
      scale: [0.4, 1.0, 0.4],
    },
  ];
  if (rng() > 0.5) {
    objects.push({
      id: 'escritorio',
      kind: 'round_box',
      material: 'cuero_vintage',
      position: [range(rng, -2.4, -1.6), -2.4, 0],
      scale: [0.9, 0.45, 0.5],
    });
  }
  return {
    label: 'oficina ejecutiva',
    seed,
    yaml: assemble(
      [
        header('oficina_generada', 'Oficina ejecutiva identidad NeoNodos — generada localmente', w, 3, d),
        ambientBlock([1.08, 0.95, 0.78], [0.1, 0.08, 0.06], range(rng, 0.012, 0.018)),
        lightBlock([0, 2.8, 0], [1.0, 0.88, 0.65], range(rng, 1.2, 1.5)),
        surfaces('pared_yeso_blanco', 'pared_madera_oscura', 'pared_yeso_blanco'),
      ],
      objects,
    ),
  };
}

function genTemplo(rng: Rng, seed: number): GenResult {
  const w = range(rng, 4.5, 6);
  const d = range(rng, 4.5, 6);
  const objects: ObjSpec[] = [
    {
      id: 'brasero',
      kind: 'cylinder',
      material: 'piedra_volcanica',
      position: [0, -2.8, 0],
      scale: [range(rng, 0.4, 0.55), 0.2, range(rng, 0.4, 0.55)],
    },
    {
      id: 'flama',
      kind: 'sphere',
      material: 'metal_dorado_pulido',
      position: [0, -2.3, 0],
      scale: range(rng, 0.25, 0.35),
      audioReactive: true,
      animate: { mode: 'bob', speed: range(rng, 3, 5), amplitude: 0.08 },
    },
  ];
  const nColumnas = Math.floor(rng() * 3); // 0-2 columnas
  for (let i = 0; i < nColumnas; i++) {
    const side = i === 0 ? -1 : 1;
    objects.push({
      id: `columna_${i}`,
      kind: 'box',
      material: 'piedra_volcanica',
      position: [side * (w - 1.5), -1.5, range(rng, -1, 1)],
      scale: [0.35, 1.5, 0.35],
    });
  }
  return {
    label: 'templo',
    seed,
    yaml: assemble(
      [
        header('templo_generado', 'Templo prehispánico de piedra volcánica — generado localmente', w, 3.5, d),
        ambientBlock([range(rng, 1.1, 1.2), 0.92, 0.7], [0.04, 0.025, 0.015], range(rng, 0.02, 0.03)),
        lightBlock([0, -1.5, 0], [1.4, 0.7, 0.25], range(rng, 1.6, 2.0)),
        surfaces('piedra_volcanica', 'piedra_volcanica', 'piedra_volcanica'),
      ],
      objects,
    ),
  };
}

function genMinimalista(rng: Rng, seed: number): GenResult {
  const w = range(rng, 4.5, 6);
  const d = range(rng, 4.5, 6);
  const floor = pick(rng, FLOORS);
  const objects: ObjSpec[] = [];
  if (rng() > 0.35) {
    objects.push({
      id: 'pieza_unica',
      kind: pick(rng, PRIMS),
      material: pick(rng, OBJ_MATS),
      position: [0, -1.8, 0],
      scale: range(rng, 0.3, 0.5),
      animate: rng() > 0.5 ? { mode: 'rotate', speed: 0.3, amplitude: 0 } : undefined,
    });
  }
  return {
    label: 'sala minimalista',
    seed,
    yaml: assemble(
      [
        header('sala_generada', 'Sala minimalista — generada localmente', w, 3, d),
        ambientBlock([1.0, 1.0, 1.0], [0.15, 0.15, 0.16], range(rng, 0.008, 0.015)),
        lightBlock([0, 2.7, 0], [1.0, 0.98, 0.95], range(rng, 1.1, 1.4)),
        surfaces('pared_yeso_blanco', floor, 'pared_yeso_blanco'),
      ],
      objects,
    ),
  };
}

function genSorpresa(rng: Rng, seed: number): GenResult {
  // Mezcla totalmente aleatoria con materiales del catálogo completo
  const w = range(rng, 4.5, 7);
  const d = range(rng, 4.5, 7);
  const wallPool = [...WALLS, ...UNIVERSAL] as const;
  const floorPool = [...FLOORS, ...UNIVERSAL] as const;
  const objects: ObjSpec[] = [];
  const n = 1 + Math.floor(rng() * 4); // 1-4 objetos
  for (let i = 0; i < n; i++) {
    const geo = rng() > 0.6;
    const x = range(rng, -w + 1.8, w - 1.8);
    const z = range(rng, -d + 1.8, d - 1.8);
    if (geo) {
      objects.push({
        id: `obj_${i}`,
        kind: 'concept',
        concept: pick(rng, ['pedestal_marmol', 'lampara_colgante', 'esfera_decorativa', 'cubo_basico'] as const),
        position: [x, range(rng, -2.5, 0.5), z],
        scale: range(rng, 0.2, 0.5),
      });
    } else {
      objects.push({
        id: `obj_${i}`,
        kind: pick(rng, PRIMS),
        material: pick(rng, OBJ_MATS),
        position: [x, range(rng, -2.3, -1.2), z],
        scale: range(rng, 0.25, 0.5),
        audioReactive: rng() > 0.7,
        animate:
          rng() > 0.4
            ? { mode: pick(rng, ['bob', 'rotate', 'pulse'] as const), speed: range(rng, 0.3, 2), amplitude: 0.08 }
            : undefined,
      });
    }
  }
  return {
    label: 'sorpresa',
    seed,
    yaml: assemble(
      [
        header('sorpresa_generada', 'Escena aleatoria — generada localmente con RNG sembrado', w, range(rng, 2.8, 4), d),
        ambientBlock(
          [range(rng, 0.9, 1.15), range(rng, 0.9, 1.05), range(rng, 0.75, 1.05)],
          [range(rng, 0.03, 0.18), range(rng, 0.03, 0.18), range(rng, 0.03, 0.18)],
          range(rng, 0.008, 0.028),
        ),
        lightBlock(
          [range(rng, -1, 1), range(rng, 0.5, 3), range(rng, -1, 1)],
          [range(rng, 0.8, 1.4), range(rng, 0.6, 1.0), range(rng, 0.3, 1.0)],
          range(rng, 1.0, 1.9),
        ),
        surfaces(pick(rng, wallPool), pick(rng, floorPool), pick(rng, wallPool)),
      ],
      objects,
    ),
  };
}

const GENERATORS: Record<StyleId, (rng: Rng, seed: number) => GenResult> = {
  galeria: genGaleria,
  cocina: genCocina,
  oficina: genOficina,
  templo: genTemplo,
  minimalista: genMinimalista,
  sorpresa: genSorpresa,
};

/** Genera una escena del estilo dado. Sin seed → aleatorio (cada click distinto). */
export function generateScene(style: StyleId, seed?: number): GenResult {
  const s = seed ?? Math.floor(Math.random() * 0xffffffff);
  const rng = mulberry32(s);
  if (style === 'sorpresa' && rng() > 0.5) {
    // 50% de las veces "sorpresa" reusa otra plantilla con seed aleatorio
    const other = pick(rng, ['galeria', 'cocina', 'oficina', 'templo', 'minimalista'] as const);
    return GENERATORS[other](rng, s);
  }
  return GENERATORS[style](rng, s);
}

// ============================================
// Fallback sin IA: keywords del prompt → plantilla
// ============================================
const KEYWORD_MAP: Array<{ re: RegExp; style: StyleId }> = [
  { re: /cocina|kitchen|loft|industrial|ladrillo/i, style: 'cocina' },
  { re: /oficina|office|despacho|ejecutiv|escritorio|terracota/i, style: 'oficina' },
  { re: /galer[ií]a|gallery|museo|arte|escultura|exposici/i, style: 'galeria' },
  { re: /templo|temple|prehisp|mexica|azteca|piedra|volc[aá]n|brasero|fuego/i, style: 'templo' },
  { re: /minimal|vac[ií]o|simple|limpio|sala|cuarto|habitaci/i, style: 'minimalista' },
];

/**
 * Escena oculta "para papá" — la más cálida y hermosa del catálogo, hecha a mano
 * (sin RNG). Luz dorada baja, materiales nobles: madera envejecida + piedra natural.
 * Lleva el metadato `dedicated_to` en su YAML. No se documenta en la UI: solo aparece
 * cuando el prompt es exactamente "para papá" / "para papa".
 */
function genParaPapa(): GenResult {
  const w = 6;
  const d = 6;
  const objects: ObjSpec[] = [
    { id: 'pedestal', kind: 'concept', concept: 'pedestal_marmol', position: [0, -2.5, 0], scale: [0.45, 0.5, 0.45] },
    {
      id: 'corazon',
      kind: 'sphere',
      material: 'metal_dorado_pulido',
      position: [0, -1.45, 0],
      scale: 0.42,
      animate: { mode: 'bob', speed: 0.4, amplitude: 0.06 },
    },
    { id: 'columna_izq', kind: 'box', material: 'piedra_volcanica', position: [-2.4, -1.5, -1], scale: [0.35, 1.5, 0.35] },
    { id: 'columna_der', kind: 'box', material: 'piedra_volcanica', position: [2.4, -1.5, -1], scale: [0.35, 1.5, 0.35] },
    {
      id: 'aro',
      kind: 'torus',
      material: 'metal_bronce_pulido',
      position: [0, -0.3, 0],
      scale: [0.5, 0.16, 0.5],
      animate: { mode: 'rotate', speed: 0.25, amplitude: 0 },
    },
  ];
  return {
    label: 'para papá',
    seed: 0,
    yaml: assemble(
      [
        header('para_papa', 'Para Papá — la escena más cálida del catálogo, hecha a mano.', w, 3.6, d),
        'dedicated_to: "Genaro García Torres — el día que lo veas, ya llegamos."',
        ambientBlock([1.12, 0.95, 0.74], [0.1, 0.07, 0.04], 0.014),
        lightBlock([0, 2.6, 0.5], [1.0, 0.82, 0.5], 1.5),
        surfaces('pared_madera_oscura', 'piso_madera_envejecida', 'pared_madera_oscura'),
      ],
      objects,
    ),
  };
}

/** Interpreta un prompt libre SIN IA — matching de keywords hacia plantillas. */
export function generateFromPrompt(prompt: string): GenResult {
  // Escena oculta: "para papá" / "para papa" (tolerante a acento, exacto tras trim).
  // ̀-ͯ = marcas diacríticas combinantes (quita el acento de "papá").
  const normalized = prompt.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (normalized === 'para papa') return genParaPapa();

  const match = KEYWORD_MAP.find((k) => k.re.test(prompt));
  const result = generateScene(match?.style ?? 'sorpresa');
  // Tweaks ligeros por keywords de material/atmósfera
  let yaml = result.yaml;
  if (/m[aá]rmol|marble/i.test(prompt)) yaml = yaml.replace(/floor:\n  concept: \S+/, 'floor:\n  concept: piso_marmol_blanco');
  if (/madera|wood/i.test(prompt)) yaml = yaml.replace(/floor:\n  concept: \S+/, 'floor:\n  concept: piso_madera_envejecida');
  if (/oscur|dark/i.test(prompt)) yaml = yaml.replace(/ambientColor: \[[^\]]+\]/, 'ambientColor: [0.03, 0.03, 0.04]');
  if (/c[aá]lid|warm|dorado|gold/i.test(prompt)) yaml = yaml.replace(/tint: \[[^\]]+\]/, 'tint: [1.1, 0.94, 0.76]');
  return { ...result, yaml };
}
