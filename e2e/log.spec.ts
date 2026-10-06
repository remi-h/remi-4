import { expect, test } from '@playwright/test';

test('log entries show date, organisation and title', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const main = page.getByTestId('log-entries');
  await expect(main.getByText('2026-02-10')).toBeVisible();
  await expect(main.getByText('Fixture Conf')).toBeVisible();
  await expect(main.getByText('Fixture talk')).toBeVisible();
  await expect(main.getByText('2025-06-05')).toBeVisible();
  await expect(main.getByText('Fixture Weekly')).toBeVisible();
  await expect(main.getByText('Fixture article')).toBeVisible();
});

test('an entry with a link opens it in a new tab, one without is plain text', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const link = page.getByRole('link', { name: /Fixture talk/ });
  await expect(link).toHaveAttribute('href', 'https://example.com/talk');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(page.getByRole('link', { name: /Fixture article/ })).toHaveCount(0);
});
