import { holeAt, lastFall, RELEASE, SPIT_SECONDS, spitTime, SWALLOW_SECONDS } from './timeline';

describe('the black hole', () => {
  it('starts as nothing at all, so its first frame is the page itself', () => {
    const start = holeAt(0);
    expect(start.mass).toBe(0);
    expect(start.strength).toBe(0);
    expect(start.flash).toBeLessThan(1e-6);
  });

  it('forms before anything lets go, then keeps growing as it feeds', () => {
    expect(holeAt(RELEASE.start).mass).toBeGreaterThan(0.9);
    let last = 0;
    for (let t = 0; t <= SWALLOW_SECONDS; t += 0.05) {
      const { mass } = holeAt(t);
      expect(mass).toBeGreaterThanOrEqual(last - 1e-9);
      last = mass;
    }
    expect(holeAt(SWALLOW_SECONDS).feed).toBeGreaterThan(holeAt(1).feed);
  });

  it('flares once the last tile has fallen in, before the swallow ends', () => {
    const peak = Array.from({ length: 800 }, (_, i) => (i / 800) * SWALLOW_SECONDS).reduce((best, t) =>
      holeAt(t).flash > holeAt(best).flash ? t : best,
    );
    expect(peak).toBeGreaterThan(lastFall());
    expect(peak).toBeLessThan(SWALLOW_SECONDS);
    expect(holeAt(peak).flash).toBeCloseTo(1, 2);
  });

  it('gives the page back by running its clock backwards, faster', () => {
    expect(spitTime(0)).toBe(SWALLOW_SECONDS);
    expect(spitTime(SPIT_SECONDS)).toBe(0);
    expect(spitTime(SPIT_SECONDS * 2)).toBe(0);
    expect(SPIT_SECONDS).toBeLessThan(SWALLOW_SECONDS);
  });
});
