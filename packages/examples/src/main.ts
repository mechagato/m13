import { M13Engine, QUALITY_PRESETS, detectQualityPreset } from '@m13/runtime';
import type { QualityPreset } from '@m13/runtime';
import { SCENES } from './scenes.js';
import { STYLES, generateScene, generateFromPrompt } from '@m13/generator';
import type { StyleId } from '@m13/generator';
import { hasLlmEndpoint, generateWithLlm, getLlmUrl } from './llm.js';

// ============================================
// DOM refs
// ============================================
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} no encontrado`);
  return el as T;
};

const canvas = $<HTMLCanvasElement>('canvas');
const doc = $('doc');
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
const sceneCount = $('sceneCount');
const entryScreen = $('entryScreen');
const enterBtn = $('enterBtn');
const rail = $('rail');
const taskLine = $('taskLine');
const taskSpinner = $('taskSpinner');
const taskText = $('taskText');
const chips = $('chips');
const chipsToggle = $('chipsToggle');
const promptForm = $<HTMLFormElement>('promptForm');
const promptInput = $<HTMLInputElement>('promptInput');
const promptBtn = $<HTMLButtonElement>('promptBtn');
const renderNote = $('renderNote');
const recipePanel = $('recipePanel');
const recipeCode = $('recipeCode');
const recipeName = $('recipeName');
const recipeWeight = $('recipeWeight');
const recipeCopy = $('recipeCopy');
const recipeShare = $<HTMLButtonElement>('recipeShare');
const sbFps = $('sbFps');
const recipeEdit = $<HTMLButtonElement>('recipeEdit');
const recipeTextarea = $<HTMLTextAreaElement>('recipeTextarea');
const editHint = $('editHint');
const pitchBytes = $('pitchBytes');
const sidepanel = $('sidepanel');
const panelToggle = $('panelToggle');
const searchInput = $<HTMLInputElement>('searchInput');
const llmStatus = $('llmStatus');
const settingsForm = $<HTMLFormElement>('settingsForm');
const llmUrlInput = $<HTMLInputElement>('llmUrlInput');
const llmTokenInput = $<HTMLInputElement>('llmTokenInput');
const settingsClear = $('settingsClear');
const settingsStatus = $('settingsStatus');

// ============================================
// Estado global de la app
// ============================================
let currentSceneIdx = 0;
let engineOk = false; // WebGPU inicializado y renderizando
let currentYaml = ''; // receta actual (raw) — para copiar
let editMode = false;
let editDebounce: ReturnType<typeof setTimeout> | null = null;

type ViewId = 'crear' | 'explorar' | 'porque' | 'ajustes';
let activeView: ViewId = 'crear';

// Dispositivo: en touch/Quest no hay teclado → manda el control de arrastre
// (D-2109). La calidad de render por dispositivo la decide el preset del
// engine (T-213, absorbe D-2110/D-2112).
const HAS_FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function resolveQualityPreset(): QualityPreset {
  const q = new URLSearchParams(window.location.search).get('quality');
  if (q && q in QUALITY_PRESETS) return q as QualityPreset;
  try {
    const saved = window.localStorage.getItem('m13_quality');
    if (saved && saved in QUALITY_PRESETS) return saved as QualityPreset;
  } catch {
    /* noop */
  }
  return detectQualityPreset();
}
let activePreset: QualityPreset = resolveQualityPreset();

function fail(msg: string): void {
  errorMsg.textContent = msg;
  errorScreen.classList.add('show');
  // eslint-disable-next-line no-console
  console.error('[m13]', msg);
}

function setSceneBytes(bytes: number): void {
  pitchBytes.textContent = bytes > 0 ? bytes.toLocaleString('es-MX') + ' B' : '--';
}

// ============================================
// Línea de tarea del agente (arriba del documento)
// ============================================
function taskBusy(text: string): void {
  taskSpinner.hidden = false;
  taskText.textContent = text;
  taskLine.classList.add('busy');
  taskLine.classList.remove('done');
}

function taskDone(text: string): void {
  taskSpinner.hidden = true;
  taskText.textContent = text;
  taskLine.classList.remove('busy');
  taskLine.classList.add('done');
}

function taskIdle(text: string): void {
  taskSpinner.hidden = true;
  taskText.textContent = text;
  taskLine.classList.remove('busy', 'done');
}

// ============================================
// Modo edición del panel Receta (SC-7)
// ============================================
function enterEditMode(): void {
  editMode = true;
  recipeCode.hidden = true;
  recipeTextarea.value = currentYaml;
  recipeTextarea.hidden = false;
  editHint.hidden = false;
  recipeEdit.textContent = 'vista';
  recipeEdit.classList.add('active');
  recipeTextarea.focus();
}

function exitEditMode(): void {
  if (!editMode) return;
  editMode = false;
  if (editDebounce) { clearTimeout(editDebounce); editDebounce = null; }
  recipeTextarea.hidden = true;
  editHint.hidden = true;
  recipeCode.hidden = false;
  recipeEdit.textContent = 'editar';
  recipeEdit.classList.remove('active');
}

recipeEdit.addEventListener('click', () => {
  if (editMode) exitEditMode();
  else enterEditMode();
});

recipeTextarea.addEventListener('input', () => {
  if (editDebounce) clearTimeout(editDebounce);
  editDebounce = setTimeout(() => {
    editDebounce = null;
    const yaml = recipeTextarea.value;
    currentYaml = yaml;
    const bytes = new TextEncoder().encode(yaml).length;
    setSceneBytes(bytes);
    recipeWeight.textContent = `esta escena pesa ${bytes.toLocaleString('es-MX')} bytes — editada en vivo`;
    if (!engineOk) return;
    void engine.loadScene(yaml).catch((err: Error) => {
      taskIdle('error en receta: ' + err.message);
    });
  }, 250);
});

// ============================================
// Status bar — indicador LLM
// ============================================
function refreshLlmStatus(): void {
  if (hasLlmEndpoint()) {
    llmStatus.textContent = '🤖 IA conectada';
    llmStatus.classList.add('connected');
  } else {
    llmStatus.textContent = '⚡ local sin IA';
    llmStatus.classList.remove('connected');
  }
}

// ============================================
// Vistas (rail izquierdo)
// ============================================
function setView(view: ViewId): void {
  activeView = view;
  document.body.dataset.view = view;
  Array.from(rail.querySelectorAll('button')).forEach((b) => {
    b.classList.toggle('active', b.dataset.viewBtn === view);
  });
  // Al salir de explorar, liberar pointer lock si está activo
  if (view !== 'explorar' && document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  if (view === 'explorar') {
    taskIdle('explorando escenas .m13 reales — click en el visor para caminar');
  } else if (view === 'ajustes') {
    taskIdle('configura tu endpoint LLM opcional — el render siempre es local');
  } else if (view === 'porque') {
    taskIdle('por qué m13 — benchmark real vs Three.js');
  }
  // B13: el canvas queda tapado en "porqué"/"ajustes" — pausar el raymarch
  // (batería/calor en el dispositivo del juez InnovaFest)
  if (engineOk) {
    if (view === 'porque' || view === 'ajustes') engine.stop();
    else engine.start();
  }
  requestAnimationFrame(resize);
}

// B13: pestaña oculta = motor pausado; al volver, reanuda solo si la vista renderiza
document.addEventListener('visibilitychange', () => {
  if (!engineOk) return;
  if (document.hidden) engine.stop();
  else if (activeView === 'crear' || activeView === 'explorar') engine.start();
});

rail.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (btn?.dataset.viewBtn) setView(btn.dataset.viewBtn as ViewId);
});

// ============================================
// Panel derecho colapsable
// ============================================
panelToggle.addEventListener('click', () => {
  sidepanel.classList.toggle('collapsed');
  requestAnimationFrame(resize);
  setTimeout(resize, 320); // tras la transición
});
// En móvil arranca colapsado (sheet)
if (window.innerWidth <= 760) sidepanel.classList.add('collapsed');

// ============================================
// Buscador Ctrl+K — filtra presets y escenas en vivo
// ============================================
function applySearch(): void {
  const q = searchInput.value.trim().toLowerCase();
  Array.from(chips.querySelectorAll('button')).forEach((b) => {
    b.classList.toggle('filtered-out', q !== '' && !(b.textContent ?? '').toLowerCase().includes(q));
  });
  Array.from(sceneSelector.querySelectorAll('button')).forEach((b) => {
    b.classList.toggle('filtered-out', q !== '' && !(b.textContent ?? '').toLowerCase().includes(q));
  });
  if (q !== '') chips.hidden = false;
}
searchInput.addEventListener('input', applySearch);

// ============================================
// Pantalla de entrada
// ============================================
enterBtn.addEventListener('click', () => {
  entryScreen.classList.add('hidden');
  setView('crear');
  // Primera impresión: generar una galería al instante
  void generateAndShow('galeria');
});

// ============================================
// Init engine
// ============================================
const engine = new M13Engine(canvas, {
  onFrame: (s) => {
    fpsEl.textContent = Math.round(s.fps).toString();
    sbFps.textContent = Math.round(s.fps) + ' fps · ' + s.ms.toFixed(1) + ' ms';
    msEl.textContent = s.ms.toFixed(1);
    resEl.textContent = canvas.width + '×' + canvas.height;
    cxEl.textContent = s.cameraPos[0].toFixed(2);
    cyEl.textContent = s.cameraPos[1].toFixed(2);
    czEl.textContent = s.cameraPos[2].toFixed(2);
    ampEl.textContent = s.audioAmplitude.toFixed(2);
  },
});
engine.setQuality(activePreset);
const audio = engine.attachAudioInput();

// Árbol de escenas (panel derecho)
sceneCount.textContent = SCENES.length.toString();
SCENES.forEach((scene, i) => {
  const btn = document.createElement('button');
  btn.dataset.idx = i.toString();
  btn.innerHTML = '<span class="num">' + (i + 1) + '</span>' + scene.label + '.m13';
  btn.title = scene.description;
  btn.addEventListener('click', () => void loadIdx(i));
  sceneSelector.appendChild(btn);
});

function updateSelector(): void {
  Array.from(sceneSelector.children).forEach((btn, i) => {
    btn.classList.toggle('active', i === currentSceneIdx);
  });
}

// ============================================
// Resize — el canvas vive dentro del "documento"
// ============================================
// Override fino de resolución sin redeploy: ?dpr=0.6 (clamp 0.3..2).
// Sin override, manda el renderScale del preset de calidad activo (T-213).
const DPR_OVERRIDE = (() => {
  const q = parseFloat(new URLSearchParams(window.location.search).get('dpr') ?? '');
  return Number.isFinite(q) ? Math.min(2, Math.max(0.3, q)) : null;
})();

function resize(): void {
  const dprCap = DPR_OVERRIDE ?? engine.getQuality().renderScale;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const w = doc.clientWidth || 1;
  const h = doc.clientHeight || 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  resEl.textContent = canvas.width + '×' + canvas.height;
}
window.addEventListener('resize', resize);
if ('ResizeObserver' in window) {
  new ResizeObserver(() => resize()).observe(doc);
}

// ============================================
// Pointer lock UX (solo en vista Explorar, solo desktop)
// En touch/Quest no hay lock: el FlyCamera maneja arrastre directo
// ============================================
canvas.addEventListener('click', async () => {
  if (activeView !== 'explorar' || !HAS_FINE_POINTER) return;
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

// Hints según dispositivo + ocultar el prompt al primer toque (sin lock no
// hay pointerlockchange que lo esconda)
if (!HAS_FINE_POINTER) {
  $('promptMain').textContent = 'toca y arrastra para explorar';
  $('promptSub').textContent = 'derecha: mirar · izquierda: caminar';
  const hudControls = document.querySelector('.hud-controls');
  if (hudControls) {
    hudControls.innerHTML =
      '<div class="row"><span class="key">arrastra →</span> mirar alrededor</div>' +
      '<div class="row"><span class="key">arrastra ←</span> caminar (joystick)</div>' +
      '<div class="row">escenas: panel derecho ▥</div>';
  }
  canvas.addEventListener(
    'pointerdown',
    () => {
      if (activeView === 'explorar') prompt.classList.add('hidden');
    },
    { passive: true },
  );
}

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
// Scene loading — vista Explorar (.m13 reales)
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
    const bytes = new TextEncoder().encode(text).length;
    setSceneBytes(bytes);
    showRecipe(text, entry.label + '.m13');
    await engine.loadScene(text);
    taskDone(`Escena lista · ${bytes.toLocaleString('es-MX')} bytes · $0 IA esta vista`);
  } catch (err) {
    fail((err as Error).message ?? String(err));
    throw err;
  }
}

// ============================================
// Receta — render como archivo de código con
// números de línea y syntax highlight sutil
// ============================================
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightYamlLine(line: string): string {
  const esc = escapeHtml(line);
  if (/^\s*#/.test(esc)) return `<span class="tok-comment">${esc}</span>`;
  return esc
    .replace(/^(\s*-?\s*)([\w_.-]+)(:)/, '$1<span class="tok-key">$2</span>$3')
    .replace(/(&quot;.*?&quot;)/g, '<span class="tok-str">$1</span>')
    .replace(/(?<=[\s\[,:])(-?\d+\.?\d*)(?=[\s\],]|$)/g, '<span class="tok-num">$1</span>');
}

function showRecipe(yaml: string, fileName = 'escena.m13'): void {
  exitEditMode(); // volver a vista si estaba editando
  currentYaml = yaml;
  const bytes = new TextEncoder().encode(yaml).length;
  setSceneBytes(bytes);
  const lines = yaml.split('\n');
  recipeCode.innerHTML = lines
    .map(
      (l, i) =>
        `<div class="code-line"><span class="ln">${i + 1}</span><span class="lc">${highlightYamlLine(l) || '&nbsp;'}</span></div>`,
    )
    .join('');
  recipeName.textContent = `${fileName} · ${bytes.toLocaleString('es-MX')} bytes`;
  recipeWeight.textContent = `esta escena pesa ${bytes.toLocaleString('es-MX')} bytes — una imagen equivalente pesa ~60 KB`;
  recipePanel.dataset.empty = 'false';
  recipeEdit.hidden = false;
  recipeShare.hidden = false;
}

// ============================================
// Vista Crear — generación local + LLM opcional
// ============================================
const FALLBACK_NOTE =
  '⚡ Generado localmente sin IA — la generación con IA en vivo se habilita conectando un endpoint (modo demo)';

async function renderYaml(yaml: string, fileName?: string): Promise<void> {
  showRecipe(yaml, fileName);
  if (!engineOk) {
    renderNote.textContent =
      'render no disponible en este dispositivo (requiere WebGPU) — la receta es la escena completa';
    return;
  }
  renderNote.textContent = '';
  try {
    await engine.loadScene(yaml);
  } catch (err) {
    taskIdle('la escena generada no validó: ' + ((err as Error).message ?? String(err)));
  }
}

async function generateAndShow(style: StyleId): Promise<void> {
  const label = STYLES.find((s) => s.id === style)?.label ?? style;
  taskBusy(`Generando ${label.toLowerCase()}…`);
  const result = generateScene(style);
  sceneNameEl.textContent = result.label + ' (generada)';
  sceneDescEl.textContent = 'Escena paramétrica generada localmente — seed ' + result.seed;
  await renderYaml(result.yaml, style + '.m13');
  const bytes = new TextEncoder().encode(result.yaml).length;
  taskDone(`Escena lista · ${bytes.toLocaleString('es-MX')} bytes · $0 IA esta vista · seed ${result.seed}`);
}

// Chips de presets (botón + del composer)
STYLES.forEach((s) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = s.label;
  btn.addEventListener('click', () => void generateAndShow(s.id));
  chips.appendChild(btn);
});

chipsToggle.addEventListener('click', () => {
  chips.hidden = !chips.hidden;
  chipsToggle.classList.toggle('open', !chips.hidden);
});

// Prompt libre — LLM si hay endpoint, fallback local honesto si no
promptForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = promptInput.value.trim();
  if (!text) return;
  void (async () => {
    promptBtn.disabled = true;
    if (hasLlmEndpoint()) {
      taskBusy('Generando con IA (editor-time)…');
      try {
        const yaml = await generateWithLlm(text);
        await renderYaml(yaml, 'escena.m13');
        const bytes = new TextEncoder().encode(yaml).length;
        taskDone(`✓ generada con IA · ${bytes.toLocaleString('es-MX')} bytes · el render es 100% local, $0 esta vista`);
        promptBtn.disabled = false;
        return;
      } catch (err) {
        taskIdle('el endpoint LLM falló (' + ((err as Error).message ?? '') + ') — usando generador local');
      }
    }
    taskBusy('Generando escena localmente…');
    const result = generateFromPrompt(text);
    await renderYaml(result.yaml, 'escena.m13');
    taskDone(FALLBACK_NOTE);
    promptBtn.disabled = false;
  })();
});

// ============================================
// Share links — la URL ES la escena (local-first,
// cero backend: base64url del YAML en el hash)
// ============================================
function encodeSceneHash(yaml: string): string {
  const bytes = new TextEncoder().encode(yaml);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeSceneHash(encoded: string): string {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readSharedScene(): string | null {
  const m = window.location.hash.match(/^#scene=(.+)$/);
  if (!m) return null;
  try {
    return decodeSceneHash(m[1]!);
  } catch {
    return null;
  }
}

// ============================================
// Modo A/B Sonido 13 (T-221, gate Gato): ?s13=on|off
// Escena de prueba INLINE — no toca la lista SCENES ni el precache del SW. El toggle
// alterna el material de TODO el mundo de piedra entre piedra_volcanica (off, detalle
// fijo de 5 octavas) y piedra_volcanica_s13 (on, detalle continuo por footprint).
// Mismo mundo en ambos modos → comparación directa caminando cerca/lejos.
// ============================================
function readS13Mode(): 'on' | 'off' | null {
  const v = new URLSearchParams(window.location.search).get('s13');
  if (v === 'on') return 'on';
  if (v === 'off') return 'off';
  return null;
}

function buildS13TestScene(matId: string): string {
  return [
    'version: "0.1"',
    'name: s13_test',
    'description: "A/B Sonido 13 — detalle continuo en piedra (T-221)"',
    'bounds: [8, 4, 16]',
    'spawn: [0, 0, 13]',
    'ambient:',
    '  background: [0.04, 0.035, 0.03]',
    '  fogColor: [0.05, 0.04, 0.03]',
    '  fogDensity: 0.012',
    'light:',
    '  position: [3, 3.2, 3]',
    '  color: [1.0, 0.84, 0.58]',
    '  intensity: 1.7',
    `walls: { concept: ${matId} }`,
    `floor: { concept: ${matId} }`,
    `ceiling: { concept: ${matId} }`,
    'objects:',
    '  - id: monolito',
    '    kind: box',
    `    material: ${matId}`,
    '    position: [0, -0.8, 0]',
    '    scale: [1.4, 2.2, 1.0]',
    '  - id: muro_glifos',
    '    kind: box',
    `    material: ${matId}`,
    '    position: [0, -0.6, -4.5]',
    '    scale: [3.2, 2.2, 0.3]',
    '',
  ].join('\n');
}

function showS13Banner(mode: 'on' | 'off'): void {
  const other = mode === 'on' ? 'off' : 'on';
  let el = document.getElementById('s13Banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 's13Banner';
    el.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;text-align:center;' +
      'max-width:92vw;background:rgba(10,12,10,0.86);color:#e8e0d0;font:12px/1.6 "JetBrains Mono",monospace;' +
      'padding:8px 14px;border:1px solid #c9a227;border-radius:8px;backdrop-filter:blur(6px)';
    document.body.appendChild(el);
  }
  el.innerHTML =
    'A/B Sonido 13 · modo <b style="color:#c9a227">S13 ' +
    mode.toUpperCase() +
    '</b> · ' +
    '<a href="?s13=' +
    other +
    '" style="color:#9ecbff">comparar S13 ' +
    other.toUpperCase() +
    '</a>' +
    '<br><span style="opacity:.78">click en el visor para entrar · <b>W A S D</b> caminar · mouse mirar · ' +
    '<b>Espacio/Shift</b> subir·bajar · <b>Esc</b> soltar</span>';
}

recipeShare.addEventListener('click', () => {
  if (!currentYaml) return;
  const url = window.location.origin + window.location.pathname + '#scene=' + encodeSceneHash(currentYaml);
  void navigator.clipboard
    .writeText(url)
    .then(() => {
      recipeShare.textContent = 'link copiado ✓';
      taskDone('link copiado — quien lo abra recibe el mundo 3D completo en la URL, sin backend');
      setTimeout(() => (recipeShare.textContent = 'compartir'), 1800);
    })
    .catch(() => {
      recipeShare.textContent = 'error';
    });
});

// Copiar receta
recipeCopy.addEventListener('click', () => {
  void navigator.clipboard
    .writeText(currentYaml)
    .then(() => {
      recipeCopy.textContent = 'copiado ✓';
      setTimeout(() => (recipeCopy.textContent = 'copiar'), 1500);
    })
    .catch(() => {
      recipeCopy.textContent = 'error';
    });
});

// ============================================
// Ajustes — endpoint LLM + token (localStorage)
// ============================================
function loadSettings(): void {
  try {
    llmUrlInput.value = getLlmUrl() ?? '';
    llmTokenInput.value = window.localStorage.getItem('m13_llm_token') ?? '';
  } catch {
    /* localStorage bloqueado */
  }
}

settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    const url = llmUrlInput.value.trim();
    const token = llmTokenInput.value.trim();
    if (url) window.localStorage.setItem('m13_llm_url', url);
    else window.localStorage.removeItem('m13_llm_url');
    if (token) window.localStorage.setItem('m13_llm_token', token);
    else window.localStorage.removeItem('m13_llm_token');
    settingsStatus.textContent = '✓ guardado en localStorage';
  } catch {
    settingsStatus.textContent = 'localStorage no disponible en este navegador';
  }
  refreshLlmStatus();
  setTimeout(() => (settingsStatus.textContent = ''), 2500);
});

// Selector de calidad (T-214) — cambia preset EN VIVO sin recargar escena
const qualitySelect = $<HTMLSelectElement>('qualitySelect');
try {
  qualitySelect.value = window.localStorage.getItem('m13_quality') ?? 'auto';
} catch {
  /* noop */
}
qualitySelect.addEventListener('change', () => {
  const v = qualitySelect.value;
  activePreset = v === 'auto' ? detectQualityPreset() : (v as QualityPreset);
  engine.setQuality(activePreset);
  resize();
  try {
    if (v === 'auto') window.localStorage.removeItem('m13_quality');
    else window.localStorage.setItem('m13_quality', v);
  } catch {
    /* noop */
  }
  taskDone(`calidad: ${activePreset} · ${engine.getQuality().maxSteps} steps · escala ${engine.getQuality().renderScale}`);
});

settingsClear.addEventListener('click', () => {
  try {
    window.localStorage.removeItem('m13_llm_url');
    window.localStorage.removeItem('m13_llm_token');
  } catch {
    /* noop */
  }
  llmUrlInput.value = '';
  llmTokenInput.value = '';
  settingsStatus.textContent = '✓ endpoint borrado — modo local';
  refreshLlmStatus();
  setTimeout(() => (settingsStatus.textContent = ''), 2500);
});

// ============================================
// Keyboard hotkeys
// ============================================
document.addEventListener('keydown', (e) => {
  // Ctrl+K → enfocar el buscador
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
    e.preventDefault();
    searchInput.focus();
    return;
  }
  // No interceptar mientras se escribe en un input
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  if (e.code === 'KeyP') {
    document.body.classList.toggle('pitch');
    return;
  }
  if (activeView !== 'explorar') return;
  if (e.code === 'KeyM') void toggleAudio();
  const m = e.code.match(/^Digit(\d)$/);
  if (m) {
    const idx = parseInt(m[1]!, 10) - 1;
    if (idx >= 0 && idx < SCENES.length) void loadIdx(idx);
  }
});

// ============================================
// PWA — registro del service worker + instalar (T-202/T-203)
// ============================================
declare const __BUILD_HASH__: string;

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js?v=' + __BUILD_HASH__).catch(() => {
    /* sin SW no pasa nada — la app funciona igual online */
  });
  navigator.serviceWorker.addEventListener('message', (e) => {
    if ((e.data as { type?: string })?.type === 'm13-updated') {
      taskIdle('nueva versión de m13 disponible — recarga cuando gustes');
    }
  });
}

let installPrompt: (Event & { prompt: () => Promise<void> }) | null = null;
const installBtn = $<HTMLButtonElement>('installBtn');
const installSep = $('installSep');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e as Event & { prompt: () => Promise<void> };
  installBtn.hidden = false;
  installSep.hidden = false;
});

installBtn.addEventListener('click', () => {
  if (installPrompt) {
    void installPrompt.prompt();
    installPrompt = null;
    installBtn.hidden = true;
    installSep.hidden = true;
  }
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  installSep.hidden = true;
  taskDone('m13 instalada como app ✓');
});

// ============================================
// Boot
// ============================================
refreshLlmStatus();
loadSettings();

(async () => {
  if (!('gpu' in navigator)) {
    fail(
      'WebGPU no disponible. Usa Chrome/Edge 113+, Safari Technology Preview con flag, o el navegador del Quest 3.\n\nLas vistas "Crear" y "Por qué m13" funcionan igual: la generación de recetas .m13 es 100% local y no necesita GPU.',
    );
    renderNote.textContent =
      'render no disponible en este dispositivo (requiere WebGPU) — la generación de recetas funciona igual';
    taskIdle('sin WebGPU — la generación de recetas .m13 funciona igual, 100% local');
    return;
  }
  resize();
  engine.attachFlyCamera();
  const s13Mode = readS13Mode();
  const shared = readSharedScene();
  try {
    if (s13Mode !== null) {
      // Modo A/B Sonido 13 (T-224): toggle GLOBAL del detalle continuo. Misma escena de
      // piedra; on = detalle continuo (default), off = octavas fijas (look Fase 1).
      entryScreen.classList.add('hidden');
      setView('crear');
      const yaml = buildS13TestScene('piedra_volcanica');
      sceneNameEl.textContent = `A/B Sonido 13 — S13 ${s13Mode.toUpperCase()}`;
      sceneDescEl.textContent =
        s13Mode === 'on'
          ? 'Detalle CONTINUO (Sonido 13): menos shimmer de lejos, más finura de cerca.'
          : 'Detalle FIJO (octavas constantes, look Fase 1). Acércate y aléjate para comparar.';
      showRecipe(yaml, 's13_test.m13');
      await engine.loadScene(yaml);
      engine.setQuality({ continuousDetail: s13Mode === 'on' });
      showS13Banner(s13Mode);
      taskDone(`modo A/B Sonido 13 — S13 ${s13Mode.toUpperCase()} · usa el banner para alternar`);
    } else if (shared !== null) {
      // Link compartido: la URL trae el mundo completo — entrar directo
      entryScreen.classList.add('hidden');
      setView('crear');
      sceneNameEl.textContent = 'escena compartida';
      sceneDescEl.textContent = 'Mundo 3D recibido por URL — cero descarga, cero backend.';
      showRecipe(shared, 'compartida.m13');
      await engine.loadScene(shared);
      const bytes = new TextEncoder().encode(shared).length;
      taskDone(`mundo recibido por link · ${bytes.toLocaleString('es-MX')} bytes viajaron en la URL`);
    } else {
      await loadIdx(0);
    }
    engine.start();
    engineOk = true;
  } catch (err) {
    if (s13Mode !== null || shared !== null) fail((err as Error).message ?? String(err));
    /* loadIdx ya maneja su propio error */
  }
})();
