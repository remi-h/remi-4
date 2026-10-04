import { expect, test } from '@playwright/test';

test('the grid lists every fixture project', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const titles = page.getByRole('main').getByRole('heading', { level: 4 });
  await expect(titles).toHaveText([/Fixture Alpha/, /Fixture Gamma/, /Fixture Beta/]);
});

test('a project card opens its detail page with title, summary and body', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Fixture Beta/ }).click();
  await expect(page).toHaveURL('/projects/fixture-beta');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Beta' })).toBeVisible();
  await expect(page.getByText('A project that is not featured.')).toBeVisible();
  await expect(page.getByText('Beta body text.')).toBeVisible();
});

test('the back button returns to the previous page', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Fixture Alpha/ }).click();
  await expect(page).toHaveURL('/projects/fixture-alpha');
  await page.getByRole('button', { name: /back/ }).click();
  await expect(page).toHaveURL('/projects');
});

test('a locked project shows a lock and has no page to open', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const locked = page.locator('article').filter({ hasText: 'Fixture Gamma' });
  await expect(locked.getByRole('img', { name: 'Locked' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Fixture Gamma/ })).toHaveCount(0);
});

test('an unknown project slug is a 404', async ({ page }) => {
  const response = await page.goto('/projects/does-not-exist', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
});
