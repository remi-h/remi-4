import { TERRAIN_MAP_EXTENT, TERRAIN_MAP_SIZE, terrainAlbedoNoise, terrainRelief } from "./terrain.wgsl";

@group(0) @binding(0) var terrainMap: texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var albedoMap: texture_storage_2d<rgba8unorm, write>;

/**
 * Bakes one tile of the terrain once: R = ridged relief, G = fine rolling ground, BA = the relief's slope, all tiling every
 * TERRAIN_MAP_EXTENT km, and the two albedo noises in a second map. terrain.wgsl reads them at the camera's
 * position plus the distance flown and shapes the valley, horizon and Fuji on top.
 */
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let world = (vec2f(id.xy) + 0.5) / TERRAIN_MAP_SIZE * TERRAIN_MAP_EXTENT;
  // The relief's slope (per km), so a normal costs one read: half a texel either side.
  let e = TERRAIN_MAP_EXTENT / TERRAIN_MAP_SIZE * 0.5;
  let dx = (terrainRelief(world + vec2f(e, 0.0)).x - terrainRelief(world - vec2f(e, 0.0)).x) / (2.0 * e);
  let dz = (terrainRelief(world + vec2f(0.0, e)).x - terrainRelief(world - vec2f(0.0, e)).x) / (2.0 * e);
  textureStore(terrainMap, id.xy, vec4f(terrainRelief(world), dx, dz));
  textureStore(albedoMap, id.xy, vec4f(terrainAlbedoNoise(world), 0.0, 1.0));
}
