import { expect, test } from '@playwright/test';

test('the hero shows the name, role and location', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Remi Higuchi' })).toBeVisible();
  await expect(page.getByText('Experience Designer & Software Engineer')).toBeVisible();
  await expect(page.getByText('From Tokyo, Based in Stockholm')).toBeVisible();
});

test('featured projects show only featured fixtures, featured first', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Featured Projects' })).toBeVisible();

  const titles = page.getByRole('main').getByRole('heading', { level: 4 });
  await expect(titles.filter({ hasText: 'Fixture Alpha' })).toBeVisible();
  await expect(titles.filter({ hasText: 'Fixture Gamma' })).toBeVisible();
  await expect(titles.filter({ hasText: 'Fixture Beta' })).toHaveCount(0);
});

test('"View all" leads to the projects page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /View all/ }).click();
  await expect(page).toHaveURL('/projects');
});

test('a featured project opens its detail page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Fixture Alpha/ }).click();
  await expect(page).toHaveURL('/projects/fixture-alpha');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Alpha' })).toBeVisible();
  await expect(page.getByText('Alpha body text.')).toBeVisible();
});
