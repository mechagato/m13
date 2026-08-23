const state = {
  mcp: 'm13',
  providers: [],
  tools: [],
  messages: [],
};

const $ = (id) => document.getElementById(id);

function activeProvider() {
  return state.providers.find((p) => p.id === state.mcp);
}

async function refreshHealth() {
  const h = await fetch('/api/health').then((r) => r.json());
  const el = $('health');
  el.textContent = h.deepseek_key_present ? 'DeepSeek env OK' : 'DeepSeek key en UI/env';
  el.classList.toggle('ok', true);
}

async function refreshProviders() {
  const data = await fetch('/api/providers').then((r) => r.json());
  state.providers = data.providers || [];
  const box = $('mcpSwitch');
  box.innerHTML = '';
  for (const p of state.providers) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `mcp-btn ${p.id === state.mcp ? 'active' : ''} ${p.ready ? 'ready' : 'down'}`;
    btn.innerHTML = `<span class="name"><span class="dot">●</span> ${p.label}</span>
      <span class="meta">${p.ready ? 'listo' : 'offline'} · ${p.detail}</span>`;
    btn.onclick = () => {
      state.mcp = p.id;
      state.messages = [];
      $('chatLog').innerHTML = '';
      $('toolTrace').textContent = '';
      void refreshProviders();
      void refreshTools();
      addChat('system', `MCP activo: ${p.label}. ${p.hint || p.detail}`);
    };
    box.appendChild(btn);
  }
}

async function refreshTools() {
  const data = await fetch(`/api/tools?mcp=${state.mcp}`).then((r) => r.json());
  state.tools = data.tools || [];
  const sel = $('toolSelect');
  sel.innerHTML = '';
  for (const t of state.tools) {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.name;
    sel.appendChild(opt);
  }
  onToolChange();
}

function onToolChange() {
  const t = state.tools.find((x) => x.name === $('toolSelect').value);
  if (!t) {
    $('toolArgs').value = '{}';
    return;
  }
  const sample = {};
  const props = t.parameters?.properties || {};
  for (const [k, schema] of Object.entries(props)) {
    if (schema.enum) sample[k] = schema.enum[0];
    else if (schema.type === 'boolean') sample[k] = true;
    else if (schema.type === 'integer') sample[k] = 1;
    else if (k === 'prompt' || k === 'text') sample[k] = 'cocina lineal 2400mm';
    else if (k === 'yaml') sample[k] = 'version: "0.1"\nname: demo\nwalls: { concept: pared_yeso_blanco }\nfloor: { concept: piso_madera_envejecida }\nceiling: { concept: pared_yeso_blanco }\n';
    else if (k === 'template_id') sample[k] = 'ehs_pasillo';
    else sample[k] = '';
  }
  $('toolArgs').value = JSON.stringify(sample, null, 2);
}

function addChat(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  $('chatLog').appendChild(div);
  $('chatLog').scrollTop = $('chatLog').scrollHeight;
}

$('toolSelect').addEventListener('change', onToolChange);

$('btnCall').addEventListener('click', async () => {
  $('btnCall').disabled = true;
  try {
    const args = JSON.parse($('toolArgs').value || '{}');
    const res = await fetch('/api/tools/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mcp: state.mcp, name: $('toolSelect').value, arguments: args }),
    });
    const data = await res.json();
    $('toolOut').textContent = JSON.stringify(data, null, 2);
    $('toolOut').classList.toggle('err', !data.ok);
  } catch (err) {
    $('toolOut').textContent = String(err);
    $('toolOut').classList.add('err');
  } finally {
    $('btnCall').disabled = false;
  }
});

$('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('chatInput').value.trim();
  if (!text) return;
  $('chatInput').value = '';
  addChat('user', text);
  state.messages.push({ role: 'user', content: text });
  const btn = $('chatForm').querySelector('button');
  btn.disabled = true;
  try {
    const body = {
      mcp: state.mcp,
      messages: state.messages,
    };
    const key = $('apiKey').value.trim();
    if (key) body.api_key = key;
    const model = $('model').value.trim();
    if (model) body.model = model;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      addChat('system', `Error: ${data.error}`);
      return;
    }
    state.messages = data.messages || state.messages;
    addChat('assistant', data.assistant_text || '(sin texto)');
    $('toolTrace').textContent = JSON.stringify(data.tool_trace || [], null, 2);
  } catch (err) {
    addChat('system', String(err));
  } finally {
    btn.disabled = false;
  }
});

await refreshHealth();
await refreshProviders();
await refreshTools();
addChat(
  'system',
  'Listo. Orden: m13 → flowcad → comp3d. Prueba primero tools directos; luego chat con DeepSeek.',
);
