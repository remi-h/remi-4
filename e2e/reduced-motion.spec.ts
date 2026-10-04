import { expect, test, type Page } from '@playwright/test';

// Counts requestAnimationFrame calls, which is how any animated background or effect would run.
const watchFrames = async (page: Page) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __frames: number };
    w.__frames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.__frames++;
      return raf(cb);
    };
  });
};

const frames = (page: Page) => page.evaluate(() => (window as unknown as { __frames: number }).__frames);

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const route of ['/', '/projects', '/log']) {
    test(`${route} runs no animation loop and no CSS animations`, async ({ page }) => {
      await watchFrames(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('main')).toBeVisible();
      await page.waitForTimeout(500);

      const settled = await frames(page);
      await page.waitForTimeout(1500);
      expect(await frames(page)).toBe(settled);

      const running = await page.evaluate(
        () => document.getAnimations().filter((a) => a.playState === 'running').length,
      );
      expect(running).toBe(0);
    });
  }
});
