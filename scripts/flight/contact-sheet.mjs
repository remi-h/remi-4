/**
 * Combines PNGs into one contact sheet (box-filtered down by `--scale`), for comparing frames side by side.
 *
 *   npm run flight:sheet -- --out tmp/flight/sheet.png [--scale 0.5] [--cols 3] a.png b.png …
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: 'tmp/flight/sheet.png' },
    scale: { type: 'string', default: '0.5' },
    cols: { type: 'string', default: '3' },
  },
});
const images = positionals.map((file) => PNG.sync.read(readFileSync(file)));
if (!images.length) throw new Error('Pass the PNGs to combine.');
const scale = Number(values.scale);
const cols = Number(values.cols);
const w = Math.round(images[0].width * scale);
const h = Math.round(images[0].height * scale);
const sheet = new PNG({ width: w * cols, height: h * Math.ceil(images.length / cols) });

/** The average colour of the source pixels that output pixel (x, y) covers. */
function average(image, x, y) {
  const x0 = Math.floor(x / scale);
  const y0 = Math.floor(y / scale);
  const x1 = Math.min(image.width, Math.max(Math.floor((x + 1) / scale), x0 + 1));
  const y1 = Math.min(image.height, Math.max(Math.floor((y + 1) / scale), y0 + 1));
  const sum = [0, 0, 0];
  for (let sy = y0; sy < y1; sy++) {
    for (let sx = x0; sx < x1; sx++) {
      const k = (sy * image.width + sx) * 4;
      for (let c = 0; c < 3; c++) sum[c] += image.data[k + c];
    }
  }
  const n = (x1 - x0) * (y1 - y0);
  return [sum[0] / n, sum[1] / n, sum[2] / n, 255];
}

images.forEach((image, i) => {
  const ox = (i % cols) * w;
  const oy = Math.floor(i / cols) * h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) sheet.data.set(average(image, x, y), ((oy + y) * sheet.width + ox + x) * 4);
  }
});
writeFileSync(values.out, PNG.sync.write(sheet));
console.log(values.out);
