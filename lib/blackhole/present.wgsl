// Onto the screen: bloom added, highlights rolled off (everything up to the page's own white is left
// exactly as it was, so the first frame is the page itself), a flash, a vignette and a little lens
// fringe that grow with the hole.

import { toDisplay } from "./space.wgsl";

struct Present {
  flash: f32,
  strength: f32,
  pad0: f32,
  pad1: f32,
}

@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var bloom: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var<uniform> present: Present;

fn shoulder(x: vec3f) -> vec3f {
  let over = max(x - vec3f(0.85), vec3f(0.0));
  return min(x, vec3f(0.85)) + 0.15 * (1.0 - exp(-over / 0.15));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let centred = uv - 0.5;
  let fringe = centred * 0.004 * present.strength;
  let r = textureSampleLevel(scene, samp, uv + fringe, 0.0).r;
  let g = textureSampleLevel(scene, samp, uv, 0.0).g;
  let b = textureSampleLevel(scene, samp, uv - fringe, 0.0).b;
  var color = vec3f(r, g, b) + textureSampleLevel(bloom, samp, uv, 0.0).rgb * 0.9 * present.strength;
  color += vec3f(1.0, 0.92, 0.85) * present.flash * (1.2 + exp(-dot(centred, centred) * 18.0) * 6.0);
  color = shoulder(color);
  let vignette = 1.0 - smoothstep(0.45, 1.1, length(centred) * 1.6);
  color *= mix(1.0, mix(0.6, 1.0, vignette), present.strength);
  return vec4f(toDisplay(clamp(color, vec3f(0.0), vec3f(1.0))), 1.0);
}
