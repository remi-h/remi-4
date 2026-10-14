import { TERRAIN_MAP_EXTENT, TERRAIN_MAP_SIZE, terrainAlbedoNoise, terrainHeight } from "./terrain.wgsl";

@group(0) @binding(0) var terrainMap: texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var albedoMap: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> features: Features;

/** fuji: 0..1, raises Mt Fuji ahead and to the left of the track (the last stretch of the route). */
struct Features { fuji: f32, pad0: f32, pad1: f32, pad2: f32 };

/** Where Fuji stands relative to the camera (km): left of the track (−X is north... and the left window), well ahead. */
const FUJI_CENTER = vec2f(-16.0, 78.0);

/** A concave volcanic cone with a flat crater rim, 3.1 km (scaled to the terrain's height budget). */
fn fujiHeight(xz: vec2f) -> f32 {
  let d = length(xz - FUJI_CENTER) / 24.0;
  if (d >= 1.0) { return 0.0; }
  return min(3.1 * pow(1.0 - d, 1.7), 3.02);
}

fn bakedHeight(xz: vec2f) -> f32 {
  return max(terrainHeight(xz), fujiHeight(xz) * features.fuji);
}

/**
 * Bakes the procedural heightfield: R = height (km), GBA = normal, plus the two albedo noises in a second map.
 * Sampled by the terrain march and shading instead of re-evaluating the fbm and value noise per pixel. Re-run when
 * `features` change.
 */
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let uv = (vec2f(id.xy) + 0.5) / TERRAIN_MAP_SIZE;
  let xz = (uv - 0.5) * TERRAIN_MAP_EXTENT;
  let e = TERRAIN_MAP_EXTENT / TERRAIN_MAP_SIZE * 0.5;
  let dx = bakedHeight(xz + vec2f(e, 0.0)) - bakedHeight(xz - vec2f(e, 0.0));
  let dz = bakedHeight(xz + vec2f(0.0, e)) - bakedHeight(xz - vec2f(0.0, e));
  let normal = normalize(vec3f(-dx, 2.0 * e, -dz));
  textureStore(terrainMap, id.xy, vec4f(bakedHeight(xz), normal));
  textureStore(albedoMap, id.xy, vec4f(terrainAlbedoNoise(xz), 0.0, 1.0));
}
