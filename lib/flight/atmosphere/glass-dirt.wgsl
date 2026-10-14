// The windshield's own texture, baked once into a small target (after the procedural lens dirt of
// vgpu's Spiral Galaxy example): R = dust and smeared wipes, G = fine pits and specks, B = a frost
// field whose low values grow first from the frame. cockpit.wgsl reads it in screen space.

import { hash2 } from "@vgpu/wgsl-std/hash";
import { fbmSimplex2d, simplex2d } from "@vgpu/wgsl-std/noise/simplex";

struct Dirt { size: vec2f, pad: vec2f };

@group(0) @binding(0) var<uniform> dirt: Dirt;

fn specks(pixel: vec2f, cell: f32, seed: f32) -> f32 {
  let id = floor(pixel / cell);
  var value = 0.0;
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let n = id + vec2f(f32(x), f32(y));
      let h = hash2(n + seed);
      if (h.x > 0.35) { continue; }
      let center = (n + 0.2 + 0.6 * hash2(n + seed + 7.0)) * cell;
      let radius = 0.6 + 1.6 * pow(h.y, 3.0);
      let d = length(pixel - center) / radius;
      value = max(value, (0.3 + 0.7 * h.y) * (1.0 - smoothstep(0.4, 1.0, d)));
    }
  }
  return value;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let pixel = uv * dirt.size;
  // Dust: soft clouds of film, thicker in patches.
  let film = fbmSimplex2d(uv * 6.0, 5, 2.1, 0.55) * 0.5 + 0.5;
  var dust = 0.05 + 0.25 * smoothstep(0.45, 0.85, film);
  // Smeared wipes with a streaky grain, as if a cloth went over the glass.
  for (var i = 0; i < 6; i++) {
    let s = f32(i) + 1.0;
    let a = hash2(vec2f(s, 1.0));
    let b = hash2(vec2f(s, 2.0));
    let angle = a.x * 3.14159;
    let delta = uv - (0.1 + 0.8 * vec2f(a.y, b.x));
    let along = (delta.x * cos(angle) + delta.y * sin(angle)) / (0.12 + 0.2 * b.y);
    let across = (-delta.x * sin(angle) + delta.y * cos(angle)) / (0.04 + 0.06 * a.x);
    let r = along * along + across * across;
    if (r >= 1.0) { continue; }
    let streak = pow(0.5 + 0.5 * sin((0.7 * along + across) * 30.0 + s), 6.0);
    dust += (0.12 + 0.2 * b.y) * (1.0 - smoothstep(0.2, 1.0, sqrt(r))) * (0.25 + 0.75 * streak);
  }
  let pits = max(specks(pixel, 9.0, 3.0), specks(pixel, 27.0, 11.0) * 0.7);
  // Frost: ridged noise, so it grows in feathery fronts rather than blobs.
  let ridge = 1.0 - abs(simplex2d(uv * 18.0));
  let frost = fbmSimplex2d(uv * 5.0 + 3.0, 4, 2.0, 0.5) * 0.35 + 0.5 + ridge * ridge * 0.25;
  return vec4f(saturate(dust), pits, saturate(frost), 1.0);
}
