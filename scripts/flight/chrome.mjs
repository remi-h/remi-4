/**
 * Opens /.secret in Chrome with WebGPU, waits until the flight is ready to board, and collects page errors.
 * Shared by benchmark.mjs and capture.mjs. Needs the dev server (`npm run dev`) or any URL serving the site.
 */
import { chromium } from '@playwright/test';

export async function openFlight({ url, width, height }) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--enable-unsafe-webgpu'] });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Vercel Analytics only exists on Vercel; its script 404s everywhere else.
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.location().url.includes('/_vercel/')) errors.push(message.text());
  });
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector('[data-testid=secret-flight] button[disabled]'), null, {
    timeout: 60000,
  });
  const board = () => page.getByRole('button', { name: '[ board ]' }).click();
  return { browser, page, errors, board };
}

/** Frames per second over `ms`, measured with requestAnimationFrame. */
export function measureFps(page, ms = 3000) {
  return page.evaluate(
    (span) =>
      new Promise((done) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < span) requestAnimationFrame(tick);
          else done(Math.round((frames * 1000) / span));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}
