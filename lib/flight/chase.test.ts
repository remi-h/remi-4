import { chase, COCKPIT_EYE } from './chase';

describe('the chase into the cockpit', () => {
  it('starts far behind the plane and ends at the captain’s eye, facing forward', () => {
    const start = chase(0, -2);
    expect(start.position[2]).toBeLessThan(-1000);
    expect(start.visible).toBe(1);
    expect(start.inside).toBe(0);
    const end = chase(1, -2);
    end.position.forEach((v, k) => expect(v).toBeCloseTo(COCKPIT_EYE[k], 6));
    expect(end.yaw).toBeCloseTo(0);
    expect(end.pitch).toBeCloseTo(-2);
    expect(end.visible).toBe(0);
    expect(end.inside).toBe(1);
  });

  it('only ever closes in: the distance to the nose shrinks all the way', () => {
    let last = Infinity;
    for (let s = 0; s <= 1.0001; s += 0.02) {
      const [x, y, z] = chase(s, -2).position;
      const d = Math.hypot(x, y, z - 18);
      expect(d).toBeLessThanOrEqual(last + 1e-6);
      last = d;
    }
  });

  it('hides the plane before the camera reaches its skin (fuselage radius about 2 m)', () => {
    for (let s = 0; s <= 1.0001; s += 0.005) {
      const v = chase(s, -2);
      if (Math.hypot(v.position[0], v.position[1]) < 2.1 && v.position[2] > -19 && v.position[2] < 18.5) {
        expect(v.visible).toBeLessThan(0.05);
      }
    }
  });

  it('keeps the plane in view: the whole aircraft while far, then its nose ahead', () => {
    const offAxis = (s: number, target: [number, number]) => {
      const v = chase(s, -2);
      return Math.abs(Math.atan2(target[0] - v.position[0], target[1] - v.position[2]) * (180 / Math.PI) - v.yaw);
    };
    for (let s = 0; s <= 0.4; s += 0.05) expect(offAxis(s, [0, 0])).toBeLessThan(30);
    for (let s = 0.5; s <= 0.86; s += 0.04) expect(offAxis(s, [0, 18])).toBeLessThan(40);
  });
});
