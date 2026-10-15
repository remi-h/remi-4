// The black hole's world, shared by every pass: the camera, the page plane behind the hole, and when each
// tile of the page lets go. World units: the horizon's radius is `mass` (1 when fully grown), the disk
// lies in the y = 0 plane, the camera looks at the hole from DIST away.

export const DIST: f32 = 22.0;
export const FOCAL: f32 = 1.72;
/** How far behind the hole the page hangs. */
export const PLANE: f32 = 18.0;

export struct Eye {
  position: vec3f,
  forward: vec3f,
  right: vec3f,
  up: vec3f,
}

/** The camera, a little above the disk's plane so it reads as a tilted ring. */
export fn eye(pitch: f32) -> Eye {
  let position = vec3f(0.0, sin(pitch), cos(pitch)) * DIST;
  let forward = normalize(-position);
  let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
  return Eye(position, forward, right, cross(right, forward));
}

/** A point on screen (x across the aspect, y up, both -1..1 on the short side) to the ray through it. */
export fn rayFor(e: Eye, screen: vec2f) -> vec3f {
  return normalize(e.forward * FOCAL + e.right * screen.x + e.up * screen.y);
}

/** Screen coordinates (as above) to a texture uv (y down). */
export fn uvFor(screen: vec2f, aspect: f32) -> vec2f {
  return vec2f(screen.x / aspect * 0.5 + 0.5, 0.5 - screen.y * 0.5);
}

/** A texture uv to screen coordinates. */
export fn screenFor(uv: vec2f, aspect: f32) -> vec2f {
  return vec2f((uv.x * 2.0 - 1.0) * aspect, 1.0 - uv.y * 2.0);
}

/** Where on the page a straight ray from `p` along `v` lands, as a uv; outside 0..1 when it misses. */
export fn pageUv(e: Eye, p: vec3f, v: vec3f, aspect: f32) -> vec2f {
  let along = dot(v, e.forward);
  if (along < 0.05) {
    return vec2f(-9.0);
  }
  let centre = e.position + e.forward * (DIST + PLANE);
  let hit = p + v * (dot(centre - p, e.forward) / along);
  let local = vec2f(dot(hit - centre, e.right), dot(hit - centre, e.up));
  return uvFor(local * FOCAL / (DIST + PLANE), aspect);
}

/** The page plane's point for a uv. */
export fn pagePoint(e: Eye, uv: vec2f, aspect: f32) -> vec3f {
  let local = screenFor(uv, aspect) * (DIST + PLANE) / FOCAL;
  return e.position + e.forward * (DIST + PLANE) + e.right * local.x + e.up * local.y;
}

/** Where a direction from the camera lands on screen, as a uv (for things seen against the sky). */
export fn skyUv(e: Eye, v: vec3f, aspect: f32) -> vec2f {
  let along = max(dot(v, e.forward), 1e-3);
  return uvFor(vec2f(dot(v, e.right), dot(v, e.up)) * FOCAL / along, aspect);
}

export fn tileHash(cell: vec2f, salt: f32) -> f32 {
  return fract(sin(dot(cell, vec2f(12.9898, 78.233)) + salt * 37.719) * 43758.5453);
}

export struct Release {
  start: f32,
  spread: f32,
  jitter: f32,
  fallMin: f32,
  fallSpread: f32,
}

/** When a tile lets go of the page (s): those nearest the middle first, the corners last. */
export fn releaseTime(cell: vec2f, grid: vec2f, aspect: f32, r: Release) -> f32 {
  let uv = (cell + 0.5) / grid;
  let reach = length(vec2f(aspect, 1.0));
  let d = length((uv - 0.5) * 2.0 * vec2f(aspect, 1.0)) / reach;
  return r.start + r.spread * d + r.jitter * tileHash(cell, 1.0);
}

export fn fallTime(cell: vec2f, r: Release) -> f32 {
  return r.fallMin + r.fallSpread * tileHash(cell, 2.0);
}

export fn toLinear(c: vec3f) -> vec3f {
  return select(pow((c + 0.055) / 1.055, vec3f(2.4)), c / 12.92, c <= vec3f(0.04045));
}

export fn toDisplay(c: vec3f) -> vec3f {
  return select(1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, c * 12.92, c <= vec3f(0.0031308));
}
