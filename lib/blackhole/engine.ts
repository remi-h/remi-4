import { compute, draw, effect, frameLoop, init, sampler, storage, surface, target, texture } from 'vgpu';
import type { Compute, Draw, Effect, Frame, FrameLoopHandle, Gpu, StorageBuffer, Surface, Target, Texture } from 'vgpu';
import { snapshotPage } from '@/lib/flight/snapshot';
import blurShader from './blur.wgsl';
import brightShader from './bright.wgsl';
import debrisDrawShader from './debris-draw.wgsl';
import debrisShader from './debris.wgsl';
import presentShader from './present.wgsl';
import resolveShader from './resolve.wgsl';
import { holeAt, RELEASE, SPIT_SECONDS, spitTime, SWALLOW_SECONDS } from './timeline';
import traceShader from './trace.wgsl';

export interface BlackHole {
  /** Redraws the page and lets the hole drink it; resolves once nothing is left but the hole. */
  swallow(): Promise<void>;
  /** Gives the page back, then gets out of the way; resolves once the real page shows again. */
  spit(): Promise<void>;
  dispose(): void;
}

/** The page breaks into tiles this many CSS pixels across. */
const TILE = 8;
/** Geodesics are traced at most this wide (CSS px); the page itself is resolved at full resolution. */
const MAX_TRACE_WIDTH = 900;
/** The camera's pitch above the disk's plane (radians). */
const PITCH = 0.11;
/** Floats in debris.wgsl's Piece. */
const PIECE_FLOATS = 8;
const CLEAR = [0, 0, 0, 1] as const;
const TRANSPARENT = [0, 0, 0, 0] as const;
const BLURS = [
  { direction: [1, 0], radius: 1 },
  { direction: [0, 1], radius: 1 },
  { direction: [1, 0], radius: 2.6 },
  { direction: [0, 1], radius: 2.6 },
] as const;

type Size = [number, number];

function upload(gpu: Gpu, source: HTMLCanvasElement): Texture {
  const tex = texture(gpu, {
    kind: '2d',
    size: [source.width, source.height],
    format: 'rgba8unorm',
    usage: ['texture_binding', 'copy_dst', 'render_attachment'],
    label: 'swallowed page',
  });
  gpu.gpu.queue.copyExternalImageToTexture({ source }, { texture: tex.gpu }, [source.width, source.height]);
  return tex;
}

/** Everything sized to the screen, made when the hole opens. */
type Scene = {
  page: Texture;
  pieces: StorageBuffer;
  count: number;
  debris: Target;
  traced: Target;
  scene: Target;
  bloom: readonly [Target, Target];
};

type Passes = {
  debris: Compute;
  debrisDraw: Draw;
  trace: Effect;
  resolve: Effect;
  bright: Effect;
  blur: Effect[];
  present: Effect;
};

/** Every pipeline, made once: the targets they draw into come per swallow. */
function createPasses(gpu: Gpu, samp: GPUSampler): Passes {
  return {
    debris: compute(gpu, debrisShader, { label: 'debris' }),
    debrisDraw: draw(gpu, {
      shader: debrisDrawShader,
      vertices: 6,
      instances: 1,
      blend: 'premultiplied',
      label: 'debris quads',
    }),
    trace: effect(gpu, traceShader, {
      label: 'geodesics',
      set: { trace: { aspect: 1, mass: 0, time: 0, feed: 1, pitch: PITCH, pad0: 0, pad1: 0, pad2: 0 } },
    }),
    resolve: effect(gpu, resolveShader, { label: 'resolve' }),
    bright: effect(gpu, brightShader, { label: 'bright', set: { samp } }),
    blur: BLURS.map((b) =>
      effect(gpu, blurShader, { label: 'blur', set: { samp, blur: { ...b, texelSize: [1, 1] } } }),
    ),
    present: effect(gpu, presentShader, {
      label: 'present',
      set: { samp, present: { flash: 0, strength: 0, pad0: 0, pad1: 0 } },
    }),
  };
}

/** Builds the targets for the screen as it is now, and binds every pass to them. */
function buildScene(gpu: Gpu, p: Passes, samp: GPUSampler): Scene {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const css: Size = [window.innerWidth, window.innerHeight];
  const full: Size = [Math.round(css[0] * dpr), Math.round(css[1] * dpr)];
  const traceScale = Math.min(dpr, MAX_TRACE_WIDTH / css[0]);
  const traceSize: Size = [Math.max(1, Math.round(css[0] * traceScale)), Math.max(1, Math.round(css[1] * traceScale))];
  const bloomSize: Size = [Math.max(1, Math.round(full[0] / 2)), Math.max(1, Math.round(full[1] / 2))];
  const grid: Size = [Math.ceil(css[0] / TILE), Math.ceil(css[1] / TILE)];
  const count = grid[0] * grid[1];
  const aspect = css[0] / css[1];
  const release = { ...RELEASE };

  const scene: Scene = {
    page: upload(gpu, snapshotPage(dpr)),
    pieces: storage(gpu, count * PIECE_FLOATS * 4, 'read-write'),
    count,
    debris: target(gpu, { size: full, format: 'rgba16float' }),
    traced: target(gpu, { size: traceSize, colors: [{ format: 'rgba16float' }, { format: 'rgba32float' }] }),
    scene: target(gpu, { size: full, format: 'rgba16float' }),
    bloom: [
      target(gpu, { size: bloomSize, format: 'rgba16float' }),
      target(gpu, { size: bloomSize, format: 'rgba16float' }),
    ],
  };
  p.debris.set({
    pieces: scene.pieces,
    sim: { grid, view: full, aspect, time: 0, mass: 0, pitch: PITCH, release, tile: TILE * dpr, pad0: 0 },
  });
  p.debrisDraw.set({ pieces: scene.pieces, look: { view: full, grid }, page: scene.page, samp });
  p.trace.set({ trace: { aspect } });
  const [disk, lens] = scene.traced.colors;
  p.resolve.set({
    resolve: { traceSize, grid, aspect, time: 0, release, pad0: 0, pad1: 0 },
    page: scene.page,
    debris: scene.debris,
    disk,
    lens,
    samp,
  });
  p.bright.set({ src: scene.scene });
  p.blur.forEach((b, i) => b.set({ src: scene.bloom[i % 2], blur: { texelSize: scene.bloom[i % 2].texelSize } }));
  p.present.set({ scene: scene.scene, bloom: scene.bloom[0] });
  return scene;
}

function destroyScene(s: Scene) {
  s.page.destroy();
  for (const t of [s.debris, s.traced, s.scene, ...s.bloom]) (t as { destroy?: () => void }).destroy?.();
}

/**
 * One frame at `t` seconds into the swallow: tiles fly (compute), are drawn as quads (instanced), the
 * geodesics are traced at low resolution, the page and debris resolved through them at full resolution,
 * then bloom and onto the screen.
 */
function renderAt(frame: Frame, p: Passes, s: Scene, output: Surface, t: number) {
  const hole = holeAt(t);
  p.debris.set({ sim: { time: t, mass: hole.mass } });
  p.trace.set({ trace: { mass: hole.mass, time: (performance.now() / 1000) % 1000, feed: hole.feed } });
  p.resolve.set({ resolve: { time: t } });
  p.present.set({ present: { flash: hole.flash, strength: hole.strength } });

  frame.computePass((pass) => pass.dispatch(p.debris, Math.ceil(s.count / 64)));
  frame.pass({ target: s.debris, clear: TRANSPARENT }, (pass) => pass.draw(p.debrisDraw, { instances: s.count }));
  frame.pass({ target: s.traced, clear: CLEAR }, (pass) => pass.draw(p.trace));
  frame.pass({ target: s.scene, clear: CLEAR }, (pass) => pass.draw(p.resolve));
  frame.pass({ target: s.bloom[0], clear: CLEAR }, (pass) => pass.draw(p.bright));
  p.blur.forEach((b, i) => frame.pass({ target: s.bloom[(i + 1) % 2], clear: CLEAR }, (pass) => pass.draw(b)));
  frame.pass({ target: output, clear: CLEAR }, (pass) => pass.draw(p.present));
}

class Hole implements BlackHole {
  private loop: FrameLoopHandle | null = null;
  private scene: Scene | null = null;
  private readonly samp: GPUSampler;
  readonly passes: Passes;

  constructor(
    private readonly gpu: Gpu,
    private readonly canvas: HTMLCanvasElement,
    readonly output: Surface,
  ) {
    this.samp = sampler(gpu, { minFilter: 'linear', magFilter: 'linear' });
    this.passes = createPasses(gpu, this.samp);
  }

  /** Runs for `seconds`, with `clock` turning elapsed time into the swallow's time. */
  private play(seconds: number, clock: (elapsed: number) => number): Promise<void> {
    const scene = this.scene!;
    // Wall-clock time: the gpu's clock jumps by however long it sat idle on the first frame.
    const start = performance.now();
    this.loop?.stop();
    return new Promise((done) => {
      this.loop = frameLoop(this.gpu, (frame) => {
        const elapsed = (performance.now() - start) / 1000;
        renderAt(frame, this.passes, scene, this.output, clock(Math.min(elapsed, seconds)));
        if (elapsed >= seconds) {
          this.loop?.stop();
          done();
        }
      });
    });
  }

  swallow() {
    this.clear();
    this.scene = buildScene(this.gpu, this.passes, this.samp);
    this.canvas.style.visibility = 'visible';
    return this.play(SWALLOW_SECONDS, (elapsed) => elapsed);
  }

  async spit() {
    if (!this.scene) return;
    await this.play(SPIT_SECONDS, spitTime);
    this.canvas.style.visibility = 'hidden';
    this.clear();
  }

  private clear() {
    if (this.scene) destroyScene(this.scene);
    this.scene = null;
  }

  dispose() {
    this.loop?.stop();
    this.clear();
    this.canvas.remove();
    this.gpu.dispose();
  }
}

/** Compiles every pipeline against the formats it draws into, so the first frame does not stall. */
async function warm(p: Passes, output: Surface) {
  const hdr = { colors: ['rgba16float'] as GPUTextureFormat[] };
  await Promise.all([
    p.debris.compile(),
    p.debrisDraw.compile(hdr),
    p.trace.compile({ colors: ['rgba16float', 'rgba32float'] as GPUTextureFormat[] }),
    p.resolve.compile(hdr),
    p.bright.compile(hdr),
    ...p.blur.map((b) => b.compile(hdr)),
    p.present.compile({ colors: [output.format] }),
  ]);
}

/** Sets the hole up (WebGPU, its canvas, every pipeline) ahead of time. Resolves to null without WebGPU. */
export async function prepareBlackHole(): Promise<BlackHole | null> {
  let gpu: Gpu;
  try {
    gpu = await init();
  } catch {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'fixed inset-0 z-[150] block h-full w-full';
  canvas.style.visibility = 'hidden';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('data-snapshot-skip', '');
  document.body.appendChild(canvas);
  try {
    const hole = new Hole(gpu, canvas, surface(gpu, canvas, { dpr: [1, 2] }));
    await warm(hole.passes, hole.output);
    return hole;
  } catch (error) {
    canvas.remove();
    gpu.dispose();
    console.warn('[black hole] could not set up:', error);
    return null;
  }
}
