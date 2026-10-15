import { clock, effect, frameLoop, init, sampler, surface, texture } from 'vgpu';
import type { Gpu } from 'vgpu';
import shader from './card.wgsl';
import { drawFaces, linkAt } from './faces';
import {
  advance,
  cardPoint,
  type CardState,
  flipAngle,
  phoneReading,
  pointerTilt,
  screenPoint,
  type Vec2,
} from './motion';

export interface Card {
  /** Turns the card over; returns whether the back now faces you. */
  flip(): boolean;
  /** The link printed under a point on the page, if the back faces you and the point is on one. */
  linkAt(x: number, y: number): string | null;
  /** Starts following the phone's tilt. iOS asks the visitor first, so call it from a tap. */
  followPhone(): Promise<boolean>;
  dispose(): void;
}

type Permission = { requestPermission?: () => Promise<'granted' | 'denied'> };

/** True on a phone whose tilt needs the visitor's permission (iOS Safari), which only a tap can ask for. */
export const phoneNeedsPermission = () =>
  window.matchMedia('(pointer: coarse)').matches &&
  typeof DeviceOrientationEvent !== 'undefined' &&
  typeof (DeviceOrientationEvent as unknown as Permission).requestPermission === 'function';

/**
 * The card on /.secret/card. Mouse: the card turns to face the pointer and the light follows it,
 * anywhere on the page. Phone: tipping it does the same. Left alone, it sways slowly, and with reduced
 * motion it holds still and only answers the pointer. Resolves to null without WebGPU.
 */
export async function createCard(canvas: HTMLCanvasElement, onLost: () => void): Promise<Card | null> {
  let gpu: Gpu;
  try {
    gpu = await init();
  } catch {
    return null;
  }
  const output = surface(gpu, canvas, { dpr: [1, 2] });
  const faces = await drawFaces();
  const facesTexture = texture(gpu, {
    kind: '2d',
    size: faces.size,
    format: 'rgba8unorm',
    usage: ['texture_binding', 'copy_dst'],
    label: 'card faces',
  });
  gpu.gpu.queue.writeTexture({ texture: facesTexture.gpu }, faces.pixels, { bytesPerRow: faces.size[0] * 4 }, [
    ...faces.size,
    1,
  ]);
  const card = effect(gpu, shader, {
    label: 'business card',
    set: {
      params: { resolution: output.size, tilt: [0, 0], light: [0.6, -0.5], flip: 0, time: 0 },
      faces: facesTexture,
      linear: sampler(gpu, { minFilter: 'linear', magFilter: 'linear' }),
    },
  });
  await card.compile({ colors: [output.format] });

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const time = clock(gpu);
  let state: CardState = { tilt: [0, 0], light: [0.6, -0.5], flip: 0 };
  // Nothing has moved yet, so the card starts swaying at once.
  const input = {
    target: { tilt: [0, 0] as Vec2, light: [0.6, -0.5] as Vec2 },
    flipTarget: 0,
    now: 0,
    lastInput: -Infinity,
  };
  let rest: Vec2 | null = null;
  let phone = false;
  let disposed = false;

  const onPointer = (event: PointerEvent) => {
    if (phone && event.pointerType !== 'mouse') return;
    input.target = pointerTilt(event.clientX, event.clientY, canvas.getBoundingClientRect());
    input.lastInput = time.time;
  };
  const onOrientation = (event: DeviceOrientationEvent) => {
    const reading = phoneReading(rest, event.beta, event.gamma, screen.orientation?.angle ?? 0);
    if (!reading) return;
    phone = true;
    rest = reading.rest;
    input.target = reading.target;
    input.lastInput = time.time;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  // Android and desktop browsers report the tilt without asking.
  if (!phoneNeedsPermission()) window.addEventListener('deviceorientation', onOrientation);
  const unsubscribeResize = output.onResize(() => card.set({ params: { resolution: output.size } }));
  void gpu.lost.then(() => {
    if (!disposed) onLost();
  });

  const loop = frameLoop(
    gpu,
    (frame) => {
      const still = motion.matches;
      input.now = time.time;
      state = advance(state, input, time.deltaTime, still);
      card.set({
        params: { tilt: state.tilt, light: state.light, flip: flipAngle(state.flip), time: still ? 0 : time.time },
      });
      frame.pass(output, card);
    },
    { fps: 60 },
  );

  return {
    linkAt(x, y) {
      const hit = cardPoint(screenPoint(x, y, canvas.getBoundingClientRect()), state.tilt, flipAngle(state.flip));
      return hit && !hit.front ? linkAt(hit.u, hit.v) : null;
    },
    flip() {
      input.flipTarget = 1 - input.flipTarget;
      return input.flipTarget === 1;
    },
    async followPhone() {
      const permission = (DeviceOrientationEvent as unknown as Permission).requestPermission;
      try {
        if (permission && (await permission()) !== 'granted') return false;
      } catch {
        return false;
      }
      window.removeEventListener('deviceorientation', onOrientation);
      window.addEventListener('deviceorientation', onOrientation);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      loop.stop();
      unsubscribeResize();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('deviceorientation', onOrientation);
      gpu.dispose();
    },
  };
}
