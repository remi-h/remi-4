// Only what is brighter than white after exposure blooms: the sun, its glare, city lights, the aurora's core.

import { luminance } from "@vgpu/wgsl-std/color";

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let color = textureSampleLevel(src, samp, uv, 0.0).rgb;
  let brightness = luminance(color);
  let knee = 0.35;
  let soft = clamp((brightness - 2.0 + knee) / (2.0 * knee), 0.0, 1.0);
  let contribution = max(soft * soft * knee, brightness - 2.0);
  return vec4f(color * max(contribution / max(brightness, 0.0001), 0.0), 1.0);
}
