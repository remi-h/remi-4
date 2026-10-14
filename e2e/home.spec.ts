import { expect, test } from '@playwright/test';

test('the hero shows the name and role, without the location lines', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Remi Higuchi' })).toBeVisible();
  await expect(page.getByText('Experience Designer & Software Engineer')).toBeVisible();
  await expect(page.getByText('From Tokyo, Based in Stockholm')).toHaveCount(0);
  await expect(page.getByText('35.68')).toHaveCount(0);
});

test('the flight log shows Tokyo to Stockholm, landed when motion is reduced', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const log = page.getByTestId('flight-log');
  await expect(log).toContainText('resolving route tokyo → stockholm');
  await expect(log).toContainText('HND');
  await expect(log).toContainText('ARN');
  await expect(log).toContainText('landed · based in stockholm');
  await expect(log.getByTestId('flight-hint')).toHaveText('? secret flight simulator exists · good luck');
  await expect(log).toContainText('100%');
});

test('the featured heading is a real command line with a # comment', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { level: 2, name: 'remi@portfolio:~$ ls -lt featured # プロジェクト' }),
  ).toBeVisible();
});

test('featured projects show only featured fixtures, newest first', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /ls -lt featured/ })).toBeVisible();

  const titles = page.getByRole('main').getByRole('heading', { level: 3 });
  await expect(titles).toHaveText(['Fixture Alpha', 'Fixture Gamma']);
  await expect(titles.filter({ hasText: 'Fixture Beta' })).toHaveCount(0);
});

test('featured projects are numbered folders with a year', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const main = page.getByRole('main');
  await expect(main.getByText('01_fixture-alpha/')).toBeVisible();
  await expect(main.getByText('2026', { exact: true })).toBeVisible();
  await expect(main.getByText('02_fixture-gamma/')).toBeVisible();
  await expect(main.getByText('2025', { exact: true })).toBeVisible();
});

test('a locked featured project shows a lock and has no page to open', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const locked = page.getByRole('article').filter({ hasText: 'Fixture Gamma' });
  await expect(locked.getByRole('img', { name: 'Locked' })).toBeVisible();
  await expect(locked.getByText('drwxr-x---')).toBeVisible();
  await expect(page.getByRole('link', { name: /Fixture Gamma/ })).toHaveCount(0);
});

test('the page is on the ink surface', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { background: style.backgroundColor, text: style.color };
  });
  expect(colors).toEqual({ background: 'rgb(7, 8, 12)', text: 'rgb(223, 227, 238)' });
});

test('"cd projects" and "cd log" lead to those pages', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /cd projects/ }).click();
  await expect(page).toHaveURL('/projects');

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /cd log/ }).click();
  await expect(page).toHaveURL('/log');
});

test('"view all" leads to the projects page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /view all/i }).click();
  await expect(page).toHaveURL('/projects');
});

test('a featured project opens its detail page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Fixture Alpha/ }).click();
  await expect(page).toHaveURL('/projects/fixture-alpha');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Alpha' })).toBeVisible();
  await expect(page.getByText('Alpha body text.')).toBeVisible();
});
