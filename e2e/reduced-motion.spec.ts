import { expect, test } from '@playwright/test';

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const route of ['/', '/projects', '/projects/fixture-alpha', '/log', '/.secret']) {
    test(`${route} runs no animations at all`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('main')).toBeVisible();
      // Even the blinking cursor stands still.
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    });
  }
});
