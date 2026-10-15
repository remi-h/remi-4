// One thread per tile of the page. Once a tile lets go (releaseTime) it falls towards the hole on a
// tightening orbit: it drops into the disk's plane, winds round faster and faster as it closes in
// (Keplerian, ω ∝ r^-1.5), stretches along its path and heats up, until the horizon takes it. The path is a
// function of time, not an integration, so running time backwards gives the page back exactly.

import { Eye, Release, eye, fallTime, pagePoint, releaseTime } from "./space.wgsl";

struct Sim {
  grid: vec2f,
  view: vec2f,
  aspect: f32,
  time: f32,
  mass: f32,
  pitch: f32,
  release: Release,
  tile: f32,
  pad0: f32,
}

struct Piece {
  centre: vec2f,
  along: vec2f,
  width: f32,
  alpha: f32,
  heat: f32,
  depth: f32,
}

@group(0) @binding(0) var<uniform> sim: Sim;
@group(0) @binding(1) var<storage, read_write> pieces: array<Piece>;

// Where a tile is, `fall` (0..1) of the way from the page to the horizon.
fn orbit(start: vec3f, fall: f32, rs: f32) -> vec3f {
  let rho0 = length(start.xz);
  let phi0 = atan2(start.z, start.x);
  let e = fall * fall;
  let rho = rs + (rho0 - rs) * pow(1.0 - e, 1.5);
  let y = start.y * pow(1.0 - e, 2.5);
  let phi = phi0 + 0.55 * (pow(rho0 / max(rho, 1e-3), 0.9) - 1.0);
  return vec3f(rho * cos(phi), y, rho * sin(phi));
}

// A world point on screen, in pixels (y down), and its distance from the camera along the view.
fn project(e: Eye, p: vec3f) -> vec3f {
  let rel = p - e.position;
  let z = max(dot(rel, e.forward), 0.1);
  let s = vec2f(dot(rel, e.right), dot(rel, e.up)) * 1.72 / z;
  let uv = vec2f(s.x / sim.aspect * 0.5 + 0.5, 0.5 - s.y * 0.5);
  return vec3f(uv * sim.view, z);
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let count = u32(sim.grid.x * sim.grid.y);
  if (id.x >= count) { return; }
  let cols = u32(sim.grid.x);
  let cell = vec2f(f32(id.x % cols), f32(id.x / cols));
  let e = eye(sim.pitch);
  let released = releaseTime(cell, sim.grid, sim.aspect, sim.release);
  let fall = (sim.time - released) / fallTime(cell, sim.release);

  var piece: Piece;
  if (fall <= 0.0 || fall >= 1.0 || sim.mass < 1e-3) {
    // Still on the page (resolve.wgsl draws it there), or gone.
    pieces[id.x] = piece;
    return;
  }
  let start = pagePoint(e, (cell + 0.5) / sim.grid, sim.aspect);
  let here = orbit(start, fall, sim.mass);
  let ahead = orbit(start, min(fall + 0.01, 1.0), sim.mass);
  let a = project(e, here);
  let b = project(e, ahead);
  // Its size on screen grows as it comes closer than the page was.
  let r = length(here) / sim.mass;
  let heat = smoothstep(14.0, 2.5, r);
  // Shredded as it nears the disk: smaller, and fainter, so thousands of them stay a stream, not a blob.
  let size = sim.tile * (22.0 + 18.0) / a.z * mix(1.0, 0.35, heat);
  let motion = b.xy - a.xy;
  let speed = length(motion);
  // Spaghettification: long along its path, thin across it.
  let stretch = 1.0 + min(speed * 0.25, 6.0);
  let dir = select(vec2f(1.0, 0.0), motion / max(speed, 1e-4), speed > 1e-4);
  piece.centre = a.xy;
  piece.along = dir * size * 0.5 * stretch;
  piece.width = size * 0.5 / sqrt(stretch);
  piece.heat = heat;
  piece.alpha = smoothstep(1.0, 0.9, fall) * smoothstep(1.05, 1.6, r) * mix(1.0, 0.35, heat);
  piece.depth = a.z;
  pieces[id.x] = piece;
}
