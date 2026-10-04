import { expect, test } from '@playwright/test';

test('home page shows the name and links to the main sections', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Remi Higuchi' })).toBeVisible();

  for (const [name, path] of [
    ['Projects', '/projects'],
    ['LOG', '/log'],
  ] as const) {
    await page.getByRole('navigation').getByRole('link', { name }).click();
    await expect(page).toHaveURL(path);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  }
});

test('home page lists featured fixture projects', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Fixture Alpha' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fixture Beta' })).toHaveCount(0);

  await page.getByRole('link', { name: /Fixture Alpha/ }).click();
  await expect(page).toHaveURL('/projects/fixture-alpha');
  await expect(page.getByText('Alpha body text.')).toBeVisible();
});
