import { expect, test } from '@playwright/test';

test('the grid lists every fixture project', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const titles = page.getByRole('main').getByRole('heading', { level: 2 });
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

test('a project card looks the same on the home page and the listing', async ({ page }) => {
  const cardMetrics = async (path: string) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const card = page.getByRole('link', { name: /Fixture Alpha/ });
    const title = card.getByRole('heading');
    const image = card.locator('div').first();
    return {
      titleSize: await title.evaluate((el) => getComputedStyle(el).fontSize),
      titleWeight: await title.evaluate((el) => getComputedStyle(el).fontWeight),
      ratio: await image.evaluate((el) => Math.round((el.clientWidth / el.clientHeight) * 100)),
      meta: await card.getByText(/^01/).innerText(),
    };
  };
  expect(await cardMetrics('/')).toEqual(await cardMetrics('/projects'));
});
