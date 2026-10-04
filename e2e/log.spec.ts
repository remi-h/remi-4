import { expect, test } from '@playwright/test';

test('log entries show date, organisation and title', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  // Fixture dates are UTC midnight, so the server's time zone can shift the day by one.
  await expect(page.getByText(/Feb (9|10), 2026/)).toBeVisible();
  await expect(page.getByText('| Fixture Conf')).toBeVisible();
  await expect(page.getByText('Fixture talk')).toBeVisible();
  await expect(page.getByText(/Jun (4|5), 2025/)).toBeVisible();
  await expect(page.getByText('Fixture article')).toBeVisible();
});

test('an entry with a link opens it in a new tab, one without is plain text', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const link = page.getByRole('link', { name: /Fixture talk/ });
  await expect(link).toHaveAttribute('href', 'https://example.com/talk');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(page.getByRole('link', { name: /Fixture article/ })).toHaveCount(0);
});
