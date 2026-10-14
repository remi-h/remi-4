import { flapIndices, FLAP_CHARS, SPIN_RANGE } from './atlas';
import { arrivalLines, boardLines, LANDING, readout, sceneAt, T } from './timeline';

describe('the boarding sequence', () => {
  it('runs in order and leaves time for the flaps to turn back before the plane rolls', () => {
    const order = [T.back, T.taxi, T.lift, T.handoff, T.vanish, T.introEnd];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The slowest tile starts turning back at back + 0.66 s (0.6 × the 1.1 s max delay) and takes 1.6 flips.
    expect(T.back + 0.66 + T.flip * 1.6).toBeLessThan(T.taxi);
  });

  it('draws the takeoff until the plane nears the horizon, then dissolves into the cockpit', () => {
    expect(sceneAt(0)).toEqual({ scene: 'boarding', intro: 0, hud: false });
    expect(sceneAt(T.handoff - 0.01).scene).toBe('boarding');
    expect(sceneAt(T.handoff).intro).toBe(0);
    const halfway = sceneAt((T.handoff + T.introEnd) / 2);
    expect(halfway.scene).toBe('flight');
    expect(halfway.intro).toBeCloseTo(0.5);
    expect(halfway.hud).toBe(false);
    expect(sceneAt(T.introEnd)).toEqual({ scene: 'flight', intro: 1, hud: true });
  });

  it('lands the board back on the page before the arrival ends', () => {
    expect(LANDING.back + 0.66 + T.flip * 1.6).toBeLessThan(LANDING.end);
  });
});

describe('the boards', () => {
  it('fit the screen: wide lines from 11 tiles across, short ones on phones', () => {
    for (const lines of [boardLines(20), arrivalLines(20)])
      expect(Math.max(...lines.map((l) => [...l].length))).toBeLessThanOrEqual(11);
    for (const lines of [boardLines(5), arrivalLines(5)])
      expect(Math.max(...lines.map((l) => [...l].length))).toBeLessThanOrEqual(6);
  });

  it('only use characters the flaps have', () => {
    for (const line of [...boardLines(20), ...boardLines(5), ...arrivalLines(20), ...arrivalLines(5)]) {
      for (const ch of line) expect(FLAP_CHARS).toContain(ch.toUpperCase());
    }
  });

  it('map text to flap indices, blank for anything unknown', () => {
    expect(flapIndices('ARN → HND')).toEqual([1, 18, 14, 0, 37, 0, 8, 14, 4]);
    expect(flapIndices('おかえり').every((i) => i > 39)).toBe(true);
    expect(flapIndices('?')).toEqual([0]);
    expect(SPIN_RANGE).toEqual([1, 36]);
  });
});

describe('the seatback readout', () => {
  it('counts down the distance and climbs to cruise', () => {
    expect(readout(0)).toEqual({ km: 8170, altitude: 0, landed: false });
    expect(readout(0.5)).toEqual({ km: 4085, altitude: 11280, landed: false });
    expect(readout(1)).toEqual({ km: 0, altitude: 0, landed: true });
  });
});
