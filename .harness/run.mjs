import { chromium } from '@playwright/test';
const out = '/private/tmp/claude-501/-Users-remihiguchi-Documents-dev-remi-4/989bf81d-194c-480b-bf54-9835d4d44f15/scratchpad/shots';
const [w, h] = [Number(process.argv[2] || 1280), Number(process.argv[3] || 800)];
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--enable-unsafe-webgpu'] });
const p = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; p.on('console', m => ['error','warning'].includes(m.type()) && errs.push(m.type()+': '+m.text().slice(0,200))); p.on('pageerror', e => errs.push('PAGEERR '+e.message.slice(0,200)));
const t = Date.now(); await p.goto('http://localhost:3000/.secret');
await p.waitForFunction(() => !document.querySelector('[data-testid=secret-flight] button[disabled]'), null, { timeout: 60000 });
console.log('ready after', Date.now() - t, 'ms');
const shot = (n) => p.screenshot({ path: out + '/' + w + '-' + n + '.png' });
const t0 = Date.now(); await p.getByRole('button', { name: '[ board ]' }).click();
for (const at of [5.0, 5.9, 7.2, 8.6, 10.0, 11.2, 12.0, 12.6, 14.0]) { await p.waitForTimeout(Math.max(0, at*1000 - (Date.now()-t0))); await shot('t' + at); }
const fps = await p.evaluate(() => new Promise(r => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log('fps', fps);
for (let i = 0; i < 30; i++) await p.keyboard.press('ArrowRight');
await p.waitForTimeout(1500); await shot('arrows');
console.log('progress after arrows', await p.getByRole('slider').inputValue());
await p.mouse.move(w * 0.15, h * 0.3); await p.waitForTimeout(1500); await shot('look');
await p.keyboard.press('Escape');
for (const at of [0.3, 1.2, 2.2, 4.0]) { await p.waitForTimeout(at === 0.3 ? 300 : (at - [0.3,1.2,2.2,4.0][[0.3,1.2,2.2,4.0].indexOf(at)-1]) * 1000); await shot('land' + at); }
console.log('page:', (await p.getByTestId('secret-flight').innerText()).replace(/\n/g, ' | '));
console.log('errors', errs);
await b.close();
