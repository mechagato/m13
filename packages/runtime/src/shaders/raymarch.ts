/**
 * raymarch.wgsl — fragmento WGSL con los pasos del renderer.
 * Se prepende después de los conceptos materiales y la función map() generada.
 */

export const RAYMARCH_WGSL = /* wgsl */ `
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
  for (var i = 0; i < 128; i++) {
    let p = ro + rd * t;
    let d = map(p);
    if (abs(d) < 0.001) {
      out.hit = true;
      out.t = t;
      return out;
    }
    if (t > 80.0) { break; }
    t = t + d * 0.7;
  }
  out.t = t;
  return out;
}

fn softShadow(ro: vec3<f32>, rd: vec3<f32>, mint: f32, maxt: f32, k: f32) -> f32 {
  var res: f32 = 1.0;
  var t: f32 = mint;
  for (var i = 0; i < 32; i++) {
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
  for (var i = 0; i < 5; i++) {
    let h = 0.01 + 0.15 * f32(i) / 4.0;
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
    col = vec3<f32>(0.0);
  }
  col = col / (1.0 + col);
  col = pow(col, vec3<f32>(0.4545));
  let vignette = smoothstep(1.5, 0.5, length(uvFixed));
  col = col * mix(0.85, 1.0, vignette);
  return vec4<f32>(col, 1.0);
}
`;
