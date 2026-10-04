import { expect, test } from '@playwright/test';

test('the hero shows the name and role, without the location lines', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Remi Higuchi' })).toBeVisible();
  await expect(page.getByText('Experience Designer & Software Engineer')).toBeVisible();
  await expect(page.getByText('From Tokyo, Based in Stockholm')).toHaveCount(0);
  await expect(page.getByText('35.68')).toHaveCount(0);
});

test('featured projects show only featured fixtures, featured first', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Featured Projects' })).toBeVisible();

  const titles = page.getByRole('main').getByRole('heading', { level: 3 });
  await expect(titles.filter({ hasText: 'Fixture Alpha' })).toBeVisible();
  await expect(titles.filter({ hasText: 'Fixture Gamma' })).toBeVisible();
  await expect(titles.filter({ hasText: 'Fixture Beta' })).toHaveCount(0);
});

test('featured projects are numbered and show the year', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const main = page.getByRole('main');
  await expect(main.getByText('01 · 2026')).toBeVisible();
  await expect(main.getByText('02 · 2025')).toBeVisible();
});

test('a locked featured project shows a lock and has no page to open', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const locked = page.getByRole('article').filter({ hasText: 'Fixture Gamma' });
  await expect(locked.getByRole('img', { name: 'Locked' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Fixture Gamma/ })).toHaveCount(0);
});

test('the page is on the paper surface', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { background: style.backgroundColor, text: style.color };
  });
  expect(colors).toEqual({ background: 'rgb(244, 241, 234)', text: 'rgb(22, 20, 15)' });
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
