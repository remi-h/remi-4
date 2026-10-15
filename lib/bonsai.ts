/**
 * ~/.secret/bonsai.txt: a bonsai in terminal characters that grows a little every day from the day it
 * was planted, and changes with the seasons. Everyone sees the same tree on the same day: the whole
 * tree is grown once from a fixed seed, each piece stamped with when it grows, and a day shows the
 * pieces that have grown by then.
 */

/** The day it was planted (UTC). */
export const PLANTED = '2026-10-15';
const SEED = 0x6869_6775; // "higu"
const W = 48;
const H = 12;
const ROOT = 24;
/** Growth steps per day: the full tree takes a few months. */
const STEPS_PER_DAY = 0.25;
const DAY = 86400;

type Piece = { x: number; y: number; ch: string; t: number; leaf: boolean };
type Branch = { cells: Piece[] };

function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wood = (dx: number, dy: number) => (dy === 0 ? '_' : dx === 0 ? '|' : dx < 0 ? '\\' : '/');

/** A branch as it grows: where its tip is, when, which way it leans, and how long since it last forked. */
type Run = { x: number; y: number; t: number; side: number; sinceShoot: number; branch: Branch };

const outside = (x: number, y: number) => x < 1 || x >= W - 1 || y < 1;

/** Grows the tree from a seeded random sequence: the same sequence, so the same tree, every time. */
class Grower {
  readonly pieces: Piece[] = [];
  readonly branches: Branch[] = [];
  private readonly rng = random(SEED);

  /** A cluster of leaves around a point, appearing just after the wood beneath them. */
  leaves(x: number, y: number, t: number, size: number) {
    for (let k = 0; k < size; k++) {
      const lx = x + Math.round((this.rng() * 2 - 1) * 4);
      const ly = y + Math.round((this.rng() * 2 - 1) * 1.4);
      if (ly < 0 || ly > H - 2 || lx < 0 || lx >= W) continue;
      this.pieces.push({ x: lx, y: ly, ch: '&', t: t + 1 + Math.floor(this.rng() * 3), leaf: true });
    }
  }

  /** One step of a branch: the trunk climbs, leaning and twisting; a shoot reaches out, sometimes up. */
  private step(trunk: boolean, side: number): [number, number] {
    if (trunk) return [[-1, -1, 0, 1, 1][Math.floor(this.rng() * 5)], -1];
    const dx = this.rng() < 0.1 ? 0 : side;
    return [dx, dx === 0 || this.rng() < 0.22 ? -1 : 0];
  }

  /** A trunk or shoot of `life` steps from (x, y), sprouting shoots of its own, leaves at its end. */
  grow(x: number, y: number, firstSide: number, life: number, t: number, trunk: boolean) {
    const run: Run = { x, y, t, side: firstSide || this.coin(), sinceShoot: 0, branch: { cells: [] } };
    this.branches.push(run.branch);
    for (let left = life; left > 0 && this.advance(run, trunk); left--) this.sprout(run, trunk, life, left);
    this.leaves(run.x, run.y, run.t, trunk ? 26 : 16);
  }

  private coin() {
    return this.rng() < 0.5 ? -1 : 1;
  }

  /** Takes one step; false once the branch would leave the picture. */
  private advance(run: Run, trunk: boolean): boolean {
    run.t++;
    const [dx, dy] = this.step(trunk, run.side);
    run.x += dx;
    run.y += dy;
    if (outside(run.x, run.y)) return false;
    const cell = { x: run.x, y: run.y, ch: wood(dx, dy), t: run.t, leaf: false };
    this.pieces.push(cell);
    run.branch.cells.push(cell);
    run.sinceShoot++;
    return true;
  }

  /** The trunk puts out shoots to alternate sides as it climbs; a long shoot puts out one twig halfway. */
  private sprout(run: Run, trunk: boolean, life: number, left: number) {
    if (trunk) {
      if (run.sinceShoot < 2 || run.y >= H - 3) return;
      run.sinceShoot = 0;
      run.side = -run.side;
      this.grow(run.x, run.y, run.side, 7 + Math.floor(this.rng() * 6), run.t, false);
    } else if (life > 5 && left === Math.ceil(life / 2)) this.twig(run.x, run.y, run.t, run.side);
  }

  /** Halfway along a long shoot: a short twig to one side, and a tuft of leaves. */
  private twig(x: number, y: number, t: number, side: number) {
    this.grow(x, y, this.rng() < 0.5 ? side : -side, 4, t, false);
    this.leaves(x, y - 1, t, 10);
  }
}

/** The whole grown tree: trunk, shoots and twigs, each ending in a cluster of leaves. */
function growTree(): { pieces: Piece[]; branches: Branch[] } {
  const grower = new Grower();
  grower.pieces.push({ x: ROOT, y: H - 1, ch: '|', t: 0, leaf: false });
  grower.grow(ROOT, H - 1, 0, 9, 0, true);
  return grower;
}

const TREE = growTree();

type Season = 'spring' | 'summer' | 'autumn' | 'winter';
const seasonOf = (date: Date): Season =>
  (
    [
      'winter',
      'winter',
      'spring',
      'spring',
      'spring',
      'summer',
      'summer',
      'summer',
      'autumn',
      'autumn',
      'autumn',
      'winter',
    ] as const
  )[date.getUTCMonth()];

/** Days since planting, from a time in seconds. */
export const dayOf = (now: number) => Math.max(0, Math.floor((now - Date.parse(PLANTED) / 1000) / DAY));

/** What a leaf looks like this season; null when the tree is bare. */
function leafFor(season: Season, x: number, y: number): string | null {
  if (season === 'winter') return null;
  if (season === 'spring') return (x + y) % 3 === 0 ? '@' : '&';
  if (season === 'autumn') return (x * 7 + y) % 4 === 0 ? '&' : '%';
  return '&';
}

/** A shallow tray with soil heaped in it and two feet, centred under the trunk. */
const POT = [
  ' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '[_____________________________]',
  ' \\___________________________/',
  "  '-'                     '-'",
];
const POT_CENTRE = 15;

type Canvas = { grid: string[][]; put: (x: number, y: number, ch: string, over?: boolean) => void };

function canvas(): Canvas {
  const grid: string[][] = Array.from({ length: H }, () => Array<string>(W).fill(' '));
  const put = (x: number, y: number, ch: string, over = false) => {
    if (y >= 0 && y < H && x >= 0 && x < W && (over || grid[y][x] === ' ')) grid[y][x] = ch;
  };
  return { grid, put };
}

/** The wood grown by `age`, then its leaves in this season's colours (wood first, so leaves never cover it). */
function drawTree({ put }: Canvas, age: number, season: Season) {
  for (const p of TREE.pieces) if (!p.leaf && p.t <= age) put(p.x, p.y, p.ch, true);
  for (const p of TREE.pieces) {
    const ch = p.leaf && p.t <= age ? leafFor(season, p.x, p.y) : null;
    if (ch) put(p.x, p.y, ch);
  }
}

/** A branch still growing carries two fresh leaves at its tip (not in winter). */
function drawTips({ put }: Canvas, age: number) {
  for (const branch of TREE.branches) {
    const grown = branch.cells.filter((c) => c.t <= age);
    const tip = grown[grown.length - 1];
    if (!tip || grown.length === branch.cells.length) continue;
    put(tip.x - 1, tip.y - 1, '&');
    put(tip.x + 1, tip.y - 1, '&');
  }
}

/** Winter: snow settles on the branches. Autumn: a few leaves have fallen on the soil. */
function drawWeather({ put }: Canvas, age: number, season: Season, day: number) {
  if (season === 'winter') {
    for (const p of TREE.pieces) if (!p.leaf && p.t <= age && (p.x + day) % 3 === 0) put(p.x, p.y - 1, '.');
  } else if (season === 'autumn') {
    [-9, -4, 5, 10].forEach((dx, i) => (day + i) % 2 === 0 && put(ROOT + dx, H - 1, '%'));
  }
}

/** The bonsai as it looks at `now` (seconds): the tree, its pot and a caption. */
export function bonsai(now: number): string {
  const day = dayOf(now);
  const age = 1 + day * STEPS_PER_DAY;
  const season = seasonOf(new Date(now * 1000));
  const picture = canvas();
  drawTree(picture, age, season);
  if (season !== 'winter') drawTips(picture, age);
  drawWeather(picture, age, season, day);

  const offset = ' '.repeat(ROOT - POT_CENTRE);
  const rows = picture.grid.map((row) => row.join('').trimEnd());
  const first = rows.findIndex((row) => row.length > 0);
  const caption = `day ${day} · ${season} · planted ${PLANTED} · it grows a little every day`;
  return [...rows.slice(first), ...POT.map((line) => offset + line), '', caption, ''].join('\n');
}

/** The start of the day `now` falls in: bonsai.txt last changed then. */
export const bonsaiMtime = (now: number) => now - (now % DAY);
