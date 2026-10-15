import { FUJI_AHEAD, FUJI_SIDE, SHADOW_STEP, terrainShift } from './terrain-shift';

describe('the ground under the plane', () => {
  it('scrolls by the distance flown, the same way as the clouds (+Z)', () => {
    expect(terrainShift({ shadowTravel: 0 }, 12.5, 0).uniforms.offset).toEqual([0, 12.5]);
  });

  it('re-renders the sun shadows every few hundred metres and offsets lookups in between', () => {
    const near = terrainShift({ shadowTravel: 10 }, 10 + SHADOW_STEP / 2, 0);
    expect(near.rebakeShadows).toBe(false);
    expect(near.uniforms.shadowDelta[1]).toBeCloseTo(SHADOW_STEP / 2);
    const far = terrainShift({ shadowTravel: 10 }, 10 + SHADOW_STEP * 1.5, 0);
    expect(far.rebakeShadows).toBe(true);
    expect(far.state.shadowTravel).toBe(10 + SHADOW_STEP * 1.5);
    expect(far.uniforms.shadowDelta[1]).toBe(0);
  });

  it('keeps Fuji out of sight until Japan, then places it ahead and flies towards it', () => {
    expect(terrainShift({ shadowTravel: 0 }, 100, 0).uniforms.fujiCenter[1]).toBeGreaterThan(500);
    const first = terrainShift({ shadowTravel: 100 }, 100, 1);
    expect(first.uniforms.fujiCenter).toEqual([FUJI_SIDE, FUJI_AHEAD]);
    const later = terrainShift(first.state, 120, 1);
    expect(later.uniforms.fujiCenter[1]).toBeCloseTo(FUJI_AHEAD - 20);
  });

  it('forgets Fuji when scrubbing back before Japan', () => {
    const there = terrainShift({ shadowTravel: 0 }, 50, 1).state;
    expect(terrainShift(there, 60, 0).state.fujiAt).toBeUndefined();
  });
});
