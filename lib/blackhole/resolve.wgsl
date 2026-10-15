// The picture at full resolution: the page wherever a ray escaped onto it (lensed, from trace.wgsl's
// coordinates, so the type stays sharp), tiles cracking and gone once they let go, the falling debris
// and stars behind, all seen through the disk's light.

import { Release, releaseTime, toLinear } from "./space.wgsl";

struct Resolve {
  traceSize: vec2f,
  grid: vec2f,
  aspect: f32,
  time: f32,
  release: Release,
  pad0: f32,
  pad1: f32,
}

@group(0) @binding(0) var<uniform> resolve: Resolve;
@group(0) @binding(1) var page: texture_2d<f32>;
@group(0) @binding(2) var debris: texture_2d<f32>;
@group(0) @binding(3) var disk: texture_2d<f32>;
@group(0) @binding(4) var lens: texture_2d<f32>;
@group(0) @binding(5) var samp: sampler;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(41.3, 289.1))) * 43758.5453);
}

fn stars(at: vec2f) -> vec3f {
  let grid = at * vec2f(320.0 * resolve.aspect, 320.0);
  let cell = floor(grid);
  let seed = hash(cell);
  let point = smoothstep(0.09, 0.0, length(fract(grid) - 0.5)) * step(0.985, seed);
  let tint = mix(vec3f(0.55, 0.7, 1.0), vec3f(1.0, 0.75, 0.5), hash(cell + 7.0));
  return tint * point * (0.6 + seed * 2.0);
}

// The lens coordinates, bilinear where all four neighbours escaped, else the nearest.
fn lensAt(uv: vec2f) -> vec4f {
  let size = vec2i(resolve.traceSize);
  let f = uv * resolve.traceSize - 0.5;
  let base = vec2i(floor(f));
  let t = fract(f);
  let clampTo = size - vec2i(1);
  let a = textureLoad(lens, clamp(base, vec2i(0), clampTo), 0);
  let b = textureLoad(lens, clamp(base + vec2i(1, 0), vec2i(0), clampTo), 0);
  let c = textureLoad(lens, clamp(base + vec2i(0, 1), vec2i(0), clampTo), 0);
  let d = textureLoad(lens, clamp(base + vec2i(1, 1), vec2i(0), clampTo), 0);
  if (min(min(a.x, b.x), min(c.x, d.x)) < -0.5) {
    return textureLoad(lens, clamp(vec2i(round(f)), vec2i(0), clampTo), 0);
  }
  return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let light = textureSampleLevel(disk, samp, uv, 0.0);
  let lensed = lensAt(uv);
  var behind = vec3f(0.0);
  if (lensed.x > -0.5) {
    let onPage = all(lensed.xy >= vec2f(0.0)) && all(lensed.xy <= vec2f(1.0));
    behind = stars(lensed.zw);
    if (onPage) {
      let cell = floor(lensed.xy * resolve.grid);
      let lets = releaseTime(cell, resolve.grid, resolve.aspect, resolve.release);
      if (resolve.time < lets) {
        behind = toLinear(textureSampleLevel(page, samp, lensed.xy, 0.0).rgb);
        // Cracking: a tile's edges glow hot in the moment before it lets go.
        let crack = smoothstep(lets - 0.45, lets, resolve.time);
        let local = abs(fract(lensed.xy * resolve.grid) - 0.5) * 2.0;
        let edge = smoothstep(0.75, 1.0, max(local.x, local.y));
        behind += vec3f(1.0, 0.36, 0.14) * edge * crack * 3.0;
      }
    }
    let falling = textureSampleLevel(debris, samp, lensed.zw, 0.0);
    behind = falling.rgb + behind * (1.0 - falling.a);
  }
  return vec4f(behind * light.a + light.rgb, 1.0);
}
