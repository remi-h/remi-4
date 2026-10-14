import { effect, frame, frameLoop, init, sampler, surface, texture } from 'vgpu';
import type { Effect, Frame, FrameLoopHandle, Gpu, Surface, Texture } from 'vgpu';
import { drawGlyphAtlas, drawPlane, flapIndices } from './atlas';
import {
  applyFlight,
  bakeLuts,
  createGraph,
  destroyGraph,
  renderGraph,
  resizeGraph,
  type AtmosphereGraph,
} from './atmosphere/renderer';
import boardingShader from './boarding.wgsl';
import { ATMOSPHERE_PHYSICS } from './atmosphere/tuning';
import { chase } from './chase';
import { routeSky } from './route';
import { snapshotPage } from './snapshot';
import { CLOUD_SPEED, CRUISE_SECONDS, LANDING, arrivalLines, boardLines, sceneAt, T } from './timeline';

export type FlightScene = 'idle' | 'boarding' | 'flight' | 'landing';
export type FlightState = { scene: FlightScene; hud: boolean; progress: number };

const MESSAGE_SIZE = [32, 8] as const;
/** The sky renders at CSS pixels, and no wider than this: its cost is linear in pixels. */
const MAX_RENDER_WIDTH = 1200;
/** Head movement range, degrees. */
const LOOK_YAW = 28;
const LOOK_PITCH = 10;
const BASE_PITCH = -2;

function upload(gpu: Gpu, source: HTMLCanvasElement, label: string): Texture {
  const tex = texture(gpu, {
    kind: '2d',
    size: [source.width, source.height],
    format: 'rgba8unorm',
    usage: ['texture_binding', 'copy_dst', 'render_attachment'],
    label,
  });
  gpu.gpu.queue.copyExternalImageToTexture({ source }, { texture: tex.gpu }, [source.width, source.height]);
  return tex;
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** The internal size the sky renders at for a canvas of `cssSize`. */
export function renderSize(cssSize: readonly [number, number]): readonly [number, number] {
  const scale = Math.min(1, MAX_RENDER_WIDTH / Math.max(1, cssSize[0]));
  return [Math.max(1, Math.round(cssSize[0] * scale)), Math.max(1, Math.round(cssSize[1] * scale))];
}

/**
 * The /.secret flight. `prepareFlight` does the slow work as soon as the page loads (device, every pipeline,
 * the atmosphere's lookup tables and cloud noise, the flap and plane textures), so pressing board only has to
 * snapshot the page. Boarding runs boarding.wgsl over the snapshot; the flight is the vgpu atmosphere graph
 * (atmosphere/renderer.ts) seen from the cockpit; landing flips the board back to the page.
 */
export class Flight {
  private loop?: FrameLoopHandle;
  private pageTex?: Texture;
  private start = 0;
  private last = 0;
  private progress = 0;
  private travel = 0;
  private look = [0, 0];
  private lookTarget = [0, 0];
  private reduced = false;
  private landingStart = -1;
  private arrivalStart = -1;
  private broken = false;
  private state: FlightState = { scene: 'idle', hud: false, progress: 0 };
  /** Receives the view's pitch and yaw (degrees) as CSS variables, for the head-up display. */
  hud?: HTMLElement;

  constructor(
    private readonly gpu: Gpu,
    private readonly surf: Surface,
    private readonly boarding: Effect,
    private readonly graph: AtmosphereGraph,
    private readonly message: Texture,
    private readonly onChange: (state: FlightState) => void,
    private readonly onBroken: () => void,
  ) {
    // A lost device (driver reset, GPU switch, the browser reclaiming it) unconfigures the canvas. Land, and let
    // the page set up a fresh one.
    void gpu.lost.then((info) => this.fail(`GPU device lost (${info.reason}): ${info.message}`));
    let first = true;
    surf.onResize(() => {
      if (first) return void (first = false);
      resizeGraph(this.graph, renderSize(this.cssSize()));
    });
  }

  board(planeEl: Element, reduced: boolean) {
    this.reduced = reduced;
    this.setBoard(planeEl, boardLines(Math.floor(window.innerWidth / 64)), 0);
    this.progress = 0;
    this.travel = 0;
    this.landingStart = -1;
    this.arrivalStart = -1;
    this.start = this.now() - (reduced ? T.introEnd : 0);
    this.last = this.now();
    if (reduced) this.drawOnce();
    else this.run();
  }

  /** Jump past the boarding sequence to the view. */
  skip() {
    if (this.now() - this.start < T.introEnd) this.start = this.now() - T.introEnd;
    if (this.reduced) this.drawOnce();
  }

  /**
   * Start landing: the cockpit fades to black, then `arrive` (called by the page once it shows its landed
   * state) flips the board from black to LANDED and on to the page.
   */
  land() {
    if (this.state.scene === 'idle' || this.landingStart >= 0) return;
    this.landingStart = this.now();
    this.emit({ scene: 'landing', hud: false, progress: this.progress });
    if (this.reduced) this.drawOnce();
  }

  /** The page now shows that it landed: snapshot it and run the arrival board. */
  arrive(planeEl: Element) {
    const begin = () => {
      this.setBoard(planeEl, arrivalLines(Math.floor(window.innerWidth / 64)), 1);
      this.arrivalStart = this.now();
      if (this.reduced) this.finish();
    };
    // Let the cockpit finish fading first.
    const wait = this.reduced ? 0 : Math.max(0, LANDING.fade - (this.now() - this.landingStart));
    window.setTimeout(begin, wait * 1000);
  }

  /** Move along the route by `delta` from wherever the plane is now (keyboard). */
  nudge(delta: number) {
    this.setProgress(this.progress + delta);
  }

  setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, p));
    if (this.reduced) this.drawOnce();
  }

  setLook(x: number, y: number) {
    this.lookTarget = [x, y];
    if (this.reduced) {
      this.look = [x, y];
      this.drawOnce();
    }
  }

  dispose() {
    this.loop?.stop();
    this.pageTex?.destroy();
    destroyGraph(this.graph);
    this.gpu.dispose();
  }

  private now() {
    return performance.now() / 1000;
  }

  private cssSize(): readonly [number, number] {
    return [window.innerWidth, window.innerHeight];
  }

  private setBoard(planeEl: Element, lines: string[], mode: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const view = this.cssSize();
    this.pageTex?.destroy();
    this.pageTex = upload(this.gpu, snapshotPage(dpr), 'page');

    // Tiles follow the page's 64px grid, which scrolls with the page.
    const gridY = -(window.scrollY % 64);
    const cols = Math.floor(view[0] / 64);
    const width = Math.max(...lines.map((l) => [...l].length));
    const data = new Uint8Array(MESSAGE_SIZE[0] * MESSAGE_SIZE[1] * 4);
    lines.forEach((line, row) => {
      const pad = Math.floor((width - [...line].length) / 2);
      flapIndices(line).forEach((index, col) => (data[(row * MESSAGE_SIZE[0] + col + pad) * 4] = index));
    });
    this.gpu.gpu.queue.writeTexture(
      { texture: this.message.gpu },
      data,
      { bytesPerRow: MESSAGE_SIZE[0] * 4 },
      MESSAGE_SIZE,
    );
    const r = planeEl.getBoundingClientRect();
    this.boarding.set({
      page: this.pageTex,
      params: {
        view,
        t: 0,
        dpr,
        plane: [r.left, r.top, r.width, r.height],
        grid: [0, gridY, Math.max(0, Math.floor((cols - width) / 2)), Math.floor((view[1] / 2 - gridY) / 64) - 1],
        timesA: [T.flip, mode ? LANDING.back : T.back, T.taxi, T.lift],
        timesB: [T.handoff, T.vanish, width, lines.length],
        mode: [mode, 0, 0, 0],
      },
    });
  }

  private run() {
    this.loop?.stop();
    this.loop = frameLoop(this.gpu, (f) => this.render(f));
  }

  private drawOnce() {
    // Twice: the per-frame constants read the sky-view table the frame before writes.
    frame(this.gpu, (f) => this.render(f));
    frame(this.gpu, (f) => this.render(f));
  }

  private finish() {
    this.loop?.stop();
    this.loop = undefined;
    this.landingStart = -1;
    this.arrivalStart = -1;
    this.emit({ scene: 'idle', hud: false, progress: 0 });
  }

  private fail(reason: string) {
    if (this.broken) return;
    this.broken = true;
    console.warn('[flight] the canvas stopped working, setting up again:', reason);
    this.finish();
    this.onBroken();
  }

  private render(f: Frame) {
    if (this.gpu.disposed) return this.finish();
    try {
      this.frame(f);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
  }

  private frame(f: Frame) {
    const now = this.now();
    const dt = Math.min(0.1, now - this.last);
    this.last = now;

    // Arrival: the board, from black to LANDED to the page.
    if (this.arrivalStart >= 0) {
      const t = now - this.arrivalStart;
      if (t >= LANDING.end) return this.finish();
      this.boarding.set({ params: { t } });
      f.pass(this.surf, this.boarding);
      return;
    }

    const t = now - this.start;
    const s = sceneAt(t);
    if (s.scene === 'boarding') {
      this.boarding.set({ params: { t } });
      f.pass(this.surf, this.boarding);
    } else {
      const landing = this.landingStart >= 0;
      if (s.hud && !this.reduced && !landing) {
        this.progress = Math.min(1, this.progress + dt / CRUISE_SECONDS);
        if (this.progress >= 1) this.land();
      }
      if (!this.reduced) this.travel += dt * CLOUD_SPEED;
      // Ease the head towards the pointer so looking around feels weighty.
      const k = this.reduced ? 1 : 1 - Math.exp(-dt * 4);
      this.look = this.look.map((v, i) => v + (this.lookTarget[i] - v) * k);
      // Catching up with the plane: the chase (lib/flight/chase.ts) until you are in the seat.
      const view = chase(s.intro >= 1 ? 1 : easeInOut(s.intro), BASE_PITCH);
      const yaw = view.yaw + this.look[0] * LOOK_YAW * view.inside;
      const pitch = view.pitch + this.look[1] * LOOK_PITCH * view.inside;
      const sky = routeSky(this.progress);
      const fade = landing ? Math.min(1, (now - this.landingStart) / LANDING.fade) : 0;
      applyFlight(
        this.graph,
        {
          atmosphere: { ...sky.atmosphere, yaw, pitch, time: this.reduced ? 30 : t },
          illuminance: sky.illuminance,
          travel: this.travel,
          night: { stars: sky.stars, aurora: sky.aurora, city: sky.city, urban: sky.urban },
          fuji: sky.fuji,
          cockpit: {
            intro: view.inside,
            look: [this.look[0] * view.inside, this.look[1] * view.inside],
            night: sky.night,
            fade,
          },
          airliner: { camera: view.position, visible: view.visible },
          // The takeoff shot dissolves into the sky over the first second of the chase.
          dissolve: Math.min(1, s.intro / 0.12),
          // A slow bank and a little chop, so the plane feels like it is flying.
          roll: this.reduced
            ? 0
            : (0.03 * Math.sin(t * 0.07) + 0.012 * Math.sin(t * 0.31 + 1.3) + 0.003 * Math.sin(t * 2.3)) * view.inside,
        },
        renderSize(this.cssSize()),
      );
      // During the handoff the takeoff shot keeps playing underneath the sky dissolving in.
      if (s.intro < 0.12) {
        this.boarding.set({ params: { t } });
        f.pass(this.graph.handoff, this.boarding);
      }
      renderGraph(f, this.graph, this.surf);
      this.hud?.style.setProperty('--pitch', String(pitch));
      this.hud?.style.setProperty('--yaw', String(yaw));
    }
    const scene: FlightScene = this.landingStart >= 0 ? 'landing' : s.scene;
    const hud = scene === 'flight' && s.hud;
    const p = Math.round(this.progress * 1000) / 1000;
    if (scene !== this.state.scene || hud !== this.state.hud || p !== this.state.progress) {
      this.emit({ scene, hud, progress: p });
    }
  }

  private emit(state: FlightState) {
    this.state = state;
    this.onChange(state);
  }
}

/** Sets everything up ahead of the click. Resolves to null without WebGPU. */
export async function prepareFlight(
  canvas: HTMLCanvasElement,
  onChange: (state: FlightState) => void,
  onBroken: () => void,
): Promise<Flight | null> {
  let gpu: Gpu;
  try {
    gpu = await init();
  } catch {
    return null;
  }
  const body = getComputedStyle(document.body);
  const japanese = body.getPropertyValue('--font-dotgothic16').trim() || 'sans-serif';
  // Kana glyphs of a web font only download once something asks for them.
  await Promise.all([document.fonts.ready, document.fonts.load(`32px ${japanese}`, 'おかえり樋口').catch(() => [])]);
  const surf = surface(gpu, canvas, { dpr: [1, 2] });
  const linear = sampler(gpu, { minFilter: 'linear', magFilter: 'linear' });
  const blank = document.createElement('canvas');
  blank.width = blank.height = 1;
  blank.getContext('2d'); // copyExternalImageToTexture refuses a canvas without a context
  const message = texture(gpu, {
    kind: '2d',
    size: [...MESSAGE_SIZE],
    format: 'rgba8unorm',
    usage: ['texture_binding', 'copy_dst'],
    label: 'board message',
  });

  const boarding = effect(gpu, boardingShader, {
    label: 'boarding',
    set: {
      page: upload(gpu, blank, 'page placeholder'),
      glyphs: upload(gpu, drawGlyphAtlas(body.fontFamily, japanese), 'flap glyphs'),
      planeTex: upload(gpu, drawPlane(), 'plane'),
      message,
      samp: linear,
      params: {
        view: [1, 1],
        t: 0,
        dpr: 1,
        plane: [0, 0, 18, 18],
        grid: [0, 0, 0, 0],
        timesA: [T.flip, T.back, T.taxi, T.lift],
        timesB: [T.handoff, T.vanish, 0, 0],
        mode: [0, 0, 0, 0],
      },
    },
  });
  const graphPromise = createGraph(
    gpu,
    { size: renderSize([window.innerWidth, window.innerHeight]), format: surf.format },
    'flight',
  );
  const graph = await graphPromise;
  graph.accumulate = true;
  const mark = document.createElement('canvas');
  mark.width = mark.height = 256;
  const markCtx = mark.getContext('2d')!;
  markCtx.fillStyle = '#fff';
  markCtx.textAlign = 'center';
  markCtx.textBaseline = 'middle';
  markCtx.font = `150px ${japanese}`;
  markCtx.fillText('樋口', 128, 132);
  gpu.gpu.queue.copyExternalImageToTexture({ source: mark }, { texture: graph.livery.gpu }, [256, 256]);
  // Bake the lookup tables for the route's air now, outside any frame, so the first flight frame is ready.
  const sky = routeSky(0);
  graph.atmosphere.set({
    mieScattering: ATMOSPHERE_PHYSICS.mieScattering.map((v) => v * sky.atmosphere.haze) as [number, number, number],
    mieAbsorption: ATMOSPHERE_PHYSICS.mieAbsorption.map((v) => v * sky.atmosphere.haze) as [number, number, number],
  });
  graph.bakedHaze = sky.atmosphere.haze;
  bakeLuts(gpu, graph);
  await Promise.all([boarding.compile(surf), boarding.compile(graph.handoff)]);
  return new Flight(gpu, surf, boarding, graph, message, onChange, onBroken);
}
