import { expect, test } from '@playwright/test';

const routes = ['/', '/projects', '/projects/fixture-alpha', '/log', '/.secret'];
const widths = [375, 1280];

for (const width of widths) {
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const route of routes) {
      test(`${route} does not scroll sideways`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('main')).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('the nav stays on screen and works', async ({ page }) => {
    await page.goto('/log', { waitUntil: 'domcontentloaded' });
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeInViewport();
    await nav.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL('/projects');
  });
});
