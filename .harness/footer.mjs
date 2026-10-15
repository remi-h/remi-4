import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
for (const [route, w, h] of [['/nope', 1280, 1000], ['/.secret', 375, 812]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:3000' + route); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/footer-${w}.png` });
}
await b.close();
