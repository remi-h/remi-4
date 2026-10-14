import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--enable-unsafe-webgpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('console', m => ['error','warning'].includes(m.type()) && console.log(m.type(), m.text().slice(0, 400)));
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 400)));
p.on('crash', () => console.log('PAGE CRASHED'));
b.on('disconnected', () => console.log('BROWSER DISCONNECTED'));
await p.goto('http://localhost:3000/.secret');
await p.waitForFunction(() => !document.querySelector('[data-testid=secret-flight] button[disabled]'), null, { timeout: 60000 });
const t0 = Date.now();
await p.getByRole('button', { name: '[ board ]' }).click();
for (let i = 0; i < 16; i++) {
  await p.waitForTimeout(1000);
  const fps = await p.evaluate(() => new Promise(r => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 400) requestAnimationFrame(f); else r(Math.round(n / 0.4)); }; requestAnimationFrame(f); })).catch(e => 'ERR ' + e.message.slice(0, 60));
  console.log(((Date.now() - t0) / 1000).toFixed(1) + 's fps', fps);
}
await b.close();
