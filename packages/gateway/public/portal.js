const $ = (id) => document.getElementById(id);

const resultEl = $('result');
const listEl = $('sceneList');

function showResult(obj, isError = false) {
  resultEl.hidden = false;
  resultEl.classList.toggle('err', isError);
  resultEl.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

async function publish() {
  const yaml = $('yaml').value;
  const classification = $('classification').value;
  const orgId = $('orgId').value.trim() || 'default';
  $('btnPublish').disabled = true;
  try {
    const res = await fetch('/v1/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Id': orgId,
      },
      body: JSON.stringify({ yaml, classification, org_id: orgId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showResult(data, true);
      return;
    }
    showResult(data);
    await refreshList();
  } catch (err) {
    showResult(String(err), true);
  } finally {
    $('btnPublish').disabled = false;
  }
}

async function loadEhs() {
  try {
    const res = await fetch('/v1/templates/ehs_pasillo');
    const data = await res.json();
    if (!res.ok) {
      showResult(data, true);
      return;
    }
    $('yaml').value = data.yaml;
    $('classification').value = data.default_classification ?? 'S2';
    showResult({ loaded: data.id, checklist: data.checklist });
  } catch (err) {
    showResult(String(err), true);
  }
}

async function refreshList() {
  const orgId = $('orgId').value.trim() || 'default';
  listEl.innerHTML = '';
  try {
    const res = await fetch(`/v1/org/scenes?org_id=${encodeURIComponent(orgId)}`, {
      headers: { 'X-Org-Id': orgId },
    });
    const data = await res.json();
    if (!res.ok) {
      listEl.innerHTML = `<li class="err">${JSON.stringify(data)}</li>`;
      return;
    }
    if (!data.scenes?.length) {
      listEl.innerHTML = '<li class="meta">Sin publicaciones aún</li>';
      return;
    }
    for (const s of data.scenes) {
      const li = document.createElement('li');
      li.innerHTML = `<div class="name">${s.name}</div>
        <div class="meta">${s.classification} · ${s.bytes} B · expira ${s.expires_at}</div>
        <div class="meta">hash ${s.scene_hash.slice(0, 16)}… · id ${s.id}</div>`;
      listEl.appendChild(li);
    }
  } catch (err) {
    listEl.innerHTML = `<li class="err">${String(err)}</li>`;
  }
}

$('btnPublish').addEventListener('click', () => void publish());
$('btnEhs').addEventListener('click', () => void loadEhs());
$('btnRefresh').addEventListener('click', () => void refreshList());
void refreshList();
