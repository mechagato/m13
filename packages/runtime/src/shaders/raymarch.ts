/**
 * raymarch.wgsl — fragmento WGSL con los pasos del renderer.
 * Se prepende después de los conceptos materiales y la función map() generada.
 *
 * Contrato con el compilador: este fragmento llama a `missColor()`, que el
 * compilador SIEMPRE genera (constante de escena con `ambient.background`).
 */

export const RAYMARCH_WGSL = /* wgsl */ `
/*
 * Para Mamá — Nora Cristina Torres Morales.
 * Gracias por enseñarme que las cosas imposibles
 * solo necesitan tiempo y terquedad.
 * Este motor existe porque tú exististe.
 *
 * — G.I.G.T.
 */
// T-212 (Fase 2): la calidad ya NO está hardcodeada — viene de u.quality:
//   u.quality.x = pasos máximos de raymarch   (default 128)
//   u.quality.y = pasos de soft shadow        (default 32)
//   u.quality.z = taps de ambient occlusion   (default 5)
//   u.quality.w = octaveCap para fbm continuo (default 5 — lo consume P2)
// Defaults idénticos al comportamiento pre-T-212. Presets en engine (T-213).
// Constantes que siguen fijas: t > 80.0 distancia máxima · epsilon 0.001 de hit.
fn calcNormal(p: vec3<f32>) -> vec3<f32> {
  let e = vec2<f32>(0.0005, 0.0);
  return normalize(vec3<f32>(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

struct Hit { t: f32, hit: bool };

fn raymarch(ro: vec3<f32>, rd: vec3<f32>) -> Hit {
  var t: f32 = 0.001;
  var out: Hit;
  out.hit = false;
  let maxSteps = i32(u.quality.x);
  for (var i = 0; i < maxSteps; i++) {
    // B7: el check de distancia va ANTES de pagar el map()
    if (t > 80.0) {
      out.t = t;
      return out;
    }
    let p = ro + rd * t;
    let d = map(p);
    // B7: epsilon proporcional a t — los rayos lejanos no exigen precisión de cerca
    if (abs(d) < 0.001 * max(t, 1.0)) {
      out.hit = true;
      out.t = t;
      return out;
    }
    // B7: clamp del paso — con d<0 (interior) el rayo oscilaba sin avanzar
    t = t + max(d * 0.7, 0.0005);
  }
  // B7: agotar pasos sin salir de rango = rayo rasante pegado a una superficie.
  // Tratarlo como hit elimina los huecos "comidos" en las siluetas.
  out.hit = true;
  out.t = t;
  return out;
}

fn softShadow(ro: vec3<f32>, rd: vec3<f32>, mint: f32, maxt: f32, k: f32) -> f32 {
  var res: f32 = 1.0;
  var t: f32 = mint;
  let shadowSteps = i32(u.quality.y);
  for (var i = 0; i < shadowSteps; i++) {
    if (t > maxt) { break; }
    let h = map(ro + rd * t);
    if (h < 0.001) { return 0.0; }
    res = min(res, k * h / t);
    t = t + h * 0.7;
  }
  return clamp(res, 0.0, 1.0);
}

fn calcAO(p: vec3<f32>, n: vec3<f32>) -> f32 {
  var occ: f32 = 0.0;
  var sca: f32 = 1.0;
  let aoSamples = i32(u.quality.z);
  for (var i = 0; i < aoSamples; i++) {
    let h = 0.01 + 0.15 * f32(i) / max(f32(aoSamples - 1), 1.0);
    let d = map(p + n * h);
    occ = occ + (h - d) * sca;
    sca = sca * 0.9;
  }
  return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

// ---------- SHADING + FRAGMENT ----------
fn shade(p: vec3<f32>, rd: vec3<f32>, n: vec3<f32>) -> vec3<f32> {
  let mat = material(p, n);
  let toLight = u.lightPos - p;
  let lightDist = length(toLight);
  let lightDir = toLight / lightDist;
  let diff = max(dot(n, lightDir), 0.0);
  let atten = 1.0 / (1.0 + 0.08 * lightDist + 0.02 * lightDist * lightDist);
  let shadow = softShadow(p + n * 0.01, lightDir, 0.02, lightDist, 8.0);
  let ao = calcAO(p, n);
  let viewDir = -rd;
  let halfDir = normalize(lightDir + viewDir);
  let spec = pow(max(dot(n, halfDir), 0.0), 16.0) * 0.15;
  var col = mat * (u.ambientColor * ao + diff * u.lightColor * atten * shadow * u.lightIntensity + vec3<f32>(spec));
  col = col * u.tint;
  return col;
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = (fragCoord.xy * 2.0 - u.resolution) / u.resolution.y;
  let uvFixed = vec2<f32>(uv.x, -uv.y);
  let ro = u.camPos;
  let rd = normalize(u.camDir + u.camRight * uvFixed.x + u.camUp * uvFixed.y);
  let hit = raymarch(ro, rd);
  var col: vec3<f32>;
  if (hit.hit) {
    let p = ro + rd * hit.t;
    let n = calcNormal(p);
    col = shade(p, rd, n);
    let fog = 1.0 - exp(-hit.t * u.fogDensity);
    col = mix(col, u.fogColor, fog * 0.3);
  } else {
    // Miss: color de fondo de la escena (ambient.background), mezclado con la
    // niebla para que el horizonte no corte abrupto contra la geometría.
    col = mix(missColor(), u.fogColor, 0.25);
  }
  col = col / (1.0 + col);
  col = pow(col, vec3<f32>(0.4545));
  let vignette = smoothstep(1.5, 0.5, length(uvFixed));
  col = col * mix(0.85, 1.0, vignette);
  return vec4<f32>(col, 1.0);
}
`;
