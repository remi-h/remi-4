/**
 * Frames per second of the cockpit view at dusk, night (aurora) and sunrise, in Chrome. Run it twice: laptop
 * GPUs throttle when warm, so compare against the same code measured at the same time (git stash).
 *
 *   npm run flight:bench -- [--url http://localhost:3000/.secret] [--size 1440x900]
 */
import { parseArgs } from 'node:util';
import { measureFps, openFlight } from './chrome.mjs';

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3000/.secret' },
    size: { type: 'string', default: '1440x900' },
  },
});
const [width, height] = values.size.split('x').map(Number);
const { browser, page, errors, board } = await openFlight({ url: values.url, width, height });
await board();
await page.keyboard.press('Escape'); // straight to the cockpit
await page.waitForTimeout(2500);
const results = {};
for (const [name, progress] of [
  ['dusk', 0.03],
  ['night', 0.35],
  ['sunrise', 0.86],
]) {
  await page.getByRole('slider').fill(String(progress));
  await page.waitForTimeout(1500);
  results[name] = await measureFps(page);
}
console.log(
  Object.entries(results)
    .map(([name, fps]) => `${name} ${fps}`)
    .join(' · '),
  'fps',
);
if (errors.length) console.log('errors:', errors);
await browser.close();
