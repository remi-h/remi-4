import {
  advance,
  approach,
  cardPoint,
  type CardState,
  FLIP_SECONDS,
  flipAngle,
  idleTilt,
  isFlipKey,
  MAX_TILT,
  phoneReading,
  phoneTilt,
  pointerTilt,
  screenPoint,
  screenTip,
  settle,
  stepFlip,
} from './motion';

const rect = { left: 100, top: 50, width: 800, height: 600 };

describe('the pointer', () => {
  it('maps the canvas centre to the middle of the card', () => {
    expect(screenPoint(500, 350, rect)).toEqual([0, 0]);
  });

  it('turns the card towards it, and puts the light under it', () => {
    const right = pointerTilt(900, 350, rect);
    expect(right.tilt[0]).toBeGreaterThan(0);
    expect(right.tilt[1]).toBeCloseTo(0);
    expect(right.light[0]).toBeGreaterThan(1);
    const below = pointerTilt(500, 650, rect);
    expect(below.tilt[1]).toBeLessThan(0);
    expect(below.light[1]).toBeGreaterThan(0);
  });

  it('never turns the card further than the limit, wherever it is on the page', () => {
    const far = pointerTilt(-5000, 9000, rect);
    expect(far.tilt).toEqual([-MAX_TILT[0], -MAX_TILT[1]]);
    expect(Math.abs(far.light[0])).toBeLessThanOrEqual(3);
  });
});

describe('the phone', () => {
  it('reads tipping right and towards you in the screen’s frame, whichever way it is held', () => {
    // Portrait: gamma is right, beta is down.
    expect(screenTip(50, 10, [45, 0], 0)).toEqual([10, 5]);
    // Turned a quarter: the device's front-back axis is now the screen's left-right.
    expect(screenTip(50, 10, [45, 0], 90)).toEqual([5, -10]);
    expect(screenTip(50, 10, [45, 0], 180)).toEqual([-10, -5]);
    expect(screenTip(50, 10, [45, 0], 270)).toEqual([-5, 10]);
    expect(screenTip(50, 10, [45, 0], -90)).toEqual([-5, 10]);
  });

  it('works like the pointer: tip right and the card turns right', () => {
    expect(phoneTilt([10, 0]).tilt[0]).toBeGreaterThan(0);
    expect(phoneTilt([0, 10]).tilt[1]).toBeLessThan(0);
    expect(phoneTilt([90, -90]).tilt).toEqual([MAX_TILT[0], MAX_TILT[1]]);
  });

  it('settles on however the phone is held', () => {
    let rest: [number, number] = [0, 0];
    for (let i = 0; i < 2000; i++) rest = settle(rest, 60, -8);
    expect(rest[0]).toBeCloseTo(60);
    expect(rest[1]).toBeCloseTo(-8);
  });
});

describe('motion', () => {
  it('sways gently while idle, within the limits', () => {
    for (let t = 0; t < 30; t += 0.25) {
      const { tilt } = idleTilt(t);
      expect(Math.abs(tilt[0])).toBeLessThan(MAX_TILT[0]);
      expect(Math.abs(tilt[1])).toBeLessThan(MAX_TILT[1]);
    }
  });

  it('eases towards its target at the same speed at any frame rate', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = approach(a, 1, 1 / 60, 8);
    let b = 0;
    for (let i = 0; i < 30; i++) b = approach(b, 1, 1 / 30, 8);
    expect(a).toBeCloseTo(b, 6);
  });

  it('flips over in FLIP_SECONDS, eased at both ends, and back', () => {
    let p = 0;
    let t = 0;
    while (p < 1) {
      p = stepFlip(p, 1, 1 / 60);
      t += 1 / 60;
    }
    expect(t).toBeCloseTo(FLIP_SECONDS, 1);
    expect(flipAngle(0)).toBe(0);
    expect(flipAngle(0.5)).toBeCloseTo(0.5);
    expect(flipAngle(1)).toBe(1);
    expect(flipAngle(0.05)).toBeLessThan(0.05);
    expect(stepFlip(1, 0, 0.3)).toBeCloseTo(1 - 0.3 / FLIP_SECONDS);
  });
});

describe('input', () => {
  it('ignores an empty orientation reading and takes the first grip as level', () => {
    expect(phoneReading(null, null, 4, 0)).toBeNull();
    const first = phoneReading(null, 50, 4, 0)!;
    expect(first.rest).toEqual([50, 4]);
    expect(first.target.tilt[0]).toBeCloseTo(0);
    const tipped = phoneReading(first.rest, 50, 20, 0)!;
    expect(tipped.target.tilt[0]).toBeGreaterThan(0);
  });

  it('flips on a bare f only, never while typing in the prompt', () => {
    const key = (k: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey', boolean>> = {}, field = false) => ({
      key: k,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      ...mods,
      target: { closest: () => (field ? {} : null) },
    });
    expect(isFlipKey(key('f'))).toBe(true);
    expect(isFlipKey(key('f', { metaKey: true }))).toBe(false);
    expect(isFlipKey(key('f', { ctrlKey: true }))).toBe(false);
    expect(isFlipKey(key('f', {}, true))).toBe(false);
    expect(isFlipKey(key('g'))).toBe(false);
    expect(isFlipKey({ ...key('f'), target: null })).toBe(true);
  });
});

describe('a frame', () => {
  const target = { tilt: [0.3, -0.2] as [number, number], light: [1, 0.5] as [number, number] };
  const start: CardState = { tilt: [0, 0], light: [0, 0], flip: 0 };

  it('eases towards the pointer while it moves', () => {
    const next = advance(start, { target, flipTarget: 0, now: 1, lastInput: 0.9 }, 1 / 60, false);
    expect(next.tilt[0]).toBeGreaterThan(0);
    expect(next.tilt[0]).toBeLessThan(0.3);
  });

  it('sways on its own once left alone, but not with reduced motion', () => {
    const idle = advance(start, { target, flipTarget: 0, now: 10, lastInput: 0 }, 1, false);
    const sway = idleTilt(10).tilt;
    expect(Math.sign(idle.tilt[0])).toBe(Math.sign(sway[0]));
    const still = advance(start, { target, flipTarget: 0, now: 10, lastInput: 0 }, 0.1, true);
    expect(still.tilt[0]).toBeCloseTo(0.3, 1);
  });

  it('turns over gradually, or at once with reduced motion', () => {
    expect(advance(start, { target, flipTarget: 1, now: 0, lastInput: 0 }, 0.1, false).flip).toBeCloseTo(
      0.1 / FLIP_SECONDS,
    );
    expect(advance(start, { target, flipTarget: 1, now: 0, lastInput: 0 }, 0.1, true).flip).toBe(1);
  });
});

describe('clicks on the card', () => {
  it('maps the canvas centre to the middle of the face, and points off the card to nothing', () => {
    expect(cardPoint([0, 0], [0, 0], 0)).toEqual({ front: true, u: 0.5, v: 0.5 });
    expect(cardPoint([1.1, 0], [0, 0], 0)).toBeNull();
  });

  it('reads the back the right way round once flipped', () => {
    const left = cardPoint([-0.5, -0.3], [0, 0], 1)!;
    expect(left.front).toBe(false);
    expect(left.u).toBeCloseTo(0.25);
    expect(left.v).toBeLessThan(0.5);
  });

  it('follows the tilt: a turned card puts the same screen point elsewhere on it', () => {
    const flat = cardPoint([0.8, 0], [0, 0], 0)!;
    const turned = cardPoint([0.8, 0], [MAX_TILT[0], 0], 0)!;
    expect(turned.u).toBeGreaterThan(flat.u);
  });
});
