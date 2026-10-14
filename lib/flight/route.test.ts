import { MOON, routePosition, routeSky, track } from './route';

describe('track', () => {
  it('holds the ends and passes through every key', () => {
    const keys = [
      [0, 1],
      [0.5, 3],
      [1, 2],
    ] as const;
    expect(track(keys, -1)).toBe(1);
    expect(track(keys, 0.5)).toBe(3);
    expect(track(keys, 2)).toBe(2);
    expect(track(keys, 0.25)).toBe(2);
  });
});

describe('the sky along the route', () => {
  it('is dusk at Stockholm, moonlit at night, and morning over Japan', () => {
    expect(routeSky(0).atmosphere.sunElevation).toBeLessThan(0);
    expect(routeSky(0.4).illuminance).toBe(1);
    expect(routeSky(0.4).atmosphere.sunElevation).toBeGreaterThan(0); // the moon, standing in for the sun
    expect(routeSky(1).atmosphere.sunElevation).toBeGreaterThan(10);
    expect(routeSky(1).night).toBe(0);
  });

  it('swaps the sun for the moon while the moon is dark, so nothing jumps', () => {
    expect(routeSky(MOON.from + 1e-4).illuminance).toBeLessThan(0.01);
    expect(routeSky(MOON.to - 1e-4).illuminance).toBeLessThan(0.01);
  });

  it('keeps the stars at the same display brightness across the exposure jump', () => {
    const display = (p: number) => routeSky(p).stars * 2 ** routeSky(p).atmosphere.exposureEv;
    expect(display(MOON.from - 1e-4)).toBeCloseTo(display(MOON.from + 1e-4), 2);
  });

  it('shows the aurora only over the Arctic and Fuji only at the end', () => {
    expect(routeSky(0.05).aurora).toBe(0);
    expect(routeSky(0.35).aurora).toBeGreaterThan(0);
    expect(routeSky(0.9).aurora).toBe(0);
    expect(routeSky(0.5).fuji).toBe(0);
    expect(routeSky(0.95).fuji).toBe(1);
  });
});

describe('the great circle', () => {
  it('starts at Arlanda heading north-east and ends at Haneda heading south-east', () => {
    const start = routePosition(0);
    const end = routePosition(1);
    expect(start.lat).toBeCloseTo(59.65, 1);
    expect(start.lon).toBeCloseTo(17.92, 1);
    expect(end.lat).toBeCloseTo(35.55, 1);
    expect(end.lon).toBeCloseTo(139.78, 1);
    expect(start.heading).toBeGreaterThan(30);
    expect(start.heading).toBeLessThan(60);
    expect(end.heading).toBeGreaterThan(130);
    expect(end.heading).toBeLessThan(170);
  });

  it('crosses the Arctic: the highest point is well north of both ends', () => {
    const maxLat = Math.max(...Array.from({ length: 11 }, (_, i) => routePosition(i / 10).lat));
    expect(maxLat).toBeGreaterThan(65);
  });
});
