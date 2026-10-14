// A placeholder for /.secret: faint cyan noise drifting over the ink page colour.
import { simplex3d } from "@vgpu/wgsl-std/noise/simplex";

struct Params { time: f32, aspect: f32 }
@group(0) @binding(0) var<uniform> params: Params;

const INK = vec3f(0.027, 0.031, 0.047); // #07080c
const CYAN = vec3f(0.133, 0.898, 0.827); // #22e5d3

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = vec3f(uv.x * params.aspect * 2.5, uv.y * 2.5, params.time * 0.08);
  let n = clamp(simplex3d(p) * 0.5 + 0.5, 0.0, 1.0);
  return vec4f(mix(INK, CYAN, n * n * 0.35), 1.0);
}
