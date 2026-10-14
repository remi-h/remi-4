// The pilot's seat: the exposed HDR view seen through an airliner windshield, then tonemapped (AgX).
//
// The glass is thick laminated panes: they bend and split the light near their edges (after the bezel
// optics of vgpu's Liquid Layout example), go faintly green there, carry dust and smears that light up
// around the sun (after the dirty glass of the Spiral Galaxy example), wiper scratches that glint in it,
// frost creeping in from the frame at altitude, and at night the instrument screens reflected low in the
// panes. The sun throws a veiling glare and a streak across the glass. The frame is a bevelled, painted
// structure with a rubber seal and rivets, lit by the real sun. Before you are aboard, `intro` is 0 and
// this pass shows the plain view (the airliner you are catching up with is drawn into it by
// airliner.wgsl); as you slip in through the side window, `intro` goes to 1 and the frame and glass close
// in around you. `handoffMix` dissolves the takeoff shot (boarding.wgsl, rendered into `handoff`) into it.

struct Cockpit {
  res: vec2f,
  intro: f32,
  time: f32,
  look: vec2f,
  /** 0..1: how much the eye has adapted to the dark (bluer, less saturated). */
  night: f32,
  /** 0..1 fade to black, for landing. */
  fade: f32,
  /** The light source on screen: uv.xy, how far it is in front of the camera (0..1), and the plane's roll (radians). */
  sun: vec4f,
  /** x: how far the takeoff shot has dissolved into the sky (1 = all sky). */
  handoffMix: vec4f,
};

@group(0) @binding(0) var<uniform> cockpit: Cockpit;
@group(0) @binding(1) var beauty: texture_2d<f32>;
@group(0) @binding(2) var bloom: texture_2d<f32>;
@group(0) @binding(3) var linearSampler: sampler;
@group(0) @binding(4) var glassDirt: texture_2d<f32>;
/** The takeoff shot, already display-referred, during the handoff. */
@group(0) @binding(5) var handoff: texture_2d<f32>;

// AgX (Wende's minimal fit, sRGB working space), as in the vgpu atmosphere example.
const AGX_INSET = mat3x3f(
  vec3f(0.842479062253094, 0.0423282422610123, 0.0423756549057051),
  vec3f(0.0784335999999992, 0.878468636469772, 0.0784336),
  vec3f(0.0792237451477643, 0.0791661274605434, 0.879142973793104),
);
const AGX_OUTSET = mat3x3f(
  vec3f(1.19687900512017, -0.0528968517574562, -0.0529716355144438),
  vec3f(-0.0980208811401368, 1.15190312990417, -0.0980434501171241),
  vec3f(-0.0990297440797205, -0.0989611768448433, 1.15107367264116),
);
const AGX_MIN_EV: f32 = -12.47393;
const AGX_MAX_EV: f32 = 4.026069;

fn agxContrast(x: vec3f) -> vec3f {
  let x2 = x * x;
  let x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}

fn tonemapAgx(color: vec3f) -> vec3f {
  var v = AGX_INSET * max(color, vec3f(1e-10));
  v = clamp(log2(v), vec3f(AGX_MIN_EV), vec3f(AGX_MAX_EV));
  v = (v - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV);
  v = agxContrast(v);
  v = AGX_OUTSET * v;
  return pow(max(v, vec3f(0.0)), vec3f(2.2));
}

fn linearToSrgb(value: vec3f) -> vec3f {
  let lo = value * 12.92;
  let hi = 1.055 * pow(value, vec3f(1.0 / 2.4)) - 0.055;
  return select(hi, lo, value <= vec3f(0.0031308));
}

fn hash(position: vec2f) -> f32 {
  var v = bitcast<vec2u>(vec2i(position)) * 1664525u + 1013904223u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> vec2u(16u);
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> vec2u(16u);
  return f32((v.x ^ v.y) >> 8u) / 16777216.0;
}

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

fn roundBox(p: vec2f, half: vec2f, r: f32) -> f32 {
  let q = abs(p) - half + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

fn smin(a: f32, b: f32, k: f32) -> f32 {
  let h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

// Screen space is y-up with the view spanning y in [-1, 1]; the structure is fixed to the plane.
fn glareLine(x: f32) -> f32 { return -0.7 + 0.035 * x * x; }
fn sidePost(y: f32) -> f32 { return 1.12 + 0.34 * y; }

/** Signed distance to the edge of the glass: positive inside a pane, negative on the frame. Rounded corners. */
fn glass(q: vec2f) -> f32 {
  let glare = q.y - glareLine(q.x);
  let overhead = (0.94 - 0.03 * q.x * q.x) - q.y;
  let center = abs(q.x) - 0.017;
  let side = abs(abs(q.x) - sidePost(q.y)) - 0.042;
  let k = 0.07;
  return smin(smin(glare, overhead, k), smin(center, side, k), k);
}

/** Unit normal of the glass field (pointing into the pane), by central differences. */
fn glassNormal(q: vec2f) -> vec2f {
  let e = 0.0025;
  let g = vec2f(glass(q + vec2f(e, 0.0)) - glass(q - vec2f(e, 0.0)), glass(q + vec2f(0.0, e)) - glass(q - vec2f(0.0, e)));
  return g / max(length(g), 1e-5);
}

/** From screen space to the plane's structure: head movement shifts it against the view, the roll turns it. */
fn toStructure(p: vec2f) -> vec2f {
  let shifted = p + cockpit.look * vec2f(0.07, 0.05);
  let roll = cockpit.sun.w;
  let turned = vec2f(shifted.x * cos(roll) - shifted.y * sin(roll), shifted.x * sin(roll) + shifted.y * cos(roll));
  // During the handoff the frame starts well beyond the screen and closes in.
  let settle = smoothstep(0.2, 1.0, cockpit.intro);
  return turned / mix(3.4, 1.0, 1.0 - (1.0 - settle) * (1.0 - settle));
}

/** Screen units (y-up, x scaled by aspect) to texture uv, and back. */
fn toUv(p: vec2f, aspect: f32) -> vec2f { return vec2f(p.x / aspect, -p.y) * 0.5 + 0.5; }
fn fromUv(uv: vec2f, aspect: f32) -> vec2f { return (uv - 0.5) * vec2f(aspect, -1.0) * 2.0; }

fn viewAt(uv: vec2f) -> vec3f {
  let at = clamp(uv, vec2f(0.001), vec2f(0.999));
  return textureSampleLevel(beauty, linearSampler, at, 0.0).rgb + textureSampleLevel(bloom, linearSampler, at, 0.0).rgb * 0.22;
}

/** The four instrument screens under the glare shield, as their reflection in the lower glass sees them. */
fn screens(q: vec2f) -> vec3f {
  let xs = array<f32, 4>(-1.02, -0.42, 0.42, 1.02);
  var light = vec3f(0.0);
  for (var i = 0; i < 4; i++) {
    let center = vec2f(xs[i], glareLine(xs[i]) - 0.22);
    let d = roundBox(q - center, vec2f(0.15, 0.09), 0.05);
    // Seen in thick glass the reflection is soft: a glow, not a crisp screen.
    let glow = exp(-max(d + 0.04, 0.0) / 0.07) * 0.6;
    // Flight and navigation screens read cyan, the engine pages in the middle amber.
    let tint = select(vec3f(0.25, 0.85, 1.0), vec3f(1.0, 0.62, 0.22), i == 1 || i == 2);
    light += tint * glow;
  }
  return light;
}

@fragment fn fs_main(@builtin(position) fragCoord: vec4f, @location(0) uv: vec2f) -> @location(0) vec4f {
  let aspect = cockpit.res.x / cockpit.res.y;
  let p = fromUv(uv, aspect);
  let px = 2.0 / cockpit.res.y;
  let q = toStructure(p);
  let d = glass(q);
  let n = glassNormal(q);

  // The light source on screen and how bright it really is in the scene (clouds and terrain hide it),
  // hidden behind the frame when the frame is in the way.
  let sunUv = cockpit.sun.xy;
  let sunP = fromUv(sunUv, aspect);
  let sunSample = textureSampleLevel(beauty, linearSampler, clamp(sunUv, vec2f(0.001), vec2f(0.999)), 0.0).rgb;
  let onScreen = step(0.0, sunUv.x) * step(sunUv.x, 1.0) * step(0.0, sunUv.y) * step(sunUv.y, 1.0);
  let sunThroughGlass = smoothstep(-0.02, 0.02, glass(toStructure(sunP)));
  // At night the light is the moon: the exposure makes its disc bright, but its glare in the glass is faint.
  let sunPower = clamp(luminance(sunSample) / 40.0, 0.0, 1.0) * cockpit.sun.z * onScreen * sunThroughGlass * mix(1.0, 0.12, cockpit.night);
  let sunColor = normalize(sunSample + 1e-4) * 1.7;
  let toSun = sunP - p;
  let sunDistance = length(toSun);
  let skyAmbient = textureSampleLevel(bloom, linearSampler, vec2f(0.5, 0.3), 0.0).rgb * 2.0 + viewAt(vec2f(0.5, 0.25)) * 0.15;

  var hdr: vec3f;
  if (d > 0.0) {
    // --- Glass -----------------------------------------------------------------------------
    let edge = 1.0 - smoothstep(0.0, 0.06, d);
    // Thick edges bend what is behind them outward and split the colours a little.
    let reach = -n * 0.018 * edge * edge;
    let offset = vec2f(reach.x / aspect, -reach.y) * 0.5;
    var view = vec3f(viewAt(uv + offset * 0.8).r, viewAt(uv + offset).g, viewAt(uv + offset * 1.25).b);
    // Laminated glass is faintly green, most at its edges, and darker where it meets the seal.
    view *= mix(vec3f(0.97, 0.99, 0.98), vec3f(0.78, 0.9, 0.84), edge);
    view *= 1.0 - 0.45 * pow(edge, 3.0);

    let dirt = textureSampleLevel(glassDirt, linearSampler, fract(vec2f(q.x / 3.2 + 0.5, 0.5 - q.y * 0.5)), 0.0);
    let brightness = luminance(view);

    // Frost grows in from the frame, most at night; it blurs what is behind it and catches light.
    let frostReach = mix(0.035, 0.11, cockpit.night) * (0.6 + 0.8 * dirt.b);
    let frost = smoothstep(frostReach, frostReach * 0.35, d) * mix(0.35, 0.85, cockpit.night);
    let blurred = textureSampleLevel(bloom, linearSampler, uv, 0.0).rgb * 3.0;
    // Frost scatters: it blurs and lifts what is behind it, never darkens it.
    view = mix(view, max(blurred, view) * 0.95 + skyAmbient * 0.25, frost * 0.7);

    // The sun's glare: a veil over the whole glass, much brighter in the dust and smears near it.
    let veil = exp(-sunDistance * 2.2) * 0.35 + exp(-sunDistance * 9.0) * 1.2;
    let dust = dirt.r * 1.6 + dirt.g * 0.9;
    var glare = sunColor * sunPower * veil * (0.15 + dust * 2.4);
    // Ambient light scattered by the dust, so the glass reads even without the sun.
    glare += (brightness * 0.06 + luminance(skyAmbient) * 0.05) * dust * vec3f(0.95, 0.97, 1.0);

    // Wiper scratches: fine arcs around each wiper's pivot that only show in the sun.
    let right = q.x > 0.0;
    let pivot = vec2f(select(-0.62, 0.62, right), glareLine(0.62) - 0.12);
    let r = length(q - pivot) * 420.0;
    let ringHash = hash(vec2f(floor(r), select(1.0, 2.0, right)));
    // Each scratch is a broken arc: it comes and goes along its length.
    let along = atan2(q.y - pivot.y, q.x - pivot.x) * 60.0;
    let broken = step(0.45, hash(vec2f(floor(r) * 7.0 + floor(along), 3.0)));
    let arc = exp(-pow((fract(r) - 0.5) * 4.0, 2.0)) * step(0.93, ringHash) * broken * (0.4 + ringHash * 0.6);
    let sweep = smoothstep(0.15, 0.35, (q.y - pivot.y) / max(length(q - pivot), 1e-4));
    glare += sunColor * sunPower * arc * sweep * exp(-sunDistance * 7.0) * 2.2;

    // The instrument screens reflected low in the glass, visible against the dark.
    let height = q.y - glareLine(q.x);
    glare += screens(vec2f(q.x, glareLine(q.x) - height)) * exp(-height / 0.25) * (0.002 + 0.012 * cockpit.night);

    // A streak across the windshield through the sun.
    glare += sunColor * sunPower * exp(-abs(toSun.y) * 140.0) * exp(-abs(toSun.x) * 1.4) * 0.5;

    let frostLight = luminance(skyAmbient) * 0.4 + sunPower * exp(-sunDistance * 3.0) * 0.8;
    hdr = view + glare + frost * vec3f(0.6, 0.75, 0.9) * frostLight;
  } else {
    // --- Frame -----------------------------------------------------------------------------
    let depth = -d;
    // The bevel turns towards the opening; flat paint beyond it.
    let bevel = 1.0 - smoothstep(0.0, 0.03, depth);
    let normal = normalize(vec3f(n * bevel * 1.4, 1.0));
    let lightDir = normalize(vec3f(toSun / max(sunDistance, 1e-4) * 0.8, 0.55));
    let halfway = normalize(lightDir + vec3f(0.0, 0.0, 1.0));
    let key = sunColor * sunPower * 0.35 + luminance(skyAmbient) * 0.12;
    // The instrument panel lights the lower frame from below, which is what shows of it at night.
    let panelLight = vec3f(0.25, 0.55, 0.6) * exp(-(q.y - glareLine(q.x)) / 0.6) * (0.01 + 0.05 * cockpit.night);
    let paint = vec3f(0.018, 0.019, 0.022) * (0.92 + 0.16 * hash(floor(fragCoord.xy / 2.0)));
    var color = paint * (skyAmbient * 0.35 * (0.55 + 0.45 * normal.z) + key * max(dot(normal, lightDir), 0.0) * 2.0);
    color += key * pow(max(dot(normal, halfway), 0.0), 60.0) * 0.35 * bevel;
    // The window's own light spills onto the bevel facing it.
    color += viewAt(uv) * 0.04 * bevel;
    color += panelLight * (0.12 + 0.88 * bevel);
    // Rubber seal right at the glass.
    color = mix(color, vec3f(0.004) + key * 0.01, 1.0 - smoothstep(0.004, 0.007, depth));
    // Rivets down the centre post.
    if (abs(q.x) < 0.017) {
      let local = vec2f(q.x, (fract(q.y / 0.13 + 0.5) - 0.5) * 0.13) / 0.0055;
      let rd = length(local);
      if (rd < 1.0) {
        let dome = normalize(vec3f(local * 0.8, sqrt(max(1.0 - rd * rd, 0.0))));
        color = paint * 1.6 * (luminance(skyAmbient) * 0.3 + key * max(dot(dome, lightDir), 0.0) * 2.5)
          + key * pow(max(dot(dome, halfway), 0.0), 40.0) * 0.4;
      }
    }
    // Contact shadow where the frame meets the glass.
    color *= 0.75 + 0.25 * smoothstep(0.0, 0.05, depth);
    hdr = color;
  }

  // Outside the plane there is no glass or frame: just the view, with the cockpit closing in as you enter.
  hdr = mix(viewAt(uv), hdr, smoothstep(0.0, 0.6, cockpit.intro));
  // Dark adaptation: at night the eye shifts towards blue and loses colour.
  hdr = mix(hdr, luminance(hdr) * vec3f(0.75, 0.9, 1.25), cockpit.night * 0.45);
  var color = tonemapAgx(hdr);
  // Vignette, as through an eye.
  color *= 1.0 - 0.35 * smoothstep(0.7, 1.6, length(p * vec2f(0.8, 1.0)));

  color = mix(color, vec3f(0.0), cockpit.fade);
  var display = linearToSrgb(saturate(color));
  display += (hash(fragCoord.xy + cockpit.time * 60.0) - 0.5) / 255.0 * 1.5;
  // The takeoff shot dissolves into the sky.
  if (cockpit.handoffMix.x < 1.0) {
    let shot = textureSampleLevel(handoff, linearSampler, uv, 0.0).rgb;
    display = mix(shot, display, cockpit.handoffMix.x);
  }
  return vec4f(saturate(display), 1.0);
}
