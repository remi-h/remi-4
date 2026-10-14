/**
 * The boarding sequence on /.secret, in seconds after the visitor presses board. The
 * shaders read these through their uniforms, so this file is the single source of timing.
 */
export const T = {
  /** Each split-flap turn. */
  flip: 0.075,
  /** The flaps start turning back to the page. */
  back: 2.0,
  /** The plane starts rolling along the runway. */
  taxi: 3.0,
  /** Wheels up: the page tilts away and becomes the ground. */
  lift: 4.1,
  /** The plane is a speck at the horizon: the real sky starts to dissolve in under the takeoff shot. */
  handoff: 5.3,
  /** The plane has flown out of sight. */
  vanish: 6.5,
  /** The camera has caught up with the plane and slipped into the captain's seat (lib/flight/chase.ts). */
  introEnd: 13.3,
} as const;

/** Landing, in seconds after it starts: the cockpit fades out, then the board flips to LANDED and back to the page. */
export const LANDING = {
  fade: 0.5,
  /** The arrival board, timed from the end of the fade. */
  back: 1.7,
  end: 2.9,
} as const;

/** Flight time from the first frame of the view to landing, when nobody scrubs. */
export const CRUISE_SECONDS = 150;

/** How fast the clouds stream past, km per second (an airliner does 0.25; a little faster reads better). */
export const CLOUD_SPEED = 0.9;

/** Tokyo is 8170 km away along the great circle, roughly (the home page flies it the other way). */
export const DISTANCE_KM = 8170;

export type Scene = { scene: 'boarding' | 'flight'; intro: number; hud: boolean };

/** The departures board text, sized to how many 64px tiles fit across the screen. */
export function boardLines(cols: number): string[] {
  return cols >= 11 ? ['ARN → HND', 'BOARDING', 'GATE 0'] : ['ARN →', 'HND', 'BOARD'];
}

/** The arrival board's messages, sized to how many 64px tiles fit across. */
export function arrivalLines(cols: number): string[] {
  return cols >= 11 ? ['LANDED', 'TOKYO HND', 'おかえり'] : ['LANDED', 'HND', 'おかえり'];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Which shader draws at time `t`, and how far the porthole has opened. */
export function sceneAt(t: number): Scene {
  if (t < T.handoff) return { scene: 'boarding', intro: 0, hud: false };
  const intro = clamp01((t - T.handoff) / (T.introEnd - T.handoff));
  return { scene: 'flight', intro, hud: intro >= 1 };
}

/** The seatback readout for a point along the route (0 = Stockholm, 1 = Tokyo). */
export function readout(progress: number): { km: number; altitude: number; landed: boolean } {
  const p = clamp01(progress);
  // Climb over the first 6% and descend over the last 8%; cruise at 11 280 m in between.
  const climb = Math.min(1, p / 0.06, (1 - p) / 0.08);
  return {
    km: Math.round(DISTANCE_KM * (1 - p)),
    altitude: Math.round((11280 * climb) / 10) * 10,
    landed: p >= 1,
  };
}
