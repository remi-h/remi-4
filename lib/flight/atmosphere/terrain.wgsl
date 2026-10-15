// Procedural ridged heightfield in kilometres: a flat valley around the camera, mountains from ~6 km out.
// The plane flies over it: the relief is baked once as a map that tiles every TERRAIN_MAP_EXTENT km, and every
// lookup reads it at the camera-relative position plus `TerrainShift.offset` (the distance flown), while the
// valley under the camera and the fade towards the horizon stay with the camera. Mt Fuji is a separate cone,
// placed in the world near the end of the route, so the plane flies towards it.

export const TERRAIN_MAX_DISTANCE: f32 = 90.0;
export const TERRAIN_MAX_HEIGHT: f32 = 3.2;
/** The baked relief tiles every this many km (16 cells of the base noise, so the noise wraps exactly). */
export const TERRAIN_MAP_EXTENT: f32 = 256.0;
export const TERRAIN_MAP_SIZE: f32 = 2048.0;
/** Ring grid of the terrain mesh (terrain-mesh.wgsl): azimuth columns around the camera axis and rings per column. */
export const TERRAIN_MESH_COLUMNS: u32 = 4096u;
export const TERRAIN_MESH_RINGS: u32 = 512u;
/** Near plane (km) of the terrain depth prepass: reversed-Z, depth = TERRAIN_NEAR / view depth. */
export const TERRAIN_NEAR: f32 = 0.001;

const TAU: f32 = 6.28318530717959;
/** Ring layout: fine geometric steps over the flat valley, 265 m steps across the mountains (heightmap texels are 98 m), coarse steps over the bare sphere. */
const NEAR_RINGS: u32 = 128u;
const MID_RINGS: u32 = 320u;
const NEAR_RADIUS: f32 = 0.005;
const MID_RADIUS: f32 = 5.0;
const FAR_RADIUS: f32 = 90.0;
const LAST_RADIUS: f32 = 400.0;

fn ringRadius(ring: u32) -> f32 {
  if (ring == 0u) { return 0.0; }
  if (ring <= NEAR_RINGS) { return NEAR_RADIUS * pow(MID_RADIUS / NEAR_RADIUS, f32(ring - 1u) / f32(NEAR_RINGS - 1u)); }
  if (ring <= NEAR_RINGS + MID_RINGS) { return MID_RADIUS + (FAR_RADIUS - MID_RADIUS) * f32(ring - NEAR_RINGS) / f32(MID_RINGS); }
  return FAR_RADIUS * pow(LAST_RADIUS / FAR_RADIUS, f32(ring - NEAR_RINGS - MID_RINGS) / f32(TERRAIN_MESH_RINGS - NEAR_RINGS - MID_RINGS));
}

/**
 * A vertex of the terrain ring grid, relative to the ground point under the camera axis (0, groundRadius, 0).
 * The grid is a static set of rings around that axis: one triangle strip per azimuth column (`instanceIndex` plus
 * `columnOffset`), `TERRAIN_MESH_RINGS + 1` ring vertices on each side, no vertex buffers. Heights come from the
 * baked heightmap, and the surface sits at altitude h over the sphere: y = sqrt((R + h)^2 - r^2), formed here
 * without subtracting two 6360 km numbers, which f32 could not afford. Azimuth 0 is +Z, like the camera yaw.
 */
export fn terrainMeshVertex(vertexIndex: u32, instanceIndex: u32, columnOffset: u32, groundRadius: f32, map: texture_2d<f32>, mapSampler: sampler, shift: TerrainShift) -> vec3f {
  let ring = vertexIndex / 2u;
  let column = (columnOffset + instanceIndex + (vertexIndex & 1u)) % TERRAIN_MESH_COLUMNS;
  let theta = f32(column) * (TAU / f32(TERRAIN_MESH_COLUMNS));
  let radius = ringRadius(ring);
  let xz = vec2f(sin(theta), cos(theta)) * radius;
  let height = sampleTerrainHeight(map, mapSampler, shift, xz);
  let surfaceRadius = groundRadius + height;
  let rr = dot(xz, xz);
  let y = sqrt(max(surfaceRadius * surfaceRadius - rr, 0.0));
  let relativeY = (height * (2.0 * groundRadius + height) - rr) / (y + groundRadius);
  return vec3f(xz.x, relativeY, xz.y);
}
/**
 * How far the plane has flown over the terrain, and where Fuji stands relative to the camera (km, xz = x, z).
 * `shadowDelta` is the distance flown since the sun's shadow maps were last rendered: lookups into them add it,
 * so the maps can be re-rendered every few hundred metres instead of every frame.
 */
export struct TerrainShift { offset: vec2f, fujiCenter: vec2f, shadowDelta: vec2f, fuji: f32, pad: f32 };

const TERRAIN_SCALE: f32 = 1.0 / 16.0;
const OCTAVES: i32 = 6;
/** Base noise cells across one tile: TERRAIN_MAP_EXTENT * TERRAIN_SCALE. */
const PERIOD: f32 = 16.0;

/**
 * Uniform [0, 1) value per lattice cell from an integer hash (pcg2d). The usual fract(sin(h) * 43758.5)
 * hash takes the sine of arguments in the thousands, which every GPU rounds differently, so the same
 * terrain came out with different mountains on Metal and on Mesa; integer arithmetic is exact everywhere.
 */
/** Offsets the lattice hash; picks which of the equally random landscapes the camera stands in. */
const TERRAIN_SEED: u32 = 7u;

fn hash2(p: vec2f) -> f32 {
  var v = (bitcast<vec2u>(vec2i(p)) + vec2u(TERRAIN_SEED, 0u)) * 1664525u + 1013904223u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> vec2u(16u);
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> vec2u(16u);
  return f32((v.x ^ v.y) >> 8u) / 16777216.0;
}

/** Value noise whose lattice wraps every `period` cells, so the baked map tiles without a seam. */
fn tiledNoise(p: vec2f, period: f32) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let wrap = (i % period + period) % period;
  let next = ((i + 1.0) % period + period) % period;
  let a = hash2(wrap);
  let b = hash2(vec2f(next.x, wrap.y));
  let c = hash2(vec2f(wrap.x, next.y));
  let d = hash2(next);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

/**
 * The ridged relief and the fine rolling ground at a world position (km), both tiling every TERRAIN_MAP_EXTENT km.
 * Octaves double the frequency without rotating, so each octave still wraps on the tile.
 */
export fn terrainRelief(world: vec2f) -> vec2f {
  var p = world * TERRAIN_SCALE;
  var period = PERIOD;
  var amplitude = 1.0;
  var height = 0.0;
  var weight = 1.0;
  for (var i = 0; i < OCTAVES; i += 1) {
    let n = 1.0 - abs(tiledNoise(p, period));
    height += n * n * amplitude * weight;
    weight = clamp(n * 1.2, 0.0, 1.0);
    p = p * 2.0 + vec2f(f32(i) * 3.0 + 1.0, f32(i) * 5.0 + 2.0);
    period *= 2.0;
    amplitude *= 0.5;
  }
  let fine = world * (PERIOD * 14.0 / TERRAIN_MAP_EXTENT);
  let rolling = tiledNoise(fine, PERIOD * 14.0) + 0.5 * tiledNoise(fine * 2.0 + 4.0, PERIOD * 28.0);
  return vec2f(height, rolling);
}

fn smoothCurve(a: f32, b: f32, x: f32) -> vec2f {
  // smoothstep and its derivative in x.
  let t = clamp((x - a) / (b - a), 0.0, 1.0);
  return vec2f(t * t * (3.0 - 2.0 * t), 6.0 * t * (1.0 - t) / (b - a));
}

/**
 * Height above sea level (km) and its slope (d/dx, d/dz) at a camera-relative tangent-plane position (km), as
 * the plane flies over it: one filtered read of the baked tile (relief, rolling ground and the relief's slope),
 * then the camera-relative valley and horizon fade and their exact slopes. `mapSampler` must repeat.
 */
export fn sampleTerrain(map: texture_2d<f32>, mapSampler: sampler, shift: TerrainShift, xz: vec2f) -> vec3f {
  let tile = textureSampleLevel(map, mapSampler, (xz + shift.offset) / TERRAIN_MAP_EXTENT, 0.0);
  let distance = max(length(xz), 1e-4);
  let radial = xz / distance;
  // Flat ground under the camera, foothills from ~1 km, full mountains beyond ~6 km, fading out before the march limit.
  let valley = smoothCurve(1.0, 6.0, distance);
  let edge = smoothCurve(TERRAIN_MAX_DISTANCE * 0.7, TERRAIN_MAX_DISTANCE, distance);
  let fade = vec2f(1.0 - edge.x, -edge.y);
  let rollingMask = smoothCurve(0.1, 1.0, distance);
  let ridged = tile.x > 0.55;
  let mountains = select(0.0, (tile.x - 0.55) * 2.6, ridged);
  let mountainSlope = select(vec2f(0.0), tile.zw * 2.6, ridged);
  let rolling = 0.02 * tile.y * rollingMask.x;
  let inner = mountains * valley.x + rolling;
  var height = inner * fade.x;
  var slope = (mountainSlope * valley.x + radial * (mountains * valley.y + 0.02 * tile.y * rollingMask.y)) * fade.x + radial * inner * fade.y;
  if (height <= 0.0) { height = 0.0; slope = vec2f(0.0); }
  // Fuji, a cone of its own.
  let toFuji = xz - shift.fujiCenter;
  let d = length(toFuji) / 24.0;
  if (shift.fuji > 0.0 && d < 1.0) {
    let cone = 3.1 * pow(1.0 - d, 1.7) * shift.fuji;
    if (cone < 3.02 * shift.fuji && cone > height) {
      height = cone;
      slope = -toFuji / max(length(toFuji), 1e-4) * (3.1 * 1.7 * pow(1.0 - d, 0.7) / 24.0) * shift.fuji;
    } else if (cone >= 3.02 * shift.fuji && 3.02 * shift.fuji > height) {
      height = 3.02 * shift.fuji;
      slope = vec2f(0.0);
    }
  }
  return vec3f(height, slope);
}

export fn sampleTerrainHeight(map: texture_2d<f32>, mapSampler: sampler, shift: TerrainShift, xz: vec2f) -> f32 {
  return sampleTerrain(map, mapSampler, shift, xz).x;
}

export fn sampleTerrainNormal(map: texture_2d<f32>, mapSampler: sampler, shift: TerrainShift, xz: vec2f) -> vec3f {
  let slope = sampleTerrain(map, mapSampler, shift, xz).yz;
  return normalize(vec3f(-slope.x, 1.0, -slope.y));
}

/** The two low-frequency noises the albedo uses, in [0, 1], tiling with the relief; baked by terrain-heightmap.wgsl. */
export fn terrainAlbedoNoise(world: vec2f) -> vec2f {
  let p = world / TERRAIN_MAP_EXTENT;
  return vec2f(0.5 + 0.5 * tiledNoise(p * 90.0, 90.0), 0.5 + 0.5 * tiledNoise(p * 51.0 + 7.0, 51.0));
}

export fn sampleTerrainAlbedoNoise(map: texture_2d<f32>, mapSampler: sampler, shift: TerrainShift, xz: vec2f) -> vec2f {
  return textureSampleLevel(map, mapSampler, (xz + shift.offset) / TERRAIN_MAP_EXTENT, 0.0).rg;
}

/** Linear reflectance by altitude and slope. Dark vegetation and weathered rock leave headroom for sunlit snow. */
export fn terrainAlbedo(height: f32, normal: vec3f, noise: vec2f) -> vec3f {
  let mountain = smoothstep(0.02, 0.25, height);
  let grass = mix(vec3f(0.11, 0.13, 0.05), vec3f(0.035, 0.075, 0.025), mountain);
  let dry = mix(vec3f(0.22, 0.17, 0.10), vec3f(0.12, 0.085, 0.04), mountain);
  let rock = mix(vec3f(0.065, 0.075, 0.085), vec3f(0.12, 0.10, 0.075), noise.y);
  let snow = vec3f(0.78, 0.80, 0.84);
  var albedo = mix(grass, dry, noise.x);
  let slope = 1.0 - normal.y;
  albedo = mix(albedo, rock, smoothstep(0.08, 0.35, slope));
  // Broad material variation remains visible under overhead light, when slope lighting alone has little contrast.
  albedo *= mix(1.0, mix(0.65, 1.2, smoothstep(0.15, 0.85, noise.x)), mountain);
  let snowLine = 1.9 + 0.35 * (noise.y * 2.0 - 1.0);
  let snowAmount = smoothstep(snowLine, snowLine + 0.5, height) * (1.0 - smoothstep(0.35, 0.6, slope));
  return mix(albedo, snow, snowAmount);
}
