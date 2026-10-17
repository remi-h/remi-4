import { expect, test } from '@playwright/test';

const routes = ['/', '/projects', '/projects/fixture-alpha', '/log', '/.secret', '/.secret/card'];
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

test.describe('the footer sits at the bottom of the window on short pages', () => {
  for (const route of ['/.secret', '/nope']) {
    test(route, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 1400 });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const footer = page.getByRole('contentinfo');
      // The page streams in and hydrates after domcontentloaded (the 404 re-renders once the browser
      // knows the path), so wait for the footer and let the layout settle instead of measuring once.
      await expect(footer).toBeVisible();
      await expect
        .poll(async () => {
          const box = await footer.boundingBox();
          return box ? Math.abs(box.y + box.height - 1400) : null;
        })
        .toBeLessThanOrEqual(1);
    });
  }
});
