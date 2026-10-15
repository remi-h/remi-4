// Remi's business card on /.secret/card: ink card stock under a clear glass coat, printed type, a
// holographic foil (diffraction grating), a hot foil seal and two sizes of glitter. One full-screen pass
// ray-traces the card as a plane that turns towards the pointer (lib/card/motion.ts) and flips over.
// The diffraction model is adapted from vgpu's Holographic Card example (after Jos Stam, GPU Gems ch. 8).

struct Params {
  resolution: vec2f,
  tilt: vec2f,
  light: vec2f,
  flip: f32,
  time: f32,
}
@group(0) @binding(0) var<uniform> params: Params;
// Front on the top half, back on the bottom: r print, g cyan print, b holographic foil, a hot seal.
@group(0) @binding(1) var faces: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;

const PI = 3.14159265;
const ASPECT = 1.5454545; // 85 × 55 mm
const HALF = vec2f(1.0, 1.0 / ASPECT);
const SPAN = 2.5;
const INK = vec3f(0.028, 0.032, 0.048);
const PRINT = vec3f(0.87, 0.89, 0.94);
const CYAN = vec3f(0.13, 0.9, 0.83);
const HOT = vec3f(1.0, 0.29, 0.17);

fn box(p: vec2f, half: vec2f, radius: f32) -> f32 {
  let q = abs(p) - half + radius;
  return length(max(q, vec2f(0))) + min(max(q.x, q.y), 0.0) - radius;
}

fn hash(cell: vec2i, seed: u32) -> vec4f {
  var v = vec4u(bitcast<u32>(cell.x), bitcast<u32>(cell.y), seed, 0x9e3779b9u) * 1664525u + 1013904223u;
  v.x += v.y * v.w; v.y += v.z * v.x; v.z += v.x * v.y; v.w += v.y * v.z;
  v = v ^ (v >> vec4u(16u));
  v.x += v.y * v.w; v.y += v.z * v.x; v.z += v.x * v.y; v.w += v.y * v.z;
  return vec4f(v) / 4294967295.0;
}

// Visible wavelengths (micrometres) to display RGB, smooth responses.
fn spectrum(wavelength: f32) -> vec3f {
  let r = (vec3f(wavelength) - vec3f(0.610, 0.545, 0.460)) / vec3f(0.045, 0.038, 0.032);
  let visible = smoothstep(0.380, 0.410, wavelength) * (1.0 - smoothstep(0.700, 0.780, wavelength));
  return exp(-0.5 * r * r) * visible;
}

// Reflection grating: m · wavelength = d · (L + V) · across, for the first three orders.
fn diffraction(across: vec2f, lightAndView: vec2f, spacing: f32) -> vec3f {
  let path = spacing * abs(dot(lightAndView, across));
  let along = dot(lightAndView, vec2f(-across.y, across.x));
  let envelope = exp(-along * along / 0.5);
  var color = vec3f(0);
  for (var order = 1; order <= 3; order++) {
    let m = f32(order);
    color += spectrum(path / m) / (m * m);
  }
  return color * envelope;
}

fn pearl(phase: f32) -> vec3f {
  return vec3f(0.5, 0.5, 0.58) + vec3f(0.5, 0.48, 0.42) * cos(2.0 * PI * (phase + vec3f(0.0, 0.33, 0.67)));
}

// A softbox studio the glass reflects: a diagonal strip and a wide one overhead.
fn studio(r: vec3f) -> vec3f {
  let diagonal = (r.x * 0.8 + r.y * 0.6 + 0.12) / 0.06;
  let overhead = (r.y + 0.5) / 0.14;
  return vec3f(0.8, 0.9, 1.0) * exp(-diagonal * diagonal) * 0.55
    + vec3f(1.0, 0.96, 0.92) * exp(-overhead * overhead) * smoothstep(0.9, 0.2, abs(r.x)) * 0.3;
}

struct Basis {
  normal: vec3f,
  right: vec3f,
  down: vec3f,
}

// Flakes in a grid of `cells` across the card, each tipped at random: a flake flashes when it
// mirrors the light into your eye, in a colour set by how it splits the light.
fn glitter(face: vec2f, cells: f32, seed: u32, density: f32, b: Basis, toLight: vec3f, toEye: vec3f, aa: f32) -> vec3f {
  let g = face * cells;
  let cell = vec2i(floor(g));
  let h = hash(cell, seed);
  if (h.w > density) {
    return vec3f(0);
  }
  let centre = vec2f(cell) + 0.25 + h.xy * 0.5;
  let radius = 0.22 + h.z * 0.14;
  let shape = 1.0 - smoothstep(radius - aa * cells, radius + aa * cells, length(g - centre));
  let k = hash(cell, seed + 7u);
  let flake = normalize(b.normal + (b.right * (k.x - 0.5) + b.down * (k.y - 0.5)) * 0.9);
  let half = normalize(toLight + toEye);
  let mirror = pow(max(dot(flake, half), 0.0), 900.0);
  let studioFlash = studio(reflect(-toEye, flake));
  let twinkle = 0.75 + 0.25 * sin(params.time * (1.5 + k.w * 2.0) + k.z * 40.0);
  let tint = mix(vec3f(1.0), spectrum(0.40 + k.z * 0.30) * 1.8, 0.55);
  return shape * (tint * mirror * 4.0 + vec3f(dot(studioFlash, vec3f(0.33)) * 0.5)) * twinkle;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let resolution = max(params.resolution, vec2f(1));
  let scale = min(resolution.y * ASPECT * 1.05, resolution.x);
  let screen = (uv - 0.5) * resolution / scale * SPAN;

  // The card's frame: turned towards the pointer (yaw, pitch) and flipped about its vertical axis.
  let yaw = params.tilt.x + params.flip * PI;
  let pitch = params.tilt.y;
  let sy = sin(yaw);
  let cy = cos(yaw);
  let sp = sin(pitch);
  let cp = cos(pitch);
  let right = vec3f(cy, 0.0, -sy);
  let down = vec3f(sy * sp, cp, cy * sp);
  let normal = cross(right, down);
  let eye = vec3f(0.0, 0.0, 6.0);
  let ray = normalize(vec3f(screen, -6.0));
  let facing = dot(ray, normal);
  let hit = eye - ray * (dot(eye, normal) / select(facing, -1e-4, abs(facing) < 1e-4));
  let p = vec2f(dot(hit, right), dot(hit, down));
  let aa = max(length(fwidth(p)), 0.0005);

  // The back is seen through the card, so its x runs the other way.
  let front = facing < 0.0;
  let face = select(vec2f(-p.x, p.y), p, front);
  let side = select(-1.0, 1.0, front);
  let b = Basis(normal * side, right * side, down);

  let edge = box(p, HALF, 0.03);
  let inside = (1.0 - smoothstep(-aa, aa, edge)) * step(0.0, dot(hit - eye, ray));

  // A soft shadow on the page, narrowing as the card turns edge-on.
  let width = max(abs(cy), 0.04);
  let shadowShape = box(screen - vec2f(0.06, 0.16), HALF * vec2f(width, 0.98), 0.08);
  let shadow = 0.6 * exp(-max(shadowShape, 0.0) * 7.0);

  let toEye = normalize(eye - hit);
  let lightPos = vec3f(params.light, 2.6);
  let toLight = normalize(lightPos - hit);
  let n = b.normal;
  let diffuse = max(dot(n, toLight), 0.0);
  let sum = toLight + toEye;
  let lightAndView = vec2f(dot(sum, b.right), dot(sum, b.down));

  // Print sits under the glass coat: it shifts with the view (parallax) and splits a little at the edges.
  let coat = 0.012;
  let shift = vec2f(dot(toEye, b.right), dot(toEye, b.down)) / max(dot(toEye, n), 0.2) * coat;
  let base = face / (2.0 * HALF) + 0.5;
  let row = select(0.5, 0.0, front);
  let at = vec2f(base.x, clamp(base.y, 0.001, 0.999) * 0.5 + row);
  let layers = textureSampleLevel(faces, linear, at - vec2f(shift.x, shift.y * 0.5), 0.0);
  let red = textureSampleLevel(faces, linear, at - vec2f(shift.x, shift.y * 0.5) * 1.35, 0.0).r;
  let blue = textureSampleLevel(faces, linear, at - vec2f(shift.x, shift.y * 0.5) * 0.65, 0.0).r;

  // Ink card stock with a fine fibre grain.
  let grain = hash(vec2i(floor(face * 700.0)), 3u).x - 0.5;
  var color = INK * (0.7 + 0.9 * diffuse) + grain * 0.012;
  let spot = exp(-dot(p - params.light, p - params.light) * 1.6);
  color += INK * spot * 1.2;

  // Holographic foil: grooves in rings around a point off the corner, rainbow where they split the light.
  let ring = face - vec2f(0.7, -0.9);
  let across = normalize(ring + vec2f(1e-5, 0.0));
  let wave = sin(length(ring) * 18.0 + face.x * 3.0) * 0.08;
  let rainbow = diffraction(normalize(across + vec2f(-across.y, across.x) * wave), lightAndView, 1.6);
  let sheen = pearl(dot(lightAndView, vec2f(0.9, -0.6)) + length(ring) * 0.8 + wave);
  let foil = sheen * (0.28 + 0.5 * diffuse) * (0.6 + 0.8 * spot) + rainbow * (0.8 + 1.2 * spot) + vec3f(0.03);
  color = mix(color, foil, layers.b);

  // The seal: hot foil, with a red-gold flash as it catches the light.
  let flash = pow(max(dot(n, normalize(sum)), 0.0), 60.0);
  let seal = HOT * (0.62 + 0.45 * diffuse) + rainbow * vec3f(1.0, 0.55, 0.35) * 0.45 + vec3f(1.0, 0.7, 0.5) * flash * 0.6;
  color = mix(color, seal, layers.a);

  // Printed type, with the glass's slight colour fringe.
  let print = vec3f(red, layers.r, blue);
  color = mix(color, PRINT * (0.82 + 0.25 * diffuse), print);
  color = mix(color, CYAN * (0.8 + 0.3 * diffuse), layers.g);

  // Glitter: coarse flakes in the foil and over a diagonal sweep, fine dust everywhere.
  let sweep = smoothstep(0.55, 0.0, abs(face.x * 0.45 + face.y * 0.9 - 0.35));
  color += glitter(face, 46.0, 11u, 0.03 + 0.3 * sweep + 0.3 * layers.b, b, toLight, toEye, aa);
  color += glitter(face, 120.0, 29u, 0.2, b, toLight, toEye, aa) * 0.3;

  // The glass coat: Fresnel reflection of the studio, and a sharp highlight from the pointer light.
  let cosView = max(dot(n, toEye), 0.0);
  let fresnel = 0.04 + 0.96 * pow(1.0 - cosView, 5.0);
  let mirrored = reflect(-toEye, n);
  // The light seen in the glass: a small hot core and a soft cool bloom.
  let mirrorLight = max(dot(mirrored, toLight), 0.0);
  let highlight = vec3f(1.0, 0.98, 0.95) * pow(mirrorLight, 3000.0) * 0.9 + vec3f(0.6, 0.8, 1.0) * pow(mirrorLight, 120.0) * 0.06;
  color += studio(mirrored) * (0.18 + fresnel) + highlight;

  // The glass edge: a bright bevel, lit on the side the light comes from.
  let bevel = 1.0 - smoothstep(0.0, 0.004 + aa, abs(edge + 0.004));
  let lit = 0.25 + 0.75 * max(dot(normalize(p + vec2f(1e-5, 0.0)), normalize(params.light - p + vec2f(1e-5, 0.0))), 0.0);
  color = mix(color, vec3f(0.7, 0.86, 0.92) * (0.15 + lit * 0.7 + fresnel), bevel * 0.6);

  color = color / (1.0 + max(color - vec3f(1.0), vec3f(0)) * 0.6);
  return vec4f(color * inside, inside) + vec4f(0.0, 0.0, 0.0, shadow * (1.0 - inside));
}
