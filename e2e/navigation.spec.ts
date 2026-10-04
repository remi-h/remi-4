import { expect, test } from '@playwright/test';

test('the nav reaches every top-level page', async ({ page }) => {
  // Start away from the home page so the first click does not compete with its background.
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const nav = page.getByRole('navigation', { name: 'Main' });

  await nav.getByRole('link', { name: 'Log' }).click();
  await expect(page).toHaveURL('/log');
  await expect(page.getByRole('heading', { level: 1, name: 'Log' })).toBeVisible();

  await nav.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL('/projects');
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Remi Higuchi' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Remi Higuchi' })).toBeVisible();
});

test('the current page is marked in the nav', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Main' });

  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Log' })).not.toHaveAttribute('aria-current', 'page');

  await page.goto('/projects/fixture-alpha', { waitUntil: 'domcontentloaded' });
  await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');

  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  await expect(nav.getByRole('link', { name: 'Log' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current', 'page');
});

test('the Contact link jumps to the footer', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contact' }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole('contentinfo').getByRole('heading', { name: /Say hello/ })).toBeInViewport();
});

test('the footer links to social profiles', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const footer = page.getByRole('contentinfo');

  await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/in/hremi');
  await expect(footer.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
    'href',
    'https://instagram.com/remihiguchi',
  );
  await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/remi-h');
  await expect(footer.getByText('© 2026 Remi Higuchi')).toBeVisible();
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
