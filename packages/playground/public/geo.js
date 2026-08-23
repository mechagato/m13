const $ = (id) => document.getElementById(id);

let watchId = null;
let points = [];
let lastYaml = '';
let lastPlayer = '';

function setStatus(msg) {
  $('gpsStatus').textContent = msg;
}

function syncTextarea() {
  $('pathJson').value = JSON.stringify(points, null, 2);
  setStatus(`${points.length} punto(s)`);
}

function readPathFromUi() {
  const raw = JSON.parse($('pathJson').value || '[]');
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('Path JSON inválido: se necesitan ≥2 {lat,lng}');
  }
  return raw.map((p) => ({
    lat: Number(p.lat),
    lng: Number(p.lng ?? p.lon),
    t: p.t,
  }));
}

$('btnDemo').onclick = () => {
  // Centro Monterrey — trazo corto de demo
  points = [
    { lat: 25.6866, lng: -100.3161, t: Date.now() },
    { lat: 25.6872, lng: -100.3152, t: Date.now() + 1000 },
    { lat: 25.688, lng: -100.3142, t: Date.now() + 2000 },
    { lat: 25.6886, lng: -100.3133, t: Date.now() + 3000 },
  ];
  syncTextarea();
};

$('btnClear').onclick = () => {
  points = [];
  syncTextarea();
  lastYaml = '';
  $('buildOut').textContent = '';
};

$('btnStart').onclick = () => {
  if (!navigator.geolocation) {
    setStatus('Geolocalización no disponible en este browser');
    return;
  }
  points = [];
  syncTextarea();
  $('btnStart').disabled = true;
  $('btnStop').disabled = false;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const last = points[points.length - 1];
      if (last && Math.abs(last.lat - lat) < 1e-6 && Math.abs(last.lng - lng) < 1e-6) return;
      points.push({ lat, lng, t: Date.now() });
      syncTextarea();
    },
    (err) => setStatus(`GPS error: ${err.message}`),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
  );
  setStatus('Grabando GPS… camina un tramo');
};

$('btnStop').onclick = () => {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  $('btnStart').disabled = false;
  $('btnStop').disabled = true;
  setStatus(`Grabación lista · ${points.length} puntos`);
};

$('btnBuild').onclick = async () => {
  $('btnBuild').disabled = true;
  $('buildOut').classList.remove('err');
  try {
    const path = readPathFromUi();
    const res = await fetch('/api/geo/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        use_osm: $('useOsm').checked,
        name: $('sceneName').value.trim() || 'geo_twin_paseo',
      }),
    });
    const data = await res.json();
    $('buildOut').textContent = JSON.stringify(
      {
        ok: data.ok,
        stats: data.stats,
        osm: data.osm,
        player_url_local: data.player_url_local,
        share_url_public: data.share_url_public,
        note: data.note,
        error: data.error,
      },
      null,
      2,
    );
    if (!data.ok) {
      $('buildOut').classList.add('err');
      return;
    }
    lastYaml = data.yaml;
    lastPlayer = data.player_url_local;
    $('btnOpen').href = data.player_url_local;
  } catch (err) {
    $('buildOut').textContent = String(err);
    $('buildOut').classList.add('err');
  } finally {
    $('btnBuild').disabled = false;
  }
};

$('btnCopy').onclick = async () => {
  if (!lastYaml) return;
  await navigator.clipboard.writeText(lastYaml);
  setStatus('YAML copiado');
};

$('btnDownload').onclick = () => {
  if (!lastYaml) return;
  const blob = new Blob([lastYaml], { type: 'text/yaml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${$('sceneName').value || 'geo_twin'}.m13`;
  a.click();
  URL.revokeObjectURL(a.href);
};

syncTextarea();
