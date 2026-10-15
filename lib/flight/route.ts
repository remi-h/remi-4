import type { AtmosphereState } from './atmosphere/tuning';

/**
 * Stockholm → Tokyo as the sky sees it, from the pilot's seat facing east (+Z). Progress 0 is just
 * after takeoff from Arlanda at dusk, 1 is the approach into Haneda in the morning.
 *
 * The atmosphere has one light. By day and at twilight it is the sun; in the middle of the night it is
 * the moon, swapped in while both are too faint to see. Exposure follows the light, and everything we
 * add on top (stars, aurora, city lights) is specified in display brightness and divided by the
 * exposure, so it stays steady when the exposure jumps at the swap.
 */

export interface RouteSky {
  atmosphere: Omit<AtmosphereState, 'yaw' | 'pitch' | 'time'>;
  /** The light source's illuminance (the moon is the sun, much dimmer). */
  illuminance: number;
  stars: number;
  aurora: number;
  city: number;
  urban: number;
  fuji: number;
  /** 0..1 dark adaptation for the cockpit pass. */
  night: number;
}

export type Key = readonly [progress: number, value: number];

/** Piecewise smooth interpolation through keyframes. */
export function track(keys: readonly Key[], p: number): number {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, v1] = keys[i];
    if (p <= p1) {
      const [p0, v0] = keys[i - 1];
      const t = (p - p0) / (p1 - p0);
      return v0 + (v1 - v0) * t * t * (3 - 2 * t);
    }
  }
  return keys[keys.length - 1][1];
}

/** The moon lights the night between these two points of the route. */
export const MOON = { from: 0.14, to: 0.64 } as const;

const SUN_ELEVATION: Key[] = [
  [0, -1],
  [0.08, -6],
  [MOON.from, -11],
  [MOON.to, -10],
  [0.8, 0],
  [0.9, 6],
  [1, 14],
];
const SUN_AZIMUTH: Key[] = [
  [0, 205],
  [MOON.from, 215],
  [MOON.to, 30],
  [1, 18],
];
const EXPOSURE_DAY: Key[] = [
  [0, 4.6],
  [0.08, 7],
  [MOON.from, 8.5],
  [MOON.to, 8.5],
  [0.74, 6.5],
  [0.8, 4.4],
  [0.9, 3.4],
  [1, 3.2],
];
const MOON_ELEVATION = 24;
const MOON_AZIMUTH = -32;
const NIGHT_EXPOSURE = -3;
const COVERAGE: Key[] = [
  [0, 0.42],
  [0.2, 0.62],
  [0.6, 0.58],
  [0.85, 0.5],
  [0.95, 0.28],
  [1, 0.22],
];
/** Display brightness of what we add, before dividing by the exposure. */
const STARS: Key[] = [
  [0, 0],
  [0.06, 0],
  [MOON.from, 1],
  [0.7, 1],
  [0.78, 0],
];
const AURORA: Key[] = [
  [0.18, 0],
  [0.26, 1],
  [0.44, 1],
  [0.54, 0],
];
const CITY: Key[] = [
  [0, 0.5],
  [0.05, 1],
  [0.8, 1],
  [0.86, 0.4],
  [0.92, 0],
];
const URBAN: Key[] = [
  [0, 1],
  [0.08, 0.15],
  [0.86, 0.15],
  [0.95, 1],
];
const NIGHT: Key[] = [
  [0, 0.1],
  [0.1, 0.5],
  [MOON.from + 0.02, 1],
  [0.66, 1],
  [0.8, 0.2],
  [0.9, 0],
];

export function routeSky(progress: number): RouteSky {
  const p = Math.min(1, Math.max(0, progress));
  const moonlit = p > MOON.from && p < MOON.to;
  // The moon fades in after the swap and out before it, so the swap itself happens in the dark.
  const moonFade = Math.min(1, (p - MOON.from) / 0.05, (MOON.to - p) / 0.04);
  const ev = moonlit ? NIGHT_EXPOSURE : track(EXPOSURE_DAY, p);
  const exposure = 2 ** ev;
  return {
    atmosphere: {
      sunElevation: moonlit ? MOON_ELEVATION : track(SUN_ELEVATION, p),
      sunAzimuth: moonlit ? MOON_AZIMUTH : track(SUN_AZIMUTH, p),
      altitudeKm: 10.6,
      exposureEv: ev,
      haze: 1.6,
      cloudCoverage: track(COVERAGE, p),
      cloudDetail: 1,
      cloudType: 0.1,
      cloudSeed: 4,
      cloudShadows: true,
      tonemap: 'agx',
    },
    illuminance: moonlit ? Math.max(0, moonFade) : 1,
    stars: (track(STARS, p) * 6) / exposure,
    aurora: (track(AURORA, p) * 1.4) / exposure,
    city: (track(CITY, p) * 1.2) / exposure,
    urban: track(URBAN, p),
    fuji: p > 0.8 ? 1 : 0,
    night: track(NIGHT, p),
  };
}

const ARN = [59.6519, 17.9186] as const;
const HND = [35.5494, 139.7798] as const;
const RAD = Math.PI / 180;

function toVector([lat, lon]: readonly [number, number]): [number, number, number] {
  return [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
}

/**
 * Where the plane is along the great circle from Arlanda to Haneda (latitude and longitude in degrees) and
 * its true heading there. The real routes bend around closed airspace; the readout follows the great circle.
 */
export function routePosition(progress: number): { lat: number; lon: number; heading: number } {
  const p = Math.min(1, Math.max(0, progress));
  const a = toVector(ARN);
  const b = toVector(HND);
  const omega = Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  const at = (t: number) => {
    const s = Math.sin(omega);
    const wa = Math.sin((1 - t) * omega) / s;
    const wb = Math.sin(t * omega) / s;
    const v = [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
    return [Math.asin(v[2]) / RAD, Math.atan2(v[1], v[0]) / RAD] as const;
  };
  const [lat, lon] = at(p);
  // Initial bearing from here towards a point a little further along.
  const [lat2, lon2] = at(Math.min(1, p + 0.001));
  const dLon = (lon2 - lon) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * RAD);
  const x = Math.cos(lat * RAD) * Math.sin(lat2 * RAD) - Math.sin(lat * RAD) * Math.cos(lat2 * RAD) * Math.cos(dLon);
  const heading = p >= 1 ? routePosition(0.999).heading : (Math.atan2(y, x) / RAD + 360) % 360;
  return { lat, lon, heading };
}
