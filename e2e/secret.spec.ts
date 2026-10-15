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

  // Retry the first command until the prompt has hydrated and answers.
  await expect(async () => {
    await prompt.fill('ls');
    await prompt.press('Enter');
    await expect(shell).toContainText('about.txt', { timeout: 1000 });
  }).toPass();
  await expect(shell).not.toContainText('.secret');

  await prompt.fill('ls -a');
  await prompt.press('Enter');
  await expect(shell).toContainText('.secret');

  await prompt.fill('cd .secret');
  await prompt.press('Enter');
  await expect(page).toHaveURL('/.secret');
  await expect(page.getByTestId('shell')).toContainText('guest@portfolio:~/.secret$');
});

test('/.secret has the boarding window with the plane on its runway', async ({ page }) => {
  await page.goto('/.secret', { waitUntil: 'domcontentloaded' });
  const flight = page.getByTestId('secret-flight');
  await expect(flight).toContainText('ARN → HND');
  // Headless CI has no WebGPU, so the board button says so instead of boarding.
  await expect(flight.getByRole('button', { name: '[ board ]' })).toBeVisible();
});

test('/.secret welcomes you and hints at more', async ({ page }) => {
  await page.goto('/.secret', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('secret-welcome')).toContainText('Congrats, you found a hidden page');
  await expect(page.getByTestId('secret-welcome')).toContainText('good luck finding them');
});

test('ls in ~/.secret finds card, and cd card opens the business card', async ({ page }) => {
  await page.goto('/.secret', { waitUntil: 'domcontentloaded' });
  const shell = page.getByTestId('shell');
  const prompt = shell.getByRole('textbox', { name: 'Type a command' });
  // This page also loads the flight, so the prompt can take a moment to hydrate: retry until it answers.
  await expect(async () => {
    await prompt.fill('ls');
    await prompt.press('Enter');
    await expect(shell).toContainText('card', { timeout: 1000 });
  }).toPass();
  await prompt.fill('cd card');
  await prompt.press('Enter');
  await expect(page).toHaveURL('/.secret/card');
});

test('/.secret/card types "cd .secret/card", keeps the .secret tab, and its links are real', async ({ page }) => {
  await page.goto('/.secret/card', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('main').getByText(commands.toCard, { exact: true })).toHaveCount(1);
  await expect(page).toHaveTitle('card · Remi Higuchi');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(nav(page).getByRole('link', { name: '.secret' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('shell')).toContainText('guest@portfolio:~/.secret/card$');
  const card = page.getByTestId('secret-card');
  await expect(card.getByRole('link', { name: 'github' })).toHaveAttribute('href', 'https://github.com/remi-h');
  await expect(card.getByRole('link', { name: 'linkedin' })).toHaveAttribute('rel', 'noopener noreferrer');
  // Headless CI has no WebGPU, so the card says so and flip stays off.
  await expect(card).toContainText('this card needs a browser with webgpu');
  await expect(card.getByRole('button', { name: '[ flip ]' })).toBeDisabled();
});
