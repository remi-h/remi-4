import { expect, type Page, test } from '@playwright/test';
import { RESTORED_NOTE } from '../lib/collapse';

const prompt = (page: Page) => page.getByTestId('shell').getByRole('textbox', { name: 'Type a command' });

/** Types a line, retrying until the prompt has hydrated and printed `expected`. */
async function type(page: Page, line: string, expected: string) {
  await expect(async () => {
    await prompt(page).fill(line);
    await prompt(page).press('Enter');
    await expect(page.getByTestId('shell')).toContainText(expected, { timeout: 1000 });
  }).toPass();
}

test('~/.secret has a bonsai in its pot that says how old it is', async ({ page }) => {
  await page.goto('/.secret', { waitUntil: 'domcontentloaded' });
  await type(page, 'ls', 'bonsai.txt');
  await type(page, 'cat bonsai.txt', 'it grows a little every day');
  const shell = page.getByTestId('shell');
  await expect(shell).toContainText("'-'                     '-'");
  await expect(shell).toContainText(/day \d+ · (spring|summer|autumn|winter) · planted 2026-10-15/);
});

test('rm -rf: rm refuses like real rm, the site gives in anyway, goes down with a 503, and comes back', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const title = await page.title();
  await type(page, 'rm -rf ~', "rm: cannot remove '/home/remi/about.txt': Permission denied");
  const shell = page.getByTestId('shell');
  // The site's lines are comments under rm's output, not part of it.
  await expect(shell.getByTestId('shell-note').first()).toHaveText("# hmm. that's not allowed, you're a guest here.");
  await expect(shell).toContainText("# ...but if that's what you want...");
  const outage = page.getByTestId('outage');
  await expect(outage.getByRole('heading', { name: '503 Service Unavailable' })).toBeVisible({ timeout: 8000 });
  await expect(page).toHaveTitle('503 Service Unavailable');
  await outage.click();
  await expect(outage).toHaveCount(0);
  await expect(page).toHaveTitle(title);
  await expect(shell).toContainText(RESTORED_NOTE);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  // Headless Chromium has no WebGPU, so this is the fallback: blocks spiral into the middle and come back.
  test('rm -rf pulls the page into the middle of the screen and puts it back', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const shell = page.getByTestId('shell');
    await type(page, 'rm -rf ~', 'Permission denied');
    await expect.poll(async () => (await shell.boundingBox())?.width ?? 0, { timeout: 9000 }).toBeLessThan(5);
    await page.getByTestId('outage').click({ timeout: 8000 });
    await expect(shell).toContainText(RESTORED_NOTE, { timeout: 8000 });
    // Everything is back in place: no script animation is left (the cursor's CSS blink is not one).
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().filter((a) => !(a instanceof CSSAnimation)).length))
      .toBe(0);
    await expect(shell).toHaveCSS('transform', 'none');
  });
});
