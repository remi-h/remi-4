import { expect, test } from '@playwright/test';

test('pages link a generated OG image, favicon and touch icon', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toContain('/opengraph-image');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /\/icon/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /\/apple-icon/);
});

for (const [path, width, height] of [
  ['/opengraph-image', 1200, 630],
  ['/icon', 32, 32],
  ['/apple-icon', 180, 180],
] as const) {
  test(`${path} renders a ${width}x${height} PNG`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    const png = await response.body();
    // The PNG header stores the width and height as big-endian integers at bytes 16 and 20.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width, height]);
  });
}

test('page titles follow the "<page> · Remi Higuchi" pattern', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Remi Higuchi - Portfolio');
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Projects · Remi Higuchi');
});
