import { expect, test } from '@playwright/test';
import { commands } from '../lib/terminal';

const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Main' });

test('the 0 .secret tab is invisible until you hover it', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const tab = nav(page).getByRole('link', { name: '.secret' });
  await expect(tab).toHaveCSS('opacity', '0');
  await tab.hover();
  await expect(tab).toHaveCSS('opacity', '1');
  await tab.click();
  await expect(page).toHaveURL('/.secret');
});

test('the tab shows when focused with the keyboard', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const tab = nav(page).getByRole('link', { name: '.secret' });
  await expect(tab).toHaveCSS('opacity', '0');
  await page.keyboard.press('Tab'); // the seal link
  await page.keyboard.press('Tab');
  await expect(tab).toBeFocused();
  await expect(tab).toHaveCSS('opacity', '1');
});

test('/.secret types "cd .secret", is marked, and is out of search engines', async ({ page }) => {
  await page.goto('/.secret', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('main').getByText(commands.toSecret, { exact: true })).toHaveCount(1);
  await expect(page).toHaveTitle('.secret · Remi Higuchi');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByTestId('shell')).toContainText('guest@portfolio:~/.secret$');
  await expect(nav(page).getByRole('link', { name: '.secret' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('remi@portfolio ~/.secret')).toBeVisible();
});

test('ls hides it, ls -a finds it, and cd .secret opens it', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const shell = page.getByTestId('shell');
  const prompt = shell.getByRole('textbox', { name: 'Type a command' });

  await prompt.fill('ls');
  await prompt.press('Enter');
  await expect(shell).toContainText('about.txt');
  await expect(shell).not.toContainText('.secret');

  await prompt.fill('ls -a');
  await prompt.press('Enter');
  await expect(shell).toContainText('.secret');

  await prompt.fill('cd .secret');
  await prompt.press('Enter');
  await expect(page).toHaveURL('/.secret');
  await expect(page.getByTestId('shell')).toContainText('guest@portfolio:~/.secret$');
});

test('/.secret has the decorative vgpu canvas, hidden from screen readers', async ({ page }) => {
  await page.goto('/.secret', { waitUntil: 'domcontentloaded' });
  const field = page.getByTestId('secret-field');
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute('aria-hidden', 'true');
});
