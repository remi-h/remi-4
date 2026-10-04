import { expect, test } from '@playwright/test';

test('the nav reaches every top-level page', async ({ page }) => {
  // Start away from the home page so the first click does not compete with its background.
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const nav = page.getByRole('navigation');

  await nav.getByRole('link', { name: 'LOG' }).click();
  await expect(page).toHaveURL('/log');
  await expect(page.getByRole('heading', { level: 1, name: 'Log' })).toBeVisible();

  await nav.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL('/projects');
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();

  await nav.getByRole('link', { name: 'Remi Higuchi' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Remi Higuchi' })).toBeVisible();
});

test('the footer links to the main pages and to social profiles', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const footer = page.getByRole('contentinfo');

  await expect(footer.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(footer.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
  await expect(footer.getByRole('link', { name: 'LOG' })).toHaveAttribute('href', '/log');
  await footer.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL('/projects');
});

test('every link that opens a new tab is noopener', async ({ page }) => {
  for (const path of ['/', '/projects', '/log']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const external = page.locator('a[target="_blank"]');
    const count = await external.count();
    for (let i = 0; i < count; i++) {
      await expect(external.nth(i), `${path} link #${i}`).toHaveAttribute('rel', /noopener/);
    }
  }
});
