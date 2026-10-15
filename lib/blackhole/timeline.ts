/**
 * The black hole that drinks the site after `rm -rf` (lib/collapse.ts), in seconds. It forms in the
 * middle of the page; the page cracks into tiles from the middle out, and they fall in along tightening
 * orbits (debris.wgsl) while the disk brightens with what it is fed; when the last tile is gone it flares.
 * Giving the page back runs the same clock backwards, faster: the debris flies out of the disk and
 * settles into place, and the hole shrinks to nothing.
 */

export const SWALLOW_SECONDS = 7.6;
export const SPIT_SECONDS = 3.2;

/** When tiles let go (from the middle out) and how long they take to fall: shared with the shaders. */
export const RELEASE = { start: 1.1, spread: 3.2, jitter: 0.5, fallMin: 1.3, fallSpread: 0.9 } as const;

const FORM_SECONDS = 1.5;
const FLASH_AT = 7.15;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export type Hole = {
  /** The horizon's radius in world units: 0 before it forms, 1 when grown, a little more as it feeds. */
  mass: number;
  /** How brightly the disk burns. */
  feed: number;
  /** 0..1: the flare once the last tile is gone. */
  flash: number;
  /** 0..1: how much of the cinematic look (bloom, vignette, fringe) is on; none while it is still the page. */
  strength: number;
};

/** The hole at `t` seconds into the swallow. */
export function holeAt(t: number): Hole {
  const formed = 1 - Math.pow(1 - clamp01(t / FORM_SECONDS), 3);
  return {
    mass: formed * (1 + 0.3 * smooth(FORM_SECONDS, 6.8, t)),
    feed: 0.5 + 1.6 * smooth(1.2, 6.9, t),
    flash: Math.exp(-(((t - FLASH_AT) / 0.16) ** 2)),
    strength: smooth(0, 1.2, t),
  };
}

/** The last moment a tile can still be falling. */
export const lastFall = () => RELEASE.start + RELEASE.spread + RELEASE.jitter + RELEASE.fallMin + RELEASE.fallSpread;

/** The swallow's clock while giving the page back: from the end back to 0. */
export const spitTime = (seconds: number) => SWALLOW_SECONDS * Math.max(0, 1 - seconds / SPIT_SECONDS);
