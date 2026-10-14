// The plane you board: a raymarched airliner (signed distance fields, metres, nose along +Z) drawn over
// the exposed HDR sky before bloom, lit by the same atmosphere: sunlight through the transmittance table,
// the sky-view table for ambient light and reflections, soft shadows and occlusion from the distance
// field. White fuselage with a red cheatline, a red tail carrying 樋口, glowing cabin windows at night,
// navigation lights, strobes and beacons, and two contrails. Output is premultiplied for alpha blending.

import { Atmosphere, Camera, FrameConstants, PI, cameraRay, raySphere, sampleTransmittance, skyViewUvFast } from "./atmosphere-common.wgsl";

struct Airliner {
  /** Camera position in the plane's frame, metres. */
  camera: vec3f,
  exposure: f32,
  time: f32,
  night: f32,
  /** 0..1 overall opacity: it fades as the camera slips into the cockpit. */
  visible: f32,
  pad: f32,
};

@group(0) @binding(0) var<uniform> atmosphere: Atmosphere;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var transmittanceLut: texture_2d<f32>;
@group(0) @binding(3) var skyViewLut: texture_2d<f32>;
@group(0) @binding(4) var lutSampler: sampler;
@group(0) @binding(5) var<storage, read> frame: FrameConstants;
@group(0) @binding(6) var<uniform> airliner: Airliner;
@group(0) @binding(7) var livery: texture_2d<f32>;

const HOT = vec3f(1.0, 0.0697, 0.0242); // #ff4a2b, linear
const ENGINE_X = 5.8;
const ENGINE_Y = -2.0;

fn box(p: vec3f, b: vec3f) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

/** A thin tapered, swept surface: span along `x` from 0 to `span`, chord and thickness taper to the tip. */
fn surface(x: f32, y: f32, z: f32, span: f32, lead0: f32, sweep: f32, chord0: f32, chord1: f32, thick0: f32, thick1: f32) -> f32 {
  let s = clamp(x / span, 0.0, 1.0);
  let chord = mix(chord0, chord1, s);
  let lead = lead0 - x * sweep;
  let u = clamp((lead - z) / chord, 0.0, 1.0);
  let thick = mix(thick0, thick1, s) * (0.3 + 0.7 * sin(u * PI));
  let d = vec3f(abs(x - span * 0.5) - span * 0.5, abs(y) - thick * 0.5, abs(z - (lead - chord * 0.5)) - chord * 0.5);
  return length(max(d, vec3f(0.0))) + min(max(d.x, max(d.y, d.z)), 0.0);
}

fn fuselage(p: vec3f) -> f32 {
  let z = clamp(p.z, -19.0, 18.4);
  var r = 1.98;
  var cy = 0.0;
  if (z > 11.5) {
    let k = (z - 11.5) / 6.9;
    r = 1.98 * sqrt(max(1.0 - k * k, 0.0));
    cy = -0.35 * k * k;
  }
  if (z < -9.0) {
    let k = smoothstep(-9.0, -19.0, z);
    r = mix(1.98, 0.32, k);
    cy = mix(0.0, 1.25, k);
  }
  let radial = length(vec2f(p.x, p.y - cy)) - r;
  return max(radial, max(p.z - 18.4, -19.0 - p.z)) * 0.85;
}

/** Distance and material: 0 fuselage, 1 wing, 2 fin, 3 tailplane, 4 engine. */
fn scene(p: vec3f) -> vec2f {
  var best = vec2f(fuselage(p), 0.0);
  let x = abs(p.x);
  // Wings: swept 25°, a little dihedral, winglets at the tips.
  let wing = surface(x - 1.6, p.y - (-0.95 + (x - 1.6) * 0.085), p.z, 15.6, 2.4, 0.47, 6.4, 1.5, 0.42, 0.12) * 0.7;
  let tip = vec3f(x - 17.25, p.y - (0.38 + 1.0), p.z - (-5.6 - (p.y - 0.38) * 0.45));
  let winglet = box(tip, vec3f(0.06, 1.0, 0.55 - max(p.y - 0.38, 0.0) * 0.12)) - 0.03;
  let w = min(wing, winglet);
  if (w < best.x) { best = vec2f(w, 1.0); }
  // Vertical fin.
  let fin = surface(p.y - 1.6, p.x, p.z, 7.2, -12.6, 0.8, 6.2, 2.4, 0.36, 0.16) * 0.7;
  if (fin < best.x) { best = vec2f(fin, 2.0); }
  // Tailplane.
  let stab = surface(x - 0.5, p.y - (0.95 + (x - 0.5) * 0.06), p.z, 6.4, -14.3, 0.62, 3.8, 1.4, 0.26, 0.1) * 0.7;
  if (stab < best.x) { best = vec2f(stab, 3.0); }
  // Engines under the wings, on pylons.
  let e = vec3f(x - ENGINE_X, p.y - ENGINE_Y, p.z);
  let along = clamp(e.z, -0.6, 3.4);
  let radius = mix(0.82, 1.08, smoothstep(-0.6, 2.4, along));
  let nacelle = (length(vec3f(e.xy, e.z - along)) - radius) * 0.9;
  let pylon = box(vec3f(e.x, e.y - 1.15, e.z - 0.8), vec3f(0.14, 0.55, 1.6)) - 0.04;
  let engine = min(nacelle, pylon);
  if (engine < best.x) { best = vec2f(engine, 4.0); }
  return best;
}

fn normalAt(p: vec3f) -> vec3f {
  let e = vec2f(0.004, -0.004);
  return normalize(
    e.xyy * scene(p + e.xyy).x + e.yyx * scene(p + e.yyx).x + e.yxy * scene(p + e.yxy).x + e.xxx * scene(p + e.xxx).x,
  );
}

fn softShadow(p: vec3f, l: vec3f) -> f32 {
  var lit = 1.0;
  var t = 0.08;
  for (var i = 0; i < 28; i++) {
    let h = scene(p + l * t).x;
    lit = min(lit, 10.0 * h / t);
    if (lit < 0.01 || t > 40.0) { break; }
    t += clamp(h, 0.05, 2.5);
  }
  return clamp(lit, 0.0, 1.0);
}

fn occlusion(p: vec3f, n: vec3f) -> f32 {
  var o = 0.0;
  var w = 1.0;
  for (var i = 1; i <= 5; i++) {
    let h = 0.15 * f32(i);
    o += (h - scene(p + n * h).x) * w;
    w *= 0.6;
  }
  return clamp(1.0 - o * 1.6, 0.2, 1.0);
}

/** The sky in a direction, from the sky-view table (as scene.wgsl samples it). */
fn sky(dir: vec3f) -> vec3f {
  let viewHeight = length(camera.position);
  let up = camera.position / viewHeight;
  let zenith = dot(dir, up);
  let horizontal = dir - up * zenith;
  let len = length(horizontal);
  var lightViewCos = 1.0;
  if (frame.sunHorizontalLength > 1e-5 && len > 1e-5) { lightViewCos = dot(frame.sunHorizontal / frame.sunHorizontalLength, horizontal / len); }
  let ground = raySphere(camera.position, dir, atmosphere.groundRadius) >= 0.0;
  return textureSampleLevel(skyViewLut, lutSampler, skyViewUvFast(frame, zenith, lightViewCos, ground), 0.0).rgb;
}

struct Surface { albedo: vec3f, rough: f32, emit: vec3f, metal: f32 };

fn material(p: vec3f, n: vec3f, id: f32) -> Surface {
  var s = Surface(vec3f(0.72), 0.35, vec3f(0.0), 0.0);
  if (id < 0.5) {
    // Fuselage: white over a grey belly, a red cheatline, cabin windows, the cockpit glass.
    s.albedo = mix(vec3f(0.72), vec3f(0.42, 0.43, 0.45), smoothstep(-0.7, -1.3, p.y));
    if (abs(p.y + 0.18) < 0.07 && p.z > -12.0 && p.z < 13.0) { s.albedo = HOT * 0.85; }
    let cell = fract((p.z + 12.0) / 0.53);
    let window = abs(p.y - 0.42) < 0.16 && abs(p.x) > 1.2 && p.z > -12.0 && p.z < 10.6 && abs(cell - 0.5) < 0.22
      && abs(p.z - 4.2) > 0.6 && abs(p.z + 8.0) > 0.6;
    if (window) {
      s.albedo = vec3f(0.02);
      s.rough = 0.08;
      s.emit = vec3f(1.0, 0.68, 0.38) * 0.05 * (0.5 + 0.5 * fract(sin(floor((p.z + 12.0) / 0.53) * 12.9898) * 43758.5));
    }
    let cockpitGlass = p.z > 14.3 && p.z < 16.7 && p.y > 0.2 && p.y < 0.95 - (p.z - 14.3) * 0.16 && abs(p.x) > 0.25;
    if (cockpitGlass) { s.albedo = vec3f(0.01); s.rough = 0.04; s.emit = vec3f(0.1, 0.35, 0.4) * 0.01; }
  } else if (id < 1.5) {
    s.albedo = vec3f(0.5, 0.52, 0.55);
    s.rough = 0.28;
    s.metal = 0.3;
  } else if (id < 2.5) {
    // The tail: red, with 樋口 in white.
    s.albedo = HOT * 0.8;
    let uv = vec2f((p.z + 18.6) / 6.4, 1.0 - (p.y - 3.1) / 4.2);
    if (all(uv > vec2f(0.0)) && all(uv < vec2f(1.0))) {
      let mark = textureSampleLevel(livery, lutSampler, vec2f(select(uv.x, 1.0 - uv.x, p.x < 0.0), uv.y), 0.0).a;
      s.albedo = mix(s.albedo, vec3f(0.8), mark);
    }
  } else if (id < 3.5) {
    s.albedo = vec3f(0.7);
  } else {
    s.albedo = vec3f(0.62);
    s.rough = 0.25;
    s.metal = 0.4;
    if (abs(p.x) > 0.0 && p.z > 3.1 && length(vec2f(abs(p.x) - ENGINE_X, p.y - ENGINE_Y)) < 0.95) { s.albedo = vec3f(0.03); }
  }
  return s;
}

fn shade(p: vec3f, rd: vec3f) -> vec3f {
  let n = normalAt(p);
  let m = material(p, n, scene(p).y);
  let l = atmosphere.sunDirection;
  let viewHeight = length(camera.position);
  let sun = atmosphere.sunIlluminance * sampleTransmittance(atmosphere, transmittanceLut, lutSampler, viewHeight, dot(l, camera.position / viewHeight));
  let shadow = softShadow(p + n * 0.02, l);
  let ao = occlusion(p, n);
  let ndl = max(dot(n, l), 0.0);
  let v = -rd;
  let h = normalize(l + v);
  let ndv = max(dot(n, v), 0.0);
  let fresnel = mix(0.04, 0.6, m.metal) + (1.0 - mix(0.04, 0.6, m.metal)) * pow(1.0 - ndv, 5.0);
  let spec = pow(max(dot(n, h), 0.0), mix(400.0, 20.0, m.rough)) * mix(8.0, 1.0, m.rough);
  let ambient = sky(normalize(n + vec3f(0.0, 0.3, 0.0))) * (0.6 + 0.4 * n.y) * ao;
  var color = m.albedo * (sun * ndl * shadow / PI + ambient) * (1.0 - m.metal * 0.5);
  color += sun * spec * shadow * fresnel * 0.25;
  color += sky(reflect(rd, n)) * fresnel * ao * (1.0 - m.rough * 0.6);
  color += m.emit * (0.3 + airliner.night * 2.0) / max(airliner.exposure, 1e-3);
  return color;
}

/** Closest approach between the view ray and a line (origin `a`, unit direction `d`): (distance, along ray, along line). */
fn rayLine(ro: vec3f, rd: vec3f, a: vec3f, d: vec3f) -> vec3f {
  let w = ro - a;
  let b = dot(rd, d);
  let denom = max(1.0 - b * b, 1e-5);
  let tRay = (b * dot(d, w) - dot(rd, w)) / denom;
  let tLine = (dot(d, w) - b * dot(rd, w)) / denom;
  let gap = length((ro + rd * tRay) - (a + d * tLine));
  return vec3f(gap, tRay, tLine);
}

/** A light on the airframe as a glow, in display units (added after exposure). */
fn lamp(ro: vec3f, rd: vec3f, at: vec3f, color: vec3f, hitT: f32) -> vec3f {
  let t = dot(at - ro, rd);
  if (t < 0.1 || t > hitT + 0.3) { return vec3f(0.0); }
  let d = length(ro + rd * t - at);
  let r = max(0.12, t * camera.pixelAngle * 1.5);
  return color * (exp(-(d * d) / (r * r)) + 0.12 * exp(-d / (r * 9.0)));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  if (airliner.visible <= 0.0) { return vec4f(0.0); }
  let rd = cameraRay(camera, vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0));
  let ro = airliner.camera;

  // March only inside the plane's bounding sphere; track the closest miss for soft, antialiased edges.
  var hitT = 1e9;
  var coverage = 0.0;
  var colour = vec3f(0.0);
  let center = vec3f(0.0, 1.5, -0.5);
  let oc = ro - center;
  let b = dot(oc, rd);
  let c = dot(oc, oc) - 27.0 * 27.0;
  let disc = b * b - c;
  if (disc > 0.0) {
    let root = sqrt(disc);
    var t = max(-b - root, 0.05);
    let tEnd = -b + root;
    var closest = 1e9;
    var closestT = t;
    for (var i = 0; i < 160; i++) {
      if (t > tEnd) { break; }
      let d = scene(ro + rd * t).x;
      let footprint = t * camera.pixelAngle;
      if (d / footprint < closest) { closest = d / footprint; closestT = t; }
      if (d < footprint * 0.3) { hitT = t; break; }
      t += max(d, footprint * 0.4);
    }
    if (hitT < 1e8) {
      coverage = 1.0;
      colour = shade(ro + rd * hitT, rd);
    } else if (closest < 1.5) {
      // A near miss: the edge covers part of this pixel.
      coverage = 1.0 - smoothstep(0.0, 1.5, closest);
      colour = shade(ro + rd * closestT, rd);
      hitT = closestT;
    }
  }

  // Contrails behind the engines, starting a few dozen metres back and spreading out.
  var trail = 0.0;
  var trailT = 1e9;
  for (var side = -1.0; side <= 1.0; side += 2.0) {
    let k = rayLine(ro, rd, vec3f(side * ENGINE_X, ENGINE_Y, -1.0), vec3f(0.0, 0.0, -1.0));
    let along = k.z;
    if (k.y <= 0.0 || along < 0.0) { continue; }
    let width = 0.35 + along * 0.0025;
    // Starts a few dozen metres back, thins out over a few hundred, and never smothers a camera inside it.
    let density = exp(-pow(k.x / width, 2.0)) * smoothstep(25.0, 90.0, along) * (1.0 - smoothstep(250.0, 700.0, along))
      * smoothstep(40.0, 160.0, k.y) / (1.0 + along * 0.004);
    if (k.y < hitT && density > trail) { trail = density; trailT = k.y; }
  }
  let viewHeight = length(camera.position);
  let sun = atmosphere.sunIlluminance * sampleTransmittance(atmosphere, transmittanceLut, lutSampler, viewHeight, dot(atmosphere.sunDirection, camera.position / viewHeight));
  let forward = pow(max(dot(rd, atmosphere.sunDirection), 0.0), 8.0);
  let trailColour = (sun * (0.12 + 0.6 * forward) + frame.skyAmbient * 1.4) * 0.9;
  let trailAlpha = trail * 0.45;

  // Premultiplied: the contrail first, the plane over it.
  var rgb = trailColour * trailAlpha * airliner.exposure;
  var alpha = trailAlpha;
  rgb = colour * airliner.exposure * coverage + rgb * (1.0 - coverage);
  alpha = coverage + alpha * (1.0 - coverage);

  // Lights: red to port, green to starboard, white on the tail; strobes and the beacons flash.
  let t = airliner.time;
  let strobe = select(0.0, 1.0, fract(t / 1.2) < 0.05 || abs(fract(t / 1.2) - 0.13) < 0.025);
  let beacon = pow(max(sin(t * 6.283 * 0.9), 0.0), 8.0);
  let tips = 0.38;
  var glow = lamp(ro, rd, vec3f(-17.35, tips, -5.0), vec3f(1.0, 0.08, 0.05) * 1.6, hitT);
  glow += lamp(ro, rd, vec3f(17.35, tips, -5.0), vec3f(0.1, 1.0, 0.35) * 1.6, hitT);
  glow += lamp(ro, rd, vec3f(0.0, 1.0, -19.1), vec3f(1.0) * 1.0, hitT);
  glow += (lamp(ro, rd, vec3f(-17.35, tips, -5.5), vec3f(1.0), hitT) + lamp(ro, rd, vec3f(17.35, tips, -5.5), vec3f(1.0), hitT)) * strobe * 6.0;
  glow += (lamp(ro, rd, vec3f(0.0, 2.05, -1.0), vec3f(1.0, 0.1, 0.05), hitT) + lamp(ro, rd, vec3f(0.0, -2.05, 2.0), vec3f(1.0, 0.1, 0.05), hitT)) * beacon * 3.0;
  rgb += glow * (0.35 + airliner.night * 0.65);

  return vec4f(rgb, alpha) * airliner.visible;
}
