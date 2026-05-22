import { M13Engine } from '@m13/runtime';

// ============================================
// Scene registry
// ============================================
interface SceneEntry {
  id: string;
  label: string;
  file: string;
  description: string;
}

const SCENES: SceneEntry[] = [
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
];

let currentSceneIdx = 0;

// ============================================
// DOM refs
// ============================================
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} no encontrado`);
  return el as T;
};

const canvas = $<HTMLCanvasElement>('canvas');
const errorScreen = $('errorScreen');
const errorMsg = $('errorMsg');
const prompt = $('prompt');
const crosshair = $('crosshair');
const fpsEl = $('fps');
const msEl = $('ms');
const resEl = $('res');
const cxEl = $('cx');
const cyEl = $('cy');
const czEl = $('cz');
const audioEl = $('audio');
const ampEl = $('amp');
const sceneNameEl = $('sceneName');
const sceneDescEl = $('sceneDesc');
const sceneSelector = $('sceneSelector');

function fail(msg: string): void {
  errorMsg.textContent = msg;
  errorScreen.classList.add('show');
  // eslint-disable-next-line no-console
  console.error('[m13]', msg);
}

// ============================================
// Init engine
// ============================================
const engine = new M13Engine(canvas, {
  onFrame: (s) => {
    fpsEl.textContent = Math.round(s.fps).toString();
    msEl.textContent = s.ms.toFixed(1);
    resEl.textContent = canvas.width + '\u00d7' + canvas.height;
    cxEl.textContent = s.cameraPos[0].toFixed(2);
    cyEl.textContent = s.cameraPos[1].toFixed(2);
    czEl.textContent = s.cameraPos[2].toFixed(2);
    ampEl.textContent = s.audioAmplitude.toFixed(2);
  },
});
const audio = engine.attachAudioInput();

// Build scene selector UI
SCENES.forEach((scene, i) => {
  const btn = document.createElement('button');
  btn.dataset.idx = i.toString();
  btn.innerHTML = '<span class="num">' + (i + 1) + '</span>' + scene.label;
  btn.addEventListener('click', () => void loadIdx(i));
  sceneSelector.appendChild(btn);
});

function updateSelector(): void {
  Array.from(sceneSelector.children).forEach((btn, i) => {
    btn.classList.toggle('active', i === currentSceneIdx);
  });
}

// ============================================
// Resize
// ============================================
function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  resEl.textContent = canvas.width + '\u00d7' + canvas.height;
}
window.addEventListener('resize', resize);

// ============================================
// Pointer lock UX
// ============================================
canvas.addEventListener('click', async () => {
  try {
    await canvas.requestPointerLock();
  } catch {
    /* noop */
  }
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  prompt.classList.toggle('hidden', locked);
  crosshair.classList.toggle('active', locked);
});

// ============================================
// Audio toggle
// ============================================
async function toggleAudio(): Promise<void> {
  try {
    await audio.toggle();
    if (audio.isActive()) {
      audioEl.textContent = 'live';
      audioEl.classList.add('active');
    } else {
      audioEl.textContent = 'offline';
      audioEl.classList.remove('active');
    }
  } catch {
    audioEl.textContent = 'denied';
  }
}

// ============================================
// Scene loading
// ============================================
async function loadIdx(idx: number): Promise<void> {
  if (idx < 0 || idx >= SCENES.length) return;
  currentSceneIdx = idx;
  const entry = SCENES[idx]!;
  sceneNameEl.textContent = entry.label;
  sceneDescEl.textContent = entry.description;
  updateSelector();
  try {
    const text = await fetch(entry.file).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' cargando ' + entry.file);
      return r.text();
    });
    await engine.loadScene(text);
  } catch (err) {
    fail((err as Error).message ?? String(err));
    throw err;
  }
}

// ============================================
// Keyboard hotkeys
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') void toggleAudio();
  const m = e.code.match(/^Digit(\d)$/);
  if (m) {
    const idx = parseInt(m[1]!, 10) - 1;
    if (idx >= 0 && idx < SCENES.length) void loadIdx(idx);
  }
});

// ============================================
// Boot
// ============================================
(async () => {
  if (!('gpu' in navigator)) {
    fail(
      'WebGPU no disponible. Usa Chrome/Edge 113+, Safari Technology Preview con flag, o el navegador del Quest 3.',
    );
    return;
  }
  resize();
  engine.attachFlyCamera();
  try {
    await loadIdx(0);
    engine.start();
  } catch {
    /* ya manejado en loadIdx */
  }
})();
