// Traces one light ray per pixel back from the camera through curved spacetime, after vgpu's Black Hole
// example (MIT, see NOTICE.md): Verlet steps of a Schwarzschild null geodesic, a volumetric Keplerian
// disk with Doppler beaming and gravitational redshift. Our changes: the hole grows from nothing (mass),
// the disk brightens as it feeds, and an escaped ray reports where it lands on the page behind the hole
// and against the sky, so resolve.wgsl can draw the page and its debris lensed at full resolution.

import { DIST, Eye, eye, pageUv, rayFor, screenFor, skyUv } from "./space.wgsl";

struct Trace {
  aspect: f32,
  mass: f32,
  time: f32,
  feed: f32,
  pitch: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
}

@group(0) @binding(0) var<uniform> trace: Trace;

const ISCO: f32 = 3.0;
const DISK_OUTER: f32 = 9.5;

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q += vec2f(dot(q, q + vec2f(45.32)));
  return fract(q.x * q.y);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2f(1.0, 0.0)), u.x),
             mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x), u.y);
}

fn fbm(p0: vec2f) -> f32 {
  var p = p0;
  var value = 0.0;
  var amplitude = 0.5;
  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = mat2x2f(1.6, 1.2, -1.2, 1.6) * p;
    amplitude *= 0.5;
  }
  return value;
}

// Light bends towards the hole: a = -3/2 · rs · h² · x / r⁵ (rs is the horizon's radius, `mass`).
fn geodesicAcceleration(position: vec3f, velocity: vec3f, rs: f32) -> vec3f {
  let r2 = dot(position, position);
  let angularMomentum = cross(position, velocity);
  let h2 = dot(angularMomentum, angularMomentum);
  return -1.5 * rs * h2 * position / (r2 * r2 * sqrt(r2));
}

// The disk at a point, in units of the horizon (`q` = point / mass): emission and density.
fn volumeSample(q: vec3f, rayVelocity: vec3f) -> vec4f {
  let radius = length(q.xz);
  let height = abs(q.y);
  if (radius <= ISCO || radius >= DISK_OUTER || height > 0.42) { return vec4f(0.0); }

  // Rotated Cartesian turbulence avoids a polar branch-cut seam.
  let omega = 0.42 / pow(radius, 1.5);
  let swirl = 2.2 * log(radius);
  let ang = trace.time * omega * 3.0 + swirl;
  let c = cos(ang);
  let s = sin(ang);
  let rc = vec2f(c * q.x - s * q.z, s * q.x + c * q.z);
  let broad = fbm(rc * 0.9 + vec2f(0.0, trace.time * 0.05));
  let detail = fbm(rc * 2.6 + broad * 1.5);
  let rings = 0.5 + 0.5 * sin(radius * 8.5 + broad * 6.0);
  let clumps = smoothstep(0.26, 0.84, broad * 0.72 + detail * 0.46 + rings * 0.22);

  let thickness = mix(0.05, 0.24, smoothstep(ISCO, DISK_OUTER, radius));
  let vertical = exp(-pow(height / thickness, 2.0) * 3.4);
  let innerFade = smoothstep(ISCO, ISCO + 0.45, radius);
  let outerFade = 1.0 - smoothstep(DISK_OUTER - 2.4, DISK_OUTER, radius);
  let radial = (DISK_OUTER - radius) / (DISK_OUTER - ISCO);
  let density = vertical * innerFade * outerFade * pow(radial, 0.36) * clumps;

  // Hot like the site's seal at the rim, white hot inside.
  let heat = pow(radial, 1.35);
  var thermal = mix(vec3f(0.62, 0.1, 0.04), vec3f(1.0, 0.36, 0.14), smoothstep(0.05, 0.55, heat));
  thermal = mix(thermal, vec3f(1.0, 0.92, 0.8), pow(heat, 2.4));

  let tangent = normalize(vec3f(-q.z, 0.0, q.x));
  let orbitalSpeed = min(0.64, 0.94 / sqrt(max(radius - 1.0, 0.25)));
  let towardObserver = dot(tangent, -normalize(rayVelocity));
  let doppler = pow(clamp(1.0 / (1.0 - orbitalSpeed * towardObserver), 0.6, 1.9), 2.0);
  let gravitationalRedshift = sqrt(1.0 - 1.0 / radius);
  let emission = thermal * density * doppler * gravitationalRedshift * 9.5 * trace.feed;
  return vec4f(emission, density * 2.1);
}

struct Traced {
  // The disk's light along the ray, and how much of what lies behind still shows through.
  @location(0) disk: vec4f,
  // Where the ray lands: on the page (xy) and against the sky (zw); -1 when the hole took it.
  @location(1) lens: vec4f,
}

@fragment fn fs_main(@location(0) uv: vec2f) -> Traced {
  let e = eye(trace.pitch);
  let rs = trace.mass;
  var position = e.position;
  var velocity = rayFor(e, screenFor(uv, trace.aspect));
  var accumulated = vec3f(0.0);
  var transmittance = 1.0;
  var escaped = true;

  if (rs > 1e-4) {
    escaped = false;
    for (var stepIndex = 0; stepIndex < 320; stepIndex++) {
      let radius = length(position);
      if (radius < rs * 1.015) { break; }
      if (radius > DIST + 4.0 && dot(position, velocity) > 0.0) {
        escaped = true;
        break;
      }

      // Long strides far out, fine ones near the horizon where the path curves hardest.
      var stepSize = clamp((radius - rs) * 0.07, 0.016 * rs, max(0.24 * rs, (radius - rs) * 0.05));

      // Cap steps near the thin disk so rays cannot skip its slab.
      let rxz = length(position.xz) / rs;
      if (rxz > ISCO - 0.6 && rxz < DISK_OUTER + 0.6) {
        let slab = mix(0.05, 0.24, smoothstep(ISCO, DISK_OUTER, rxz)) * rs;
        let vy = max(abs(velocity.y), 0.001);
        let band = slab * 3.0;
        let ay = abs(position.y);
        if (ay < band) {
          stepSize = min(stepSize, (slab * 0.4) / vy);
        } else if (position.y * velocity.y < 0.0) {
          stepSize = min(stepSize, (ay - band) / vy);
        }
        stepSize = max(stepSize, 0.004 * rs);
      }

      let previousPosition = position;
      velocity += geodesicAcceleration(position, velocity, rs) * (0.5 * stepSize);
      position += velocity * stepSize;
      velocity += geodesicAcceleration(position, velocity, rs) * (0.5 * stepSize);
      velocity = normalize(velocity);

      let volume = volumeSample(mix(previousPosition, position, 0.5) / rs, velocity);
      if (volume.a > 0.0001 && transmittance > 0.008) {
        let opticalDepth = volume.a * stepSize / rs;
        let absorbed = 1.0 - exp(-opticalDepth);
        accumulated += volume.rgb * transmittance * absorbed / max(volume.a, 0.001);
        transmittance *= exp(-opticalDepth);
      }
    }
  }

  var out: Traced;
  out.disk = vec4f(accumulated, transmittance);
  out.lens = vec4f(-1.0);
  if (escaped) {
    out.lens = vec4f(pageUv(e, position, velocity, trace.aspect), skyUv(e, velocity, trace.aspect));
  }
  return out;
}
