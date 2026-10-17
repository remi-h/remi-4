import { expect, test, type Page } from '@playwright/test';

// The form is hydrated together with the prompt below it; filling it earlier would lose the input.
const open = async (page: Page) => {
  await page.goto('/investor', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('shell')).toHaveAttribute('data-ready', 'true');
};

test('the investor page is reached from the nav and marked current', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('link', { name: 'investor' }).click();
  await expect(page).toHaveURL('/investor');
  await expect(page.getByRole('heading', { level: 1, name: 'investor/' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'investor' })).toHaveAttribute('aria-current', 'page');
});

test('investing 10 kr shows a receipt that says nothing was charged', async ({ page }) => {
  await open(page);
  await page.getByLabel(/email/).fill('guest@example.com');
  await page.getByRole('button', { name: '[ invest ]' }).click();
  const receipt = page.getByTestId('invest-receipt');
  await expect(receipt).toContainText('invested 10 kr');
  await expect(receipt).toContainText('guest@example.com');
  await expect(receipt).toContainText('nothing was charged');
});

test('a custom amount is used, and bad input is refused', async ({ page }) => {
  await open(page);
  await page.getByLabel(/other amount/).fill('2500');
  await page.getByLabel(/email/).fill('nope');
  await page.getByRole('button', { name: '[ invest ]' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('email');
  await page.getByLabel(/email/).fill('guest@example.com');
  await page.getByRole('button', { name: '[ invest ]' }).click();
  await expect(page.getByTestId('invest-receipt')).toContainText('invested 2 500 kr');
  await page.getByRole('button', { name: '[ invest again ]' }).click();
  await page.getByLabel(/other amount/).fill('abc');
  await page.getByLabel(/email/).fill('guest@example.com');
  await page.getByRole('button', { name: '[ invest ]' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('whole amount');
});

test('cd investor at the prompt opens the page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox').last().fill('cd investor');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/investor');
});
