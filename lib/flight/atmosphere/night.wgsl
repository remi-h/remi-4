// The night side of the Stockholm → Tokyo flight, added to the physically based sky: stars, the
// aurora to the north, and city lights on the ground that slide past as the plane flies.
// Planet-centric kilometres like atmosphere-common.wgsl; the camera flies along +Z, so north is -X.

export struct Night {
  time: f32,
  /** km flown along +Z: the ground (and its lights) slides back by this much. */
  travel: f32,
  /** HDR scale of the star field; 0 by day. */
  stars: f32,
  /** HDR scale of the aurora; 0 outside the Arctic stretch of the route. */
  aurora: f32,
  /** HDR scale of the city lights; high over Stockholm and Tokyo, sparse in between. */
  city: f32,
  /** 0..1 how built-up the ground is: Stockholm at the start, Tokyo at the end. */
  urban: f32,
  pad0: f32,
  pad1: f32,
};

fn hashU(p: vec2u) -> u32 {
  var v = p * 1664525u + 1013904223u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> vec2u(16u);
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> vec2u(16u);
  return v.x ^ v.y;
}

fn hash21(p: vec2f) -> f32 {
  return f32(hashU(bitcast<vec2u>(vec2i(floor(p)))) >> 8u) / 16777216.0;
}

fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2f(1.0, 0.0)), u.x), mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x), u.y);
}

fn fbm(p: vec2f) -> f32 {
  var q = p;
  var a = 0.5;
  var sum = 0.0;
  for (var i = 0; i < 5; i += 1) {
    sum += valueNoise(q) * a;
    q = q * 2.03 + vec2f(17.1, 3.7);
    a *= 0.5;
  }
  return sum;
}

/** Stars as tiny discs on a direction grid, with a steep brightness distribution and a slow twinkle. */
export fn stars(n: Night, dir: vec3f, pixelAngle: f32) -> vec3f {
  if (n.stars <= 0.0 || dir.y < -0.05) { return vec3f(0.0); }
  let cells = 700.0;
  let sp = vec2f(atan2(dir.x, dir.z), asin(clamp(dir.y, -1.0, 1.0))) * cells / 3.14159265;
  let cell = floor(sp);
  let h = hash21(cell);
  if (h < 0.965) { return vec3f(0.0); }
  let offset = vec2f(hash21(cell + 11.0), hash21(cell + 23.0)) * 0.8 + 0.1;
  // Angular distance to the star, in pixels: keeps every star one pixel wide at any resolution.
  let d = length(fract(sp) - offset) * 3.14159265 / cells / max(pixelAngle, 1e-5);
  let magnitude = pow((h - 0.965) / 0.035, 8.0);
  let twinkle = 0.75 + 0.25 * sin(n.time * (1.5 + h * 3.0) + h * 91.0);
  let tint = mix(vec3f(0.75, 0.82, 1.0), vec3f(1.0, 0.88, 0.75), hash21(cell + 5.0));
  return tint * magnitude * twinkle * exp(-d * d * 2.2) * n.stars;
}

fn shellExit(origin: vec3f, dir: vec3f, radius: f32) -> f32 {
  let b = dot(dir, origin);
  let c = dot(origin, origin) - radius * radius;
  let delta = b * b - c;
  if (delta < 0.0) { return -1.0; }
  return -b + sqrt(delta);
}

/**
 * The aurora: emission marched through the 100–260 km shell. Curtains run east-west (along Z) a few
 * hundred km north (−X), folding slowly; green oxygen light low in the curtain, red at the top, and fine
 * vertical rays. Returned as luminance seen from the camera.
 */
export fn aurora(n: Night, origin: vec3f, dir: vec3f, groundRadius: f32) -> vec3f {
  if (n.aurora <= 0.0 || dir.y < -0.02) { return vec3f(0.0); }
  let t0 = shellExit(origin, dir, groundRadius + 100.0);
  let t1 = min(shellExit(origin, dir, groundRadius + 260.0), t0 + 2200.0);
  if (t0 < 0.0 || t1 <= t0) { return vec3f(0.0); }
  let steps = 32;
  let dt = (t1 - t0) / f32(steps);
  // A per-direction offset of the samples turns the march's layering into fine grain.
  let jitter = f32(hashU(bitcast<vec2u>(dir.xy * 4096.0 + dir.z)) >> 8u) / 16777216.0;
  var sum = vec3f(0.0);
  for (var i = 0; i < steps; i += 1) {
    let p = origin + dir * (t0 + (f32(i) + jitter) * dt);
    let altitude = length(p) - groundRadius;
    let z = p.z + n.travel * 0.15;
    // Two octaves are plenty for the folds; the march runs this at every step.
    let fold = 160.0 * sin(z / 380.0 + n.time * 0.015) + 110.0 * (valueNoise(vec2f(z / 180.0, n.time * 0.012)) * 0.65 + valueNoise(vec2f(z / 90.0, 3.0)) * 0.35 - 0.5);
    let across = (p.x - (-420.0 + fold)) / 9.0;
    // The curtain's lower edge is sharp and its glow fades upwards; rays are thin vertical streaks along it.
    var curtain = exp(-across * across);
    if (curtain < 0.01) { continue; }
    let rays = 0.15 + 0.85 * pow(valueNoise(vec2f(z / 1.6, n.time * 0.1)) * valueNoise(vec2f(z / 5.0 + 3.0, n.time * 0.05)), 1.5) * 2.0;
    let lower = smoothstep(95.0, 115.0, altitude) * exp(-max(altitude - 115.0, 0.0) / 35.0);
    let upper = smoothstep(150.0, 200.0, altitude) * exp(-max(altitude - 200.0, 0.0) / 50.0);
    let green = vec3f(0.12, 1.0, 0.42) * lower;
    let red = vec3f(0.85, 0.12, 0.25) * upper * 0.35;
    sum += (green + red) * curtain * rays * dt;
  }
  return sum * n.aurora * 0.004;
}

/** City lights on the ground at a tangent-plane position (km): clustered towns, brighter over the cities at each end. */
export fn cityLights(n: Night, xz: vec2f) -> vec3f {
  if (n.city <= 0.0) { return vec3f(0.0); }
  let p = vec2f(xz.x, xz.y + n.travel);
  let towns = smoothstep(mix(0.62, 0.42, n.urban), mix(0.8, 0.6, n.urban), fbm(p / 18.0));
  if (towns <= 0.0) { return vec3f(0.0); }
  let streets = 0.35 + 0.65 * valueNoise(p / 0.6) * valueNoise(p / 0.23 + 7.0);
  let warm = mix(vec3f(1.0, 0.52, 0.18), vec3f(0.95, 0.9, 1.0), smoothstep(0.6, 0.9, valueNoise(p / 4.0)));
  return warm * towns * streets * n.city;
}
