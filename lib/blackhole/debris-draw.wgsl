// Draws each falling tile as a quad cut from the page, stretched along its path and glowing as it heats.

import { toLinear } from "./space.wgsl";

struct Piece {
  centre: vec2f,
  along: vec2f,
  width: f32,
  alpha: f32,
  heat: f32,
  depth: f32,
}

struct Look {
  view: vec2f,
  grid: vec2f,
}

@group(0) @binding(0) var<storage, read> pieces: array<Piece>;
@group(0) @binding(1) var<uniform> look: Look;
@group(0) @binding(2) var page: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;

struct Out {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) local: vec2f,
  @location(2) heat: f32,
  @location(3) alpha: f32,
}

@vertex fn vs_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> Out {
  var quad = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let corner = quad[vertex];
  let piece = pieces[instance];
  var out: Out;
  out.local = corner;
  out.heat = piece.heat;
  out.alpha = piece.alpha;
  if (piece.alpha <= 0.0) {
    out.position = vec4f(2.0, 2.0, 0.0, 1.0);
    return out;
  }
  let across = normalize(vec2f(-piece.along.y, piece.along.x)) * piece.width;
  let px = piece.centre + piece.along * corner.x + across * corner.y;
  out.position = vec4f(px.x / look.view.x * 2.0 - 1.0, 1.0 - px.y / look.view.y * 2.0, 0.0, 1.0);
  let cols = u32(look.grid.x);
  let cell = vec2f(f32(instance % cols), f32(instance / cols));
  out.uv = (cell + corner * 0.5 + 0.5) / look.grid;
  return out;
}

@fragment fn fs_main(in: Out) -> @location(0) vec4f {
  let color = toLinear(textureSampleLevel(page, samp, in.uv, 0.0).rgb);
  // Heating: the colours wash out to the disk's glow, brightest at the stretched ends.
  let glow = mix(vec3f(1.0, 0.3, 0.1), vec3f(1.0, 0.75, 0.5), in.heat) * in.heat * (0.5 + 1.2 * in.heat);
  let edge = smoothstep(0.6, 1.0, max(abs(in.local.x), abs(in.local.y)));
  let emission = color * (1.0 - in.heat * 0.7) + glow + vec3f(1.0, 0.45, 0.25) * edge * in.heat * 0.8;
  return vec4f(emission * in.alpha, in.alpha);
}
