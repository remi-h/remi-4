// /.secret boarding: the page turns into a split-flap departures board and back, the plane
// rolls along the runway and takes off, the page tilts away and its text lights up like a
// city at night, then the plane pulls up towards you until it fills the screen.
// Coordinates are CSS pixels, top-left origin, like the page snapshot.

struct Params {
  view: vec2f,   // viewport, CSS px
  t: f32,        // seconds since board was pressed
  dpr: f32,
  plane: vec4f,  // the runway plane in the DOM: x, y, w, h
  grid: vec4f,   // grid origin x, y; message origin col, row
  timesA: vec4f, // flip, back, taxi, lift
  timesB: vec4f, // handoff, vanish, message cols, message rows
  mode: vec4f,   // x: 0 departure (tiles start on the page), 1 arrival (tiles start dark, end on the page)
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var page: texture_2d<f32>;
@group(0) @binding(2) var glyphs: texture_2d<f32>;
@group(0) @binding(3) var planeTex: texture_2d<f32>;
@group(0) @binding(4) var message: texture_2d<f32>;
@group(0) @binding(5) var samp: sampler;

const PI = 3.14159265;
const CELL = 64.0;
const INK = vec3f(0.027, 0.031, 0.047);
const PANEL = vec3f(0.047, 0.055, 0.082);
const TEXT = vec3f(0.875, 0.890, 0.933);
const YELLOW = vec3f(1.0, 0.847, 0.290);
const HOT = vec3f(1.0, 0.290, 0.169);
const CYAN = vec3f(0.133, 0.898, 0.827);
const HORIZON = vec3f(0.36, 0.20, 0.24);

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn rot(v: vec2f, a: f32) -> vec2f {
  let c = cos(a);
  let s = sin(a);
  return vec2f(v.x * c - v.y * s, v.x * s + v.y * c);
}

fn pageAt(css: vec2f) -> vec3f {
  return textureSampleLevel(page, samp, css / params.view, 0.0).rgb;
}

// --- The departures board ---------------------------------------------------------------

fn glyph(index: i32, lu: vec2f) -> f32 {
  let cell = vec2f(f32(index % 8), f32(index / 8));
  return textureSampleLevel(glyphs, samp, (cell + clamp(lu, vec2f(0.02), vec2f(0.98))) / vec2f(8.0, 6.0), 0.0).a;
}

fn messageChar(cell: vec2f) -> i32 {
  let m = cell - params.grid.zw;
  if m.x < 0.0 || m.y < 0.0 || m.x >= params.timesB.z || m.y >= params.timesB.w {
    return 0;
  }
  return i32(round(textureLoad(message, vec2i(m), 0).r * 255.0));
}

fn face(index: i32, lu: vec2f, origin: vec2f, highlight: bool) -> vec3f {
  if index == -2 {
    return vec3f(0.0);
  }
  if index < 0 {
    return pageAt(origin + lu * CELL);
  }
  // Tiles have a hairline gap, a lighter top half and the split across the middle.
  let edge = min(min(lu.x, 1.0 - lu.x), min(lu.y, 1.0 - lu.y)) * CELL;
  if edge < 1.5 {
    return INK;
  }
  var base = PANEL * select(0.85, 1.15, lu.y < 0.5);
  if abs(lu.y - 0.5) * CELL < 0.75 {
    base = INK;
  }
  let ink = select(TEXT, YELLOW, highlight);
  return mix(base, ink, glyph(index, lu));
}

fn spin(cell: vec2f, k: i32) -> i32 {
  return 1 + i32(floor(hash21(cell * 1.37 + f32(k) * 7.31) * 35.99));
}

// (old face, new face, flip progress); progress < 0 means the tile rests on the old face.
// Face -1 is the page itself; -2 is black (the arrival starts from the cockpit faded out).
fn tile(cell: vec2f, t: f32, goal: i32) -> vec3f {
  let flip = params.timesA.x;
  let center = (cell + 0.5) * CELL + params.grid.xy;
  let origin = params.plane.xy + params.plane.zw * 0.5;
  let delay = distance(center, origin) / length(params.view) * 0.9 + hash21(cell + 3.7) * 0.2;
  let turns = 3 + i32(floor(hash21(cell + 9.1) * 4.0));
  let start = select(-1, -2, params.mode.x > 0.5);
  let tf = t - delay;
  if tf < 0.0 {
    return vec3f(f32(start), f32(start), -1.0);
  }
  let i = i32(floor(tf / flip));
  if i < turns {
    let old = select(spin(cell, i - 1), start, i == 0);
    let next = select(spin(cell, i), goal, i == turns - 1);
    return vec3f(f32(old), f32(next), fract(tf / flip));
  }
  let tb = t - (params.timesA.y + delay * 0.6);
  if tb < 0.0 {
    return vec3f(f32(goal), 0.0, -1.0);
  }
  let fb = tb / (flip * 1.6);
  if fb < 1.0 {
    return vec3f(f32(goal), -1.0, fb);
  }
  return vec3f(-1.0, -1.0, -1.0);
}

fn board(css: vec2f) -> vec3f {
  let cell = floor((css - params.grid.xy) / CELL);
  let origin = cell * CELL + params.grid.xy;
  let lu = (css - origin) / CELL;
  let goal = messageChar(cell);
  let hl = goal > 0;
  let s = tile(cell, params.t, goal);
  let old = i32(s.x);
  let next = i32(s.y);
  if s.z < 0.0 {
    return face(old, lu, origin, hl);
  }
  // A split flap: the old top half folds down over the new one, showing the new bottom half
  // on its back once it passes vertical.
  let c = cos(s.z * PI);
  let ly = lu.y * 2.0 - 1.0;
  if ly < 0.0 {
    if c > 0.0 && ly > -c {
      return face(old, vec2f(lu.x, (ly / c + 1.0) * 0.5), origin, hl) * (0.55 + 0.45 * c);
    }
    return face(next, lu, origin, hl);
  }
  if c < 0.0 && ly < -c {
    return face(next, vec2f(lu.x, (ly / -c + 1.0) * 0.5), origin, hl) * (0.55 - 0.45 * c);
  }
  return face(old, lu, origin, hl);
}

// --- Takeoff ----------------------------------------------------------------------------

// The page as seen from the air: text and lit panels become warm lights, and the ground
// carries on past the snapshot with the grid and scattered lights of its own.
fn ground(p: vec2f, lit: f32) -> vec3f {
  var col: vec3f;
  if p.x >= 0.0 && p.y >= 0.0 && p.x <= params.view.x && p.y <= params.view.y {
    col = pageAt(p);
  } else {
    let g = fract((p - params.grid.xy) / CELL) * CELL;
    col = INK + CYAN * 0.04 * f32(min(g.x, g.y) < 1.0);
    let block = floor(p / 14.0);
    let town = smoothstep(0.55, 0.9, hash21(floor(p / 220.0)));
    let spot = step(1.0 - 0.12 * town, hash21(block)) * step(length(fract(p / 14.0) - 0.5), 0.18);
    col += vec3f(1.0, 0.78, 0.45) * spot * lit;
  }
  let lum = dot(col, vec3f(0.299, 0.587, 0.114));
  let light = mix(vec3f(1.0, 0.76, 0.42), col, 0.35) * smoothstep(0.18, 0.6, lum) * 1.8;
  return mix(col, INK * 0.6 + light, lit);
}

fn sky(d: vec3f) -> vec3f {
  let up = clamp(d.y / length(d), 0.0, 1.0);
  return mix(HORIZON, vec3f(0.015, 0.02, 0.06), pow(up, 0.45));
}

fn segmentDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab = b - a;
  let h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - a - ab * h);
}

/** Where the plane is at time `t`: rolling along the runway, then climbing away to a point on the horizon. */
fn planePos(t: f32) -> vec2f {
  let taxi = params.timesA.z;
  let lift = params.timesA.w;
  let taxiTime = lift - taxi;
  let run = min(params.view.x * 0.28, 280.0);
  let acc = 2.0 * run / (taxiTime * taxiTime);
  let s = clamp(t - taxi, 0.0, taxiTime);
  let start = params.plane.xy + params.plane.zw * 0.5;
  let wheelsUp = start + vec2f(0.5 * acc * taxiTime * taxiTime, 0.0);
  if t <= lift {
    return start + vec2f(0.5 * acc * s * s, 0.0);
  }
  // The horizon once the camera has pitched up to follow: cot(1.2) / tan(fov / 2) above the centre.
  let horizon = params.view.y * 0.5 * (1.0 - cos(1.2) / (sin(1.2) * 0.6));
  let goal = vec2f(params.view.x * 0.58, horizon + 3.0);
  let e = smoothstep(0.0, params.timesB.y - lift, t - lift);
  let eased = 1.0 - (1.0 - e) * (1.0 - e);
  // Keep the takeoff speed at first, curving up and away rather than turning sharply.
  let launch = wheelsUp + vec2f(acc * taxiTime * (t - lift) * 0.6, -40.0 * (t - lift));
  return mix(launch, goal, eased);
}

/** The plane's size: a little bigger as it climbs past, then shrinking with distance. */
fn planeSize(t: f32) -> f32 {
  let lift = params.timesA.w;
  let u = max(t - lift, 0.0);
  let near = 1.0 + 0.5 * sin(min(u / 0.7, 1.0) * PI * 0.5);
  let far = mix(1.0, 0.12, smoothstep(0.3, params.timesB.y - lift, u));
  return params.plane.z * near * far;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let css = uv * params.view;
  let t = params.t;
  let taxi = params.timesA.z;
  let lift = params.timesA.w;
  let u = max(t - lift, 0.0);

  // The scene under the plane: the board, then the page falling away below.
  var col: vec3f;
  if t < taxi {
    col = board(css);
  } else {
    let tanf = 0.6;
    let pitch = 1.2 * smoothstep(0.0, 1.6, u);
    let h = params.view.y * 0.5 / tanf * (1.0 + 0.5 * u * u);
    let cam = vec3f(params.view.x * 0.5, h, params.view.y * 0.5 - 140.0 * u * u);
    let ndc = vec2f(css.x - params.view.x * 0.5, params.view.y * 0.5 - css.y) / (params.view.y * 0.5);
    let fwd = vec3f(0.0, -cos(pitch), -sin(pitch));
    let up = vec3f(0.0, sin(pitch), -cos(pitch));
    let d = vec3f(ndc.x * tanf, 0.0, 0.0) + up * ndc.y * tanf + fwd;
    if d.y < -1e-4 {
      let hit = cam + d * (h / -d.y);
      let lit = smoothstep(0.2, 1.8, u);
      col = ground(hit.xz, lit);
      let fog = 1.0 - exp(-(h / -d.y - h) / (params.view.y * 6.0));
      col = mix(col, HORIZON, fog * smoothstep(0.0, 0.6, u));
    } else {
      col = sky(d);
    }
  }

  // The plane: rolls along the runway, lifts off, and flies away into the dusk towards the horizon,
  // banking along its path and leaving a contrail, until it is a speck and gone.
  let fade = 1.0 - smoothstep(params.timesB.y - 0.5, params.timesB.y, t);
  if fade > 0.0 {
    var trail = 0.0;
    for (var k = 1; k <= 18; k++) {
      let back = planePos(t - f32(k) * 0.05);
      let ahead = planePos(t - f32(k - 1) * 0.05);
      let width = 0.7 + f32(k) * 0.12;
      trail = max(trail, exp(-segmentDistance(css, back, ahead) / width) * (1.0 - f32(k) / 19.0));
    }
    let airborne = smoothstep(lift, lift + 0.3, t);
    col = mix(col, vec3f(0.92, 0.88, 0.95), trail * 0.55 * airborne * fade);

    let pos = planePos(t);
    let heading = planePos(t + 0.03) - pos;
    let angle = select(0.0, atan2(heading.y, heading.x), length(heading) > 0.01);
    let size = planeSize(t);
    let q = rot(css - pos, -angle) / size + 0.5;
    if all(q >= vec2f(0.0)) && all(q <= vec2f(1.0)) {
      let a = textureSampleLevel(planeTex, samp, q, 0.0).a;
      let fw = clamp(0.5 * 1024.0 / (size * params.dpr), 0.02, 0.5);
      col = mix(col, HOT, smoothstep(0.5 - fw, 0.5 + fw, a) * fade);
    }
  }
  return vec4f(col, 1.0);
}
