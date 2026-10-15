/**
 * How the business card on /.secret/card moves: the pointer (or the phone's tilt) turns it towards you
 * and moves the light across it, and nothing touches it for a while it sways on its own. All in the
 * shader's screen units: the card is 2 wide and the canvas's shorter side spans `SPAN` of them.
 */

export type Vec2 = [number, number];
export type Rect = { left: number; top: number; width: number; height: number };

/** Largest turn of the card, radians: [yaw, pitch]. */
export const MAX_TILT: Vec2 = [0.42, 0.32];
/** Screen units across the canvas, measured on its limiting side (see card.wgsl). */
const SPAN = 2.5;
/** The card's width to height (85 × 55 mm); the shader frames it to this. */
export const CARD_ASPECT = 85 / 55;
/** The eye's distance from the card, in screen units (card.wgsl). */
const EYE = 6;
/** Degrees of phone tilt that turn the card all the way. */
const PHONE_RANGE = 22;
/** Seconds without input before the card starts to sway on its own. */
const IDLE_AFTER = 2.5;
/** Seconds a flip takes. */
export const FLIP_SECONDS = 0.9;

const clamp = (x: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, x));

/** The pixel scale the shader uses: the canvas fits a card with room to tilt either way. */
const screenScale = (width: number, height: number) => Math.min(height * CARD_ASPECT * 1.05, width);

/** A point on the page in the shader's screen units, centred on the canvas, y down. */
export function screenPoint(x: number, y: number, rect: Rect): Vec2 {
  const scale = Math.max(1, screenScale(rect.width, rect.height));
  return [((x - rect.left - rect.width / 2) / scale) * SPAN, ((y - rect.top - rect.height / 2) / scale) * SPAN];
}

/** The card turns its face towards the pointer, and the light sits where the pointer is. */
export function pointerTilt(x: number, y: number, rect: Rect): { tilt: Vec2; light: Vec2 } {
  const [sx, sy] = screenPoint(x, y, rect);
  const half = SPAN / 2;
  return {
    tilt: [clamp(sx / half) * MAX_TILT[0], -clamp(sy / half) * MAX_TILT[1]],
    light: [clamp(sx, -3, 3), clamp(sy, -3, 3)],
  };
}

/**
 * The phone's tilt from where it was held (`rest`), in the screen's frame: `deviceorientation` reports
 * beta (front to back) and gamma (left to right) in the device's frame, which turns with the screen.
 * Returns how far right and down the phone is tipped, in degrees.
 */
export function screenTip(beta: number, gamma: number, rest: Vec2, angle: number): Vec2 {
  const right = gamma - rest[1];
  const down = beta - rest[0];
  switch (((Math.round(angle / 90) % 4) + 4) % 4) {
    case 1:
      return [down, -right];
    case 2:
      return [-right, -down];
    case 3:
      return [-down, right];
    default:
      return [right, down];
  }
}

/** Tipping the phone right or towards you works like moving the pointer right or down. */
export function phoneTilt(tip: Vec2): { tilt: Vec2; light: Vec2 } {
  const x = clamp(tip[0] / PHONE_RANGE);
  const y = clamp(tip[1] / PHONE_RANGE);
  return { tilt: [x * MAX_TILT[0], -y * MAX_TILT[1]], light: [x * 1.4, y * 0.9] };
}

/** Where "level" is drifts slowly towards how the phone is held now, so any grip works. */
export const settle = (rest: Vec2, beta: number, gamma: number, rate = 0.015): Vec2 => [
  rest[0] + (beta - rest[0]) * rate,
  rest[1] + (gamma - rest[1]) * rate,
];

/** A slow figure of eight while nobody is touching it. */
export function idleTilt(t: number): { tilt: Vec2; light: Vec2 } {
  const x = Math.sin(t * 0.55) * 0.75;
  const y = Math.sin(t * 1.1) * 0.5;
  return { tilt: [x * MAX_TILT[0] * 0.6, -y * MAX_TILT[1] * 0.6], light: [x * 1.2, y * 0.7] };
}

/** Frame-rate independent easing of `current` towards `target`. */
export const approach = (current: number, target: number, dt: number, rate: number) =>
  current + (target - current) * (1 - Math.exp(-rate * Math.min(dt, 0.1)));

/** Moves the flip's linear progress towards its target side (0 front, 1 back). */
export const stepFlip = (progress: number, target: number, dt: number) =>
  target > progress ? Math.min(target, progress + dt / FLIP_SECONDS) : Math.max(target, progress - dt / FLIP_SECONDS);

/** The flip's angle, in half turns, for a linear progress: eased at both ends. */
export const flipAngle = (progress: number) => {
  const x = clamp(progress, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** A `deviceorientation` reading: the new resting grip and where the card should turn, or null if empty. */
export function phoneReading(rest: Vec2 | null, beta: number | null, gamma: number | null, angle: number) {
  if (beta == null || gamma == null) return null;
  const next: Vec2 = rest ? settle(rest, beta, gamma) : [beta, gamma];
  return { rest: next, target: phoneTilt(screenTip(beta, gamma, next, angle)) };
}

/** Whether a key press should flip the card: a bare f, not typed into a field. */
export type KeyPress = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: { closest?: (selector: string) => unknown } | null;
};
const typing = (target: KeyPress['target']) => Boolean(target?.closest?.('input, textarea'));
export const isFlipKey = (e: KeyPress) => e.key === 'f' && !(e.metaKey || e.ctrlKey || e.altKey) && !typing(e.target);

export type CardState = { tilt: Vec2; light: Vec2; flip: number };

/**
 * One frame of the card's motion: ease towards the input (or the idle sway once nothing has moved for
 * `IDLE_AFTER` seconds) and carry the flip on. With reduced motion it follows the input almost at once,
 * never sways, and flips without turning.
 */
export function advance(
  state: CardState,
  input: { target: { tilt: Vec2; light: Vec2 }; flipTarget: number; now: number; lastInput: number },
  dt: number,
  still: boolean,
): CardState {
  const goal = !still && input.now - input.lastInput > IDLE_AFTER ? idleTilt(input.now) : input.target;
  const rate = still ? 30 : 6;
  const ease = (from: Vec2, to: Vec2): Vec2 => [approach(from[0], to[0], dt, rate), approach(from[1], to[1], dt, rate)];
  return {
    tilt: ease(state.tilt, goal.tilt),
    light: ease(state.light, goal.light),
    flip: still ? input.flipTarget : stepFlip(state.flip, input.flipTarget, dt),
  };
}

/**
 * Where a point on the page lands on the card, as the shader sees it: the ray from the eye through the
 * point, hit against the card turned by `tilt` and flipped by `flip` half turns. Returns the side facing
 * you and the point as fractions of that face (0..1, y down), or null off the card.
 */
export function cardPoint(point: Vec2, tilt: Vec2, flip: number): { front: boolean; u: number; v: number } | null {
  const yaw = tilt[0] + flip * Math.PI;
  const [sy, cy, sp, cp] = [Math.sin(yaw), Math.cos(yaw), Math.sin(tilt[1]), Math.cos(tilt[1])];
  const right = [cy, 0, -sy];
  const down = [sy * sp, cp, cy * sp];
  const normal = [
    right[1] * down[2] - right[2] * down[1],
    right[2] * down[0] - right[0] * down[2],
    right[0] * down[1] - right[1] * down[0],
  ];
  const length = Math.hypot(point[0], point[1], EYE);
  const ray = [point[0] / length, point[1] / length, -EYE / length];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const facing = dot(ray, normal);
  if (Math.abs(facing) < 1e-4) return null;
  const t = -(EYE * normal[2]) / facing;
  const hit = [ray[0] * t, ray[1] * t, EYE + ray[2] * t];
  const front = facing < 0;
  const x = dot(hit, right) * (front ? 1 : -1);
  const y = dot(hit, down);
  const half = 1 / CARD_ASPECT;
  if (Math.abs(x) > 1 || Math.abs(y) > half) return null;
  return { front, u: (x + 1) / 2, v: (y + half) / (2 * half) };
}
