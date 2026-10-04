import { expect, test, type Page } from '@playwright/test';

// Installs a requestAnimationFrame counter and opens the home page, which has the animated background.
const openHomeCountingFrames = async (page: Page) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __frames: number };
    w.__frames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.__frames++;
      return raf(cb);
    };
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeAttached();
};

const frames = (page: Page) => page.evaluate(() => (window as unknown as { __frames: number }).__frames);

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the home background does not run an animation loop', async ({ page }) => {
    await openHomeCountingFrames(page);
    await page.waitForTimeout(500);
    const settled = await frames(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(settled);
  });
});

test.describe('without a motion preference', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the home background keeps animating', async ({ page }) => {
    await openHomeCountingFrames(page);
    // Software rendering can be slow, so wait for progress instead of assuming a frame rate.
    await expect.poll(() => frames(page), { timeout: 20_000 }).toBeGreaterThan(5);
  });
});
