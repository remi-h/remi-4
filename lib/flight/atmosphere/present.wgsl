struct Present { exposure: f32, tonemap: f32, dither: f32, pad: f32 };


@group(0) @binding(0) var<uniform> present: Present;
@group(0) @binding(1) var sceneHdr: texture_2d<f32>;
@group(0) @binding(2) var cloudsHdr: texture_2d<f32>;
@group(0) @binding(3) var linearSampler: sampler;

/**
 * Depth-aware upsample of the half-resolution cloud buffer: each bilinear tap is also weighted by how
 * closely the geometry distance under that tap matches this pixel's, which removes halos at silhouettes.
 */
fn upsampleClouds(uv: vec2f, pixelDistance: f32) -> vec4f {
  let size = vec2f(textureDimensions(cloudsHdr));
  let sceneSize = vec2f(textureDimensions(sceneHdr));
  let coord = uv * size - 0.5;
  let base = floor(coord);
  let f = fract(coord);
  var sum = vec4f(0.0);
  var weightSum = 0.0;
  for (var i = 0; i < 4; i += 1) {
    let corner = vec2f(f32(i & 1), f32(i >> 1));
    let texel = clamp(base + corner, vec2f(0.0), size - 1.0);
    let bilinear = mix(1.0 - f.x, f.x, corner.x) * mix(1.0 - f.y, f.y, corner.y);
    let tapUv = (texel + 0.5) / size;
    let tapDistance = textureLoad(sceneHdr, vec2i(tapUv * sceneSize), 0).a;
    let sameKind = select(0.0, 1.0, (tapDistance > 0.0) == (pixelDistance > 0.0));
    let depthWeight = sameKind / (1.0 + abs(tapDistance - pixelDistance) * 4.0);
    let weight = bilinear * (0.001 + depthWeight);
    sum += textureLoad(cloudsHdr, vec2i(texel), 0) * weight;
    weightSum += weight;
  }
  return sum / max(weightSum, 1e-5);
}

// Scene plus upsampled clouds, exposed but still linear HDR: the bloom and the cockpit pass (cockpit.wgsl) tonemap it.
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let scene = textureSample(sceneHdr, linearSampler, uv);
  // Clouds are premultiplied luminance with transmittance in alpha, rendered at half resolution.
  let cloud = upsampleClouds(uv, scene.a);
  return vec4f(max((scene.rgb * cloud.a + cloud.rgb) * present.exposure, vec3f(0.0)), 1.0);
}
