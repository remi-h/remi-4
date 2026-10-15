/**
 * Screenshots of the real boarding sequence at given seconds after pressing board, in Chrome.
 *
 *   npm run flight:capture -- --at 1.5,5,8,10.5,13.5 [--url …] [--size 1280x800] [--out tmp/flight]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { openFlight } from './chrome.mjs';

const { values } = parseArgs({
  options: {
    at: { type: 'string', default: '1.5,5,8,10.5,13.5' },
    url: { type: 'string', default: 'http://localhost:3000/.secret' },
    size: { type: 'string', default: '1280x800' },
    out: { type: 'string', default: 'tmp/flight' },
  },
});
const [width, height] = values.size.split('x').map(Number);
mkdirSync(values.out, { recursive: true });
const { browser, page, errors, board } = await openFlight({ url: values.url, width, height });
const start = Date.now();
await board();
for (const at of values.at.split(',').map(Number)) {
  await page.waitForTimeout(Math.max(0, at * 1000 - (Date.now() - start)));
  const file = join(values.out, `flight-${width}-${at}s.png`);
  await page.screenshot({ path: file });
  console.log(file);
}
if (errors.length) console.log('errors:', errors);
await browser.close();
