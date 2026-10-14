import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, h] of [[1280, 800], [375, 812]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:3000/'); await p.waitForTimeout(4500);
  await p.getByTestId('flight-log').screenshot({ path: process.argv[2] + `/home-${w}.png` });
}
await b.close();
