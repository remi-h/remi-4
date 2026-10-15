import { ABOUT } from '@/lib/shell';
import { CARD_ASPECT } from './motion';

/** One face of the card in pixels; the texture holds the front above the back. */
const FACE: readonly [number, number] = [1600, Math.round(1600 / CARD_ASPECT)];

/** The links printed on the back; the page lists the same ones as real links. */
export const CARD_LINKS = [
  { label: 'github', href: 'https://github.com/remi-h' },
  { label: 'linkedin', href: 'https://linkedin.com/in/hremi' },
  { label: 'instagram', href: 'https://instagram.com/remihiguchi' },
] as const;

type Fonts = { mono: string; sans: string; jp: string };
type Layer = 'print' | 'cyan' | 'foil' | 'hot';
const LAYERS: readonly Layer[] = ['print', 'cyan', 'foil', 'hot'];
type Draw = Record<Layer, CanvasRenderingContext2D>;

const [W, H] = FACE;
const M = 96;

/** The links on the back: rows of `label   url` in mono, the url underlined in foil. */
const LINKS = { size: 44, top: 380, step: 96, pad: 11 } as const;
/** JetBrains Mono's advance is 0.6 em, so a row's width is known without measuring. */
const MONO_ADVANCE = 0.6;
const shortUrl = (href: string) => href.replace('https://', '');

/**
 * The link printed at a point on the back, given as fractions of the face (0..1, y down), or null.
 * The url and its label are both targets, with a little slack around the row.
 */
export function linkAt(u: number, v: number): string | null {
  const [x, y] = [u * W, v * H];
  const link = CARD_LINKS.find((entry, i) => {
    const baseline = LINKS.top + i * LINKS.step;
    const right = M + (LINKS.pad + shortUrl(entry.href).length) * LINKS.size * MONO_ADVANCE;
    return x >= M - 12 && x <= right + 12 && y >= baseline - LINKS.size - 4 && y <= baseline + 22;
  });
  return link?.href ?? null;
}

/** The page's fonts as next/font names them on <body>. */
function pageFonts(): Fonts {
  const body = getComputedStyle(document.body);
  const font = (name: string, fallback: string) => body.getPropertyValue(name).trim() || fallback;
  return {
    mono: font('--font-jetbrains-mono', 'monospace'),
    sans: font('--font-familjen-grotesk', 'sans-serif'),
    jp: font('--font-dotgothic16', 'sans-serif'),
  };
}

/** Faint foil lines every 80px (the page's 64px grid, at card scale) and a foil border. */
function grid(foil: CanvasRenderingContext2D) {
  foil.fillStyle = 'rgba(255,255,255,0.28)';
  for (let x = 80; x < W; x += 80) foil.fillRect(x - 1, 0, 2, H);
  for (let y = 80; y < H; y += 80) foil.fillRect(0, y - 1, W, 2);
  foil.strokeStyle = '#fff';
  foil.lineWidth = 3;
  foil.strokeRect(40, 40, W - 80, H - 80);
}

/** The 樋口 seal as in the header: hot fill, the name cut out of it. */
function seal(hot: CanvasRenderingContext2D, fonts: Fonts, x: number, y: number, size: number) {
  hot.fillStyle = '#fff';
  hot.fillRect(x, y, size, size);
  hot.globalCompositeOperation = 'destination-out';
  hot.font = `${size * 0.42}px ${fonts.jp}`;
  hot.textAlign = 'center';
  hot.textBaseline = 'middle';
  hot.fillText('樋口', x + size / 2, y + size * 0.53);
  hot.globalCompositeOperation = 'source-over';
  hot.textAlign = 'left';
  hot.textBaseline = 'alphabetic';
}

/** Text in two colours, e.g. a cyan user and a printed path, left to right from `x`. */
function runs(d: Draw, x: number, y: number, parts: [Layer, string, number?][]) {
  let at = x;
  for (const [layer, text, alpha = 1] of parts) {
    const ctx = d[layer];
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillText(text, at, y);
    at += ctx.measureText(text).width;
  }
}

const setFont = (d: Draw, font: string) => LAYERS.forEach((layer) => (d[layer].font = font));

function front(d: Draw, fonts: Fonts) {
  grid(d.foil);

  setFont(d, `500 34px ${fonts.mono}`);
  runs(d, M, M + 44, [
    ['cyan', 'remi@portfolio'],
    ['print', ':~/.secret/card$', 0.55],
  ]);

  setFont(d, `600 150px ${fonts.sans}`);
  runs(d, M - 6, 560, [['print', ABOUT.name]]);
  d.foil.fillStyle = '#fff';
  d.foil.fillRect(M, 612, 160, 8);
  setFont(d, `400 36px ${fonts.mono}`);
  runs(d, M, 690, [['print', ABOUT.role.toLowerCase(), 0.75]]);

  runs(d, M, H - M - 12, [['print', 'stockholm · tokyo', 0.55]]);
}

function back(d: Draw, fonts: Fonts) {
  grid(d.foil);

  setFont(d, `400 40px ${fonts.mono}`);
  runs(d, M, M + 52, [['print', '# ', 0.55]]);
  d.print.font = `48px ${fonts.jp}`;
  d.print.fillStyle = '#fff';
  d.print.fillText('名刺', M + d.cyan.measureText('# ').width, M + 54);

  // A holographic sticker with the seal's name cut out.
  const [cx, cy, r] = [W - M - 230, H / 2 + 10, 210];
  d.foil.beginPath();
  d.foil.arc(cx, cy, r, 0, Math.PI * 2);
  d.foil.fill();
  d.foil.globalCompositeOperation = 'destination-out';
  d.foil.font = `${r * 0.78}px ${fonts.jp}`;
  d.foil.textAlign = 'center';
  d.foil.textBaseline = 'middle';
  d.foil.fillText('樋口', cx, cy + r * 0.05);
  d.foil.globalCompositeOperation = 'source-over';
  d.foil.textAlign = 'left';
  d.foil.textBaseline = 'alphabetic';

  setFont(d, `500 ${LINKS.size}px ${fonts.mono}`);
  CARD_LINKS.forEach((link, i) => {
    const y = LINKS.top + i * LINKS.step;
    const url = shortUrl(link.href);
    runs(d, M, y, [
      ['cyan', link.label.padEnd(LINKS.pad)],
      ['print', url, 0.9],
    ]);
    const x = M + LINKS.pad * LINKS.size * MONO_ADVANCE;
    d.foil.fillStyle = 'rgba(255,255,255,0.8)';
    d.foil.fillRect(x, y + 12, url.length * LINKS.size * MONO_ADVANCE, 3);
  });

  setFont(d, `400 30px ${fonts.mono}`);
  runs(d, M, H - M - 12, [['print', 'you found it · good luck with the rest', 0.55]]);
  seal(d.hot, fonts, W - M - 110, H - M - 110, 110);
}

/**
 * Both faces as one rgba8 texture: print, cyan print, holographic foil and hot seal coverage in r, g, b, a.
 * Each layer is drawn white on its own canvas and its alpha is packed, so no layer is ever premultiplied.
 */
export async function drawFaces(): Promise<{ size: [number, number]; pixels: Uint8Array<ArrayBuffer> }> {
  const fonts = pageFonts();
  await Promise.all([
    document.fonts.ready,
    document.fonts.load(`48px ${fonts.jp}`, '樋口名刺').catch(() => []),
    document.fonts.load(`600 48px ${fonts.sans}`, ABOUT.name).catch(() => []),
    document.fonts.load(`500 48px ${fonts.mono}`, 'remi@portfolio').catch(() => []),
  ]);
  const canvases = LAYERS.map(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H * 2;
    return canvas;
  });
  const d = Object.fromEntries(LAYERS.map((layer, i) => [layer, canvases[i].getContext('2d')!])) as Draw;
  front(d, fonts);
  LAYERS.forEach((layer) => d[layer].translate(0, H));
  back(d, fonts);

  const pixels = new Uint8Array(W * H * 2 * 4);
  LAYERS.forEach((layer, channel) => {
    const alpha = d[layer].getImageData(0, 0, W, H * 2).data;
    for (let i = 0; i < W * H * 2; i++) pixels[i * 4 + channel] = alpha[i * 4 + 3];
  });
  return { size: [W, H * 2], pixels };
}
