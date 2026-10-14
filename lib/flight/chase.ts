/**
 * The camera catching up with the plane, in the plane's frame (metres, nose along +Z, +Y up, +X to
 * starboard). From a speck 1.5 km ahead it closes to a three-quarter view of the whole aircraft, runs
 * along the port side past the cabin windows to the nose, and slips in through the captain's side window
 * to the seat, always facing forward, so the cockpit view simply takes over.
 */

type Vec3 = [number, number, number];

const KEYS: readonly { at: number; pos: Vec3 }[] = [
  { at: 0, pos: [-60, 34, -1500] },
  { at: 0.4, pos: [-38, 10, -78] },
  { at: 0.68, pos: [-13, 2.6, -6] },
  { at: 0.86, pos: [-4.4, 1.0, 13.4] },
  { at: 1, pos: [-0.55, 0.85, 15.6] },
];

/** The captain's eye point; the cockpit view starts here. */
export const COCKPIT_EYE: Vec3 = [...KEYS[KEYS.length - 1].pos];

/** Where the plane sits on screen when the chase starts, as a yaw bias (degrees): matches the takeoff speck. */
const START_BIAS = -9;
const DEG = Math.PI / 180;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Monotone cubic (Fritsch–Carlson) through the keys, per coordinate: smooth, and never overshooting a key,
 * so the camera only ever closes in. (Catmull-Rom overshoots here: the first stretch is 1.5 km, the rest metres.)
 */
function along(s: number): Vec3 {
  const t = Math.min(1, Math.max(0, s));
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].at) i++;
  const h = KEYS[i + 1].at - KEYS[i].at;
  const u = (t - KEYS[i].at) / h;
  return [0, 1, 2].map((k) => {
    const slope = (j: number) => (KEYS[j + 1].pos[k] - KEYS[j].pos[k]) / (KEYS[j + 1].at - KEYS[j].at);
    const tangent = (j: number) => {
      if (j === 0) return slope(0);
      if (j === KEYS.length - 1) return slope(j - 1);
      const a = slope(j - 1);
      const b = slope(j);
      return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
    };
    const p0 = KEYS[i].pos[k];
    const p1 = KEYS[i + 1].pos[k];
    const m0 = tangent(i) * h;
    const m1 = tangent(i + 1) * h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
  }) as Vec3;
}

export interface ChaseView {
  /** Camera position in the plane's frame, metres. */
  position: Vec3;
  /** View direction as yaw (degrees, 0 = +Z, positive towards +X) and pitch (degrees, up positive). */
  yaw: number;
  pitch: number;
  /** 0..1 the plane's opacity: gone before the camera passes through its skin. */
  visible: number;
  /** 0..1 how far inside the cockpit you are: the frame and glass close in. */
  inside: number;
}

/** The chase at `s` in [0, 1]; `basePitch` is the cockpit view's pitch it settles on. */
export function chase(s: number, basePitch: number): ChaseView {
  const position = along(s);
  // Look at the plane, then at a point ahead of its nose as you run along it, then straight ahead.
  const target: Vec3 = [0, 0.5, lerp(0, 60, smooth(0.3, 0.7, s))];
  const toTarget: Vec3 = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
  const len = Math.hypot(...toTarget) || 1;
  const forward: Vec3 = [0, Math.sin(basePitch * DEG), Math.cos(basePitch * DEG)];
  const w = smooth(0.8, 1, s);
  const dir = [0, 1, 2].map((k) => lerp(toTarget[k] / len, forward[k], w));
  const n = Math.hypot(...dir) || 1;
  const yaw = Math.atan2(dir[0], dir[2]) / DEG + START_BIAS * (1 - smooth(0, 0.3, s));
  const pitch = Math.asin(Math.max(-1, Math.min(1, dir[1] / n))) / DEG;
  return { position, yaw, pitch, visible: 1 - smooth(0.86, 0.925, s), inside: smooth(0.86, 0.98, s) };
}
