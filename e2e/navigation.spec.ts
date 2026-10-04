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

test('the nav has no Contact link', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText(['Projects', 'Log']);
});

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1800, height: 900 } });

  test('the header line and the footer background span the full width', async ({ page }) => {
    await page.goto('/log', { waitUntil: 'domcontentloaded' });
    const header = await page.getByRole('banner').boundingBox();
    const footer = await page.getByRole('contentinfo').boundingBox();
    expect(header?.width).toBe(1800);
    expect(footer?.width).toBe(1800);
  });

  test('the header and footer content stay aligned with the page content', async ({ page }) => {
    await page.goto('/log', { waitUntil: 'domcontentloaded' });
    const left = (box: { x: number } | null) => box?.x;
    const wordmark = await page.getByRole('banner').getByRole('link', { name: 'Remi Higuchi' }).boundingBox();
    const heading = await page.getByRole('heading', { level: 1, name: 'Log' }).boundingBox();
    const footerHeading = await page.getByRole('contentinfo').getByRole('heading').boundingBox();
    expect(left(wordmark)).toBe(left(footerHeading));
    expect(left(heading)).toBe(left(wordmark));
  });
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
