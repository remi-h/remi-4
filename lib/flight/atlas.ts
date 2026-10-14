/** The characters a split flap can show; index 0 is the blank flap. */
export const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789→·-おかえり';
/** Letters and digits only: what a flap shows while it is still spinning. */
export const SPIN_RANGE = [1, 36] as const;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 6;
const CELL = 128;

/** Index of each character of `line` on the flaps; unknown characters become blank. */
export function flapIndices(line: string): number[] {
  return [...line.toUpperCase()].map((ch) => Math.max(0, FLAP_CHARS.indexOf(ch)));
}

const isJapanese = (ch: string) => ch >= '\u3040' && ch <= '\u30ff';

/** The flap characters, white on transparent, in an 8 × 6 grid of 128px cells; kana in the pixel font. */
export function drawGlyphAtlas(fontFamily: string, japaneseFamily: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * CELL;
  canvas.height = ATLAS_ROWS * CELL;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...FLAP_CHARS].forEach((ch, i) => {
    const x = (i % ATLAS_COLS) * CELL + CELL / 2;
    const y = Math.floor(i / ATLAS_COLS) * CELL + CELL / 2;
    ctx.font = isJapanese(ch) ? `${CELL * 0.6}px ${japaneseFamily}` : `600 ${CELL * 0.62}px ${fontFamily}`;
    ctx.fillText(ch, x, y + CELL * 0.04);
  });
  return canvas;
}

/** The plane from the home page's flight log (nose to the right), large enough to fill a screen. */
export const PLANE_PATH =
  'M22 12c0-.8-.7-1.4-1.5-1.4H15L10 3H7.6l2.5 7.6H5.2L3.4 8H1.6l1.2 4-1.2 4h1.8l1.8-2.6h4.9L7.6 21H10l5-7.6h5.5c.8 0 1.5-.6 1.5-1.4z';

export function drawPlane(size = 1024): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(PLANE_PATH));
  return canvas;
}
