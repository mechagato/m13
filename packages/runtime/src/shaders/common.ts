/**
 * common.wgsl — fragmento WGSL que siempre se prepende al shader final.
 *
 * Incluye:
 *  - struct Uniforms
 *  - vertex shader (fullscreen triangle)
 *  - SDF primitives (sphere, box, round_box, cylinder, torus)
 *  - boolean operations (union, sub, smooth_union)
 *  - hash, noise3, FBM
 *  - calcNormal, raymarch, softShadow, calcAO
 */

export const COMMON_WGSL = /* wgsl */ `
struct Uniforms {
  resolution: vec2<f32>,
  time: f32,
  audioAmp: f32,
  camPos: vec3<f32>,
  _p0: f32,
  camDir: vec3<f32>,
  _p1: f32,
  camRight: vec3<f32>,
  _p2: f32,
  camUp: vec3<f32>,
  _p3: f32,
  lightPos: vec3<f32>,
  _p4: f32,
  lightColor: vec3<f32>,
  lightIntensity: f32,
  ambientColor: vec3<f32>,
  fogDensity: f32,
  fogColor: vec3<f32>,
  _p5: f32,
  tint: vec3<f32>,
  _p6: f32,
  // Layout v2 (Fase 2, D-3002 — quality y audioBands entran JUNTOS para una
  // sola migración de la zona de riesgo D-108):
  // quality: x=maxSteps, y=shadowSteps, z=aoSamples, w=octaveCap
  quality: vec4<f32>,
  // audioBands: x=bass, y=mid, z=treble, w=amplitude (compat con audioAmp)
  audioBands: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  return vec4<f32>(pos[vi], 0.0, 1.0);
}

// ---------- SDF PRIMITIVES ----------
fn sdBox(p: vec3<f32>, b: vec3<f32>) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}
fn sdSphere(p: vec3<f32>, r: f32) -> f32 { return length(p) - r; }
fn sdRoundBox(p: vec3<f32>, b: vec3<f32>, r: f32) -> f32 {
  let q = abs(p) - b + vec3<f32>(r);
  return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
fn sdCylinder(p: vec3<f32>, h: f32, r: f32) -> f32 {
  let d = vec2<f32>(length(p.xz) - r, abs(p.y) - h);
  return min(max(d.x, d.y), 0.0) + length(max(d, vec2<f32>(0.0)));
}
fn sdTorus(p: vec3<f32>, t: vec2<f32>) -> f32 {
  let q = vec2<f32>(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}
fn opSub(a: f32, b: f32) -> f32 { return max(-b, a); }
fn opUnion(a: f32, b: f32) -> f32 { return min(a, b); }
// Unión suave (polynomial smooth min, Quilez). k = radio de mezcla.
// Nota: el resultado es un bound (no distancia exacta) — válido para raymarching
// con paso conservador. Base para la subdivisión continua de Fase 2 (Sonido 13).
fn opSmoothUnion(a: f32, b: f32, k: f32) -> f32 {
  let kk = max(k, 0.0001);
  let h = clamp(0.5 + 0.5 * (b - a) / kk, 0.0, 1.0);
  return mix(b, a, h) - kk * h * (1.0 - h);
}

// ---------- HASH + NOISE ----------
fn hash3(p: vec3<f32>) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
fn noise3(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let n000 = hash3(i);
  let n100 = hash3(i + vec3<f32>(1.0, 0.0, 0.0));
  let n010 = hash3(i + vec3<f32>(0.0, 1.0, 0.0));
  let n110 = hash3(i + vec3<f32>(1.0, 1.0, 0.0));
  let n001 = hash3(i + vec3<f32>(0.0, 0.0, 1.0));
  let n101 = hash3(i + vec3<f32>(1.0, 0.0, 1.0));
  let n011 = hash3(i + vec3<f32>(0.0, 1.0, 1.0));
  let n111 = hash3(i + vec3<f32>(1.0, 1.0, 1.0));
  let nx00 = mix(n000, n100, u.x);
  let nx10 = mix(n010, n110, u.x);
  let nx01 = mix(n001, n101, u.x);
  let nx11 = mix(n011, n111, u.x);
  return mix(mix(nx00, nx10, u.y), mix(nx01, nx11, u.y), u.z);
}
fn fbm(p: vec3<f32>, octaves: i32) -> f32 {
  var total: f32 = 0.0;
  var amp: f32 = 0.5;
  var freq: f32 = 1.0;
  for (var i = 0; i < octaves; i++) {
    total = total + amp * noise3(p * freq);
    amp = amp * 0.5;
    freq = freq * 2.0;
  }
  return total;
}
// fbm_continuous (Fase 2, Sonido 13 / T-221): el número de octavas es una función
// CONTINUA del footprint del pixel (cuánto mundo cubre un pixel a esa distancia).
// Cerca → footprint chico → más octavas (más micro-detalle); lejos → footprint grande
// → menos octavas (anti-shimmer: no muestreamos frecuencias sub-pixel). La parte
// fraccional de la última octava se atenúa con smoothstep → transición microtonal
// (sin pops/popping de LOD discreto). \`minOct\` = piso de octavas; \`cap\` = u.quality.w.
// El \`p\` que se pasa ya viene escalado por la frecuencia base del material, y
// \`footprint\` debe estar en ESE mismo dominio (footprint_mundo * misma escala).
fn fbm_continuous(p: vec3<f32>, footprint: f32, minOct: f32, cap: f32) -> f32 {
  // Octava más alta resoluble: su longitud de onda (1/2^n) ≈ footprint → n = -log2(footprint).
  let nOct = clamp(-log2(max(footprint, 1e-5)), minOct, cap);
  let full = floor(nOct);
  let lastW = smoothstep(0.0, 1.0, nOct - full); // microtono: fade de la octava fraccional
  var total: f32 = 0.0;
  var amp: f32 = 0.5;
  var freq: f32 = 1.0;
  let fullI = i32(full);
  for (var i = 0; i < fullI; i++) {
    total = total + amp * noise3(p * freq);
    amp = amp * 0.5;
    freq = freq * 2.0;
  }
  total = total + amp * lastW * noise3(p * freq);
  return total;
}
// Footprint del pixel a la distancia del punto p (T-222): cuánto mundo cubre un pixel
// ahí. pixelAngle ≈ 2/resY (el raymarcher usa camRight/camUp unitarios; el fov queda
// absorbido en su magnitud). Es la entrada del detalle continuo.
fn pixelFootprint(p: vec3<f32>) -> f32 {
  return length(p - u.camPos) * (2.0 / max(u.resolution.y, 1.0));
}
// Detalle adaptativo (T-224): si u.quality.w >= 0 usa detalle CONTINUO (octavas en
// función del footprint, cap = quality.w); si es NEGATIVO, octavas FIJAS (look Fase 1).
// El signo es el toggle global del A/B Sonido 13. \`footprint\` ya viene escalado al
// dominio de \`p\`; \`minOct\` = piso continuo; \`fixedOct\` = octavas del modo fijo.
fn fbm_detail(p: vec3<f32>, footprint: f32, minOct: f32, fixedOct: i32) -> f32 {
  let cap = u.quality.w;
  if (cap < 0.0) { return fbm(p, fixedOct); }
  return fbm_continuous(p, footprint, minOct, cap);
}
`;
