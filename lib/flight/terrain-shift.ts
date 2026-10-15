/** The sun's shadow maps are re-rendered every this many km of flight. */
export const SHADOW_STEP = 0.75;
/** Fuji first appears this far ahead (km), a little left of the track (negative X is the left window). */
export const FUJI_AHEAD = 60;
export const FUJI_SIDE = -16;

export interface TerrainState {
  /** Distance flown (km) when the sun's shadow maps were last rendered. */
  shadowTravel: number;
  /** Where Fuji stands along the route (km of travel) once it is in range. */
  fujiAt?: number;
}

/**
 * Where the ground is as the plane flies: the scroll offset, Fuji's camera-relative centre, the flight since
 * the shadow maps were rendered, and whether they need rendering again this frame. Pure, so it is unit-tested;
 * the renderer only applies it.
 */
export function terrainShift(previous: TerrainState, travel: number, fuji: number) {
  const rebakeShadows = Math.abs(travel - previous.shadowTravel) > SHADOW_STEP;
  const shadowTravel = rebakeShadows ? travel : previous.shadowTravel;
  const fujiAt = fuji === 0 ? undefined : (previous.fujiAt ?? travel + FUJI_AHEAD);
  return {
    state: { shadowTravel, fujiAt } satisfies TerrainState,
    rebakeShadows,
    uniforms: {
      offset: [0, travel] as const,
      fujiCenter: [FUJI_SIDE, fujiAt === undefined ? 1000 : fujiAt - travel] as const,
      shadowDelta: [0, travel - shadowTravel] as const,
      fuji,
      pad: 0,
    },
  };
}
