/**
 * Redraws what is on screen into a canvas so the boarding shader can take the page apart:
 * the ink page and its 64px grid, every element's background and borders, and every visible
 * character at the exact position the browser laid it out, and same-origin images. SVGs are skipped on purpose, so
 * the plane on the runway leaves the snapshot and the shader draws it instead.
 */
export function snapshotPage(dpr: number): HTMLCanvasElement {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // The body background: ink plus the grid, which scrolls with the page.
  ctx.fillStyle = '#07080c';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(34, 229, 211, 0.04)';
  const offset = -(window.scrollY % 64);
  for (let x = 0; x < width; x += 64) ctx.fillRect(x, 0, 1, height);
  for (let y = offset; y < height; y += 64) ctx.fillRect(0, y, width, 1);

  walk(ctx, document.body, 1, width, height);
  return canvas;
}

const visible = (r: DOMRect, width: number, height: number) =>
  r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < width && r.top < height;

function walk(ctx: CanvasRenderingContext2D, el: Element, parentOpacity: number, width: number, height: number) {
  if (el instanceof SVGElement || el instanceof HTMLCanvasElement || el.hasAttribute('data-snapshot-skip')) return;
  const style = getComputedStyle(el);
  if (style.display === 'none') return;
  const opacity = parentOpacity * Number(style.opacity);
  if (opacity < 0.01) return;

  const rect = el.getBoundingClientRect();
  // Screen-reader-only text (sr-only: a clipped 1px box) is not on screen, so not in the picture.
  if (style.clip.startsWith('rect') || (rect.width <= 1 && rect.height <= 1 && style.overflow === 'hidden')) return;
  if (style.visibility !== 'hidden' && visible(rect, width, height)) {
    ctx.globalAlpha = opacity;
    if (!style.backgroundColor.endsWith(', 0)') && style.backgroundColor !== 'transparent') {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    }
    drawBorders(ctx, rect, style);
    if (el instanceof HTMLImageElement) drawImage(ctx, el, rect, style);
  }

  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && style.visibility !== 'hidden') {
      drawText(ctx, child as Text, style, opacity, width, height);
    } else if (child instanceof Element) {
      walk(ctx, child, opacity, width, height);
    }
  }
}

/**
 * A loaded image, fitted like the browser fits it (object-fit cover or contain, else stretched). Only
 * same-origin images (next/image serves covers from /_next/image): another origin would taint the
 * canvas, and WebGPU refuses to read a tainted one.
 */
function drawImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, r: DOMRect, s: CSSStyleDeclaration) {
  if (
    !img.complete ||
    !img.naturalWidth ||
    new URL(img.currentSrc || img.src, location.href).origin !== location.origin
  )
    return;
  const [iw, ih] = [img.naturalWidth, img.naturalHeight];
  const fit = s.objectFit;
  if (fit !== 'cover' && fit !== 'contain') {
    ctx.drawImage(img, r.left, r.top, r.width, r.height);
    return;
  }
  const scale = (fit === 'cover' ? Math.max : Math.min)(r.width / iw, r.height / ih);
  const [w, h] = [iw * scale, ih * scale];
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.left, r.top, r.width, r.height);
  ctx.clip();
  ctx.drawImage(img, r.left + (r.width - w) / 2, r.top + (r.height - h) / 2, w, h);
  ctx.restore();
}

function drawBorders(ctx: CanvasRenderingContext2D, r: DOMRect, s: CSSStyleDeclaration) {
  const sides = [
    ['Top', r.left, r.top, r.width, true],
    ['Bottom', r.left, r.bottom, r.width, true],
    ['Left', r.left, r.top, r.height, false],
    ['Right', r.right, r.top, r.height, false],
  ] as const;
  for (const [side, x, y, length, horizontal] of sides) {
    const w = parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`));
    const lineStyle = s.getPropertyValue(`border-${side.toLowerCase()}-style`);
    if (!w || lineStyle === 'none' || lineStyle === 'hidden') continue;
    ctx.fillStyle = s.getPropertyValue(`border-${side.toLowerCase()}-color`);
    // Bottom and right borders sit inside the box, like the browser draws them.
    const bx = side === 'Right' ? x - w : x;
    const by = side === 'Bottom' ? y - w : y;
    const dash = lineStyle === 'dashed' ? 3 * w : length;
    for (let d = 0; d < length; d += dash * 2) {
      const seg = Math.min(dash, length - d);
      if (horizontal) ctx.fillRect(bx + d, by, seg, w);
      else ctx.fillRect(bx, by + d, w, seg);
    }
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  node: Text,
  s: CSSStyleDeclaration,
  opacity: number,
  width: number,
  height: number,
) {
  const text = node.data;
  if (!text.trim()) return;
  ctx.globalAlpha = opacity;
  ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  ctx.fillStyle = s.color;
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText('Hg');
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  const upper = s.textTransform === 'uppercase';

  // One range per character: monospace or not, each glyph lands where the browser put it.
  const range = document.createRange();
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ' || ch === '\n' || ch === '\t') continue;
    range.setStart(node, i);
    range.setEnd(node, i + (isHighSurrogate(ch) ? 2 : 1));
    const r = range.getClientRects()[0];
    if (!r || !visible(r, width, height)) continue;
    const baseline = r.top + (r.height - (ascent + descent)) / 2 + ascent;
    const glyph = range.toString();
    ctx.fillText(upper ? glyph.toUpperCase() : glyph, r.left, baseline);
    if (isHighSurrogate(ch)) i++;
  }
}

const isHighSurrogate = (ch: string) => {
  const code = ch.charCodeAt(0);
  return code >= 0xd800 && code <= 0xdbff;
};
