// Bloom's bright pass, after vgpu's Black Hole example (MIT, see NOTICE.md). The threshold sits above
// the page's own whites, so only the disk, the hot debris and the flash glow.

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let color = textureSampleLevel(src, samp, uv, 0.0).rgb;
  let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let knee = 0.5;
  let soft = clamp((luminance - 1.2 + knee) / (2.0 * knee), 0.0, 1.0);
  let contribution = max(soft * soft * knee, luminance - 1.2);
  return vec4f(color * contribution / max(luminance, 0.0001), 1.0);
}
