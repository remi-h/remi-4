import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { cdError, commands } from '../lib/terminal';

test('an unknown page answers like a shell: cd fails and you stay in ~', async ({ page }) => {
  const response = await page.goto('/some/where', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);

  const main = page.getByRole('main');
  await expect(main.getByText(commands.toPath('some/where'), { exact: true })).toBeVisible();
  await expect(main.getByTestId('cd-error')).toHaveText(cdError('some/where'));
  await expect(main.getByRole('heading', { level: 1, name: '404' })).toBeVisible();

  // cd failed, so the header and footer prompts stay in ~ and no tab is current.
  await expect(page.getByRole('banner').getByText('remi@portfolio ~', { exact: true })).toBeVisible();
  await expect(page.getByRole('contentinfo').getByText('~', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).locator('[aria-current="page"]')).toHaveCount(0);
});

test('an unknown project shows the path that was asked for, and the way out works', async ({ page }) => {
  await page.goto('/projects/does-not-exist', { waitUntil: 'domcontentloaded' });
  const main = page.getByRole('main');
  await expect(main.getByTestId('cd-error')).toHaveText(cdError('projects/does-not-exist'));

  await main.getByRole('link', { name: new RegExp(commands.toProjects) }).click();
  await expect(page).toHaveURL('/projects');
  await page.goBack();
  await main.getByRole('link', { name: new RegExp(commands.home) }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('banner').getByText('remi@portfolio ~', { exact: true })).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('a long missing path does not scroll the page sideways', async ({ page }) => {
    await page.goto('/projects/a-very-long-missing-project-name-that-keeps-going', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('cd-error')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the 404 has no serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/projects/a-very-long-missing-project-name-that-keeps-going', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('cd-error')).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
