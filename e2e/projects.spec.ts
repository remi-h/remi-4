import { expect, test } from '@playwright/test';

test('the grid lists every fixture project', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const titles = page.getByRole('main').getByRole('heading', { level: 2 });
  await expect(titles).toHaveText(['Fixture Alpha', 'Fixture Gamma', 'Fixture Beta']);
});

test('a project card opens its detail page with title, summary and body', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Fixture Beta/ }).click();
  await expect(page).toHaveURL('/projects/fixture-beta');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Beta' })).toBeVisible();
  await expect(page.getByText('A project that is not featured.')).toBeVisible();
  await expect(page.getByText('Beta body text.')).toBeVisible();
});

test('"cd .." on a project page returns to the list', async ({ page }) => {
  await page.goto('/projects/fixture-alpha', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /cd \.\./ }).click();
  await expect(page).toHaveURL('/projects');
});

test('a locked project shows a lock and has no page to open', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const locked = page.locator('article').filter({ hasText: 'Fixture Gamma' });
  await expect(locked.getByRole('img', { name: 'Locked' })).toBeVisible();
  await expect(locked.getByText('permission denied')).toBeVisible();
  await expect(page.getByRole('link', { name: /Fixture Gamma/ })).toHaveCount(0);
});

test('an unknown project slug is a 404', async ({ page }) => {
  const response = await page.goto('/projects/does-not-exist', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
});

test('a project card looks the same on the home page and the listing', async ({ page }) => {
  const cardMetrics = async (path: string) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const card = page.getByRole('link', { name: /Fixture Alpha/ });
    const title = card.getByRole('heading');
    const art = card.getByTestId('project-art');
    return {
      titleSize: await title.evaluate((el) => getComputedStyle(el).fontSize),
      titleWeight: await title.evaluate((el) => getComputedStyle(el).fontWeight),
      ratio: await art.evaluate((el) => Math.round((el.clientWidth / el.clientHeight) * 100)),
      folder: await card.getByText(/^01_/).innerText(),
    };
  };
  expect(await cardMetrics('/')).toEqual(await cardMetrics('/projects'));
});

test('project pages show the README frontmatter only for fields that exist', async ({ page }) => {
  await page.goto('/projects/fixture-alpha', { waitUntil: 'domcontentloaded' });
  const readme = page
    .getByRole('main')
    .locator('div')
    .filter({ hasText: /^README\.md/ })
    .first();
  await expect(readme).toContainText('date');
  await expect(readme).toContainText('2026-03-01');
  await expect(readme).toContainText('duration');
  await expect(readme).toContainText('3 months');
  await expect(readme).not.toContainText('role');
  await expect(readme).not.toContainText('link');
});

test('the mode line sits at the bottom of every card, even when summaries differ in length', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  // Make the first card's summary much longer than its neighbour's.
  await page
    .getByRole('link', { name: /Fixture Alpha/ })
    .locator('p')
    .evaluate((el) => {
      el.textContent = 'A much longer summary that wraps over several lines to make this card taller. '.repeat(4);
    });

  const cards = page.getByRole('main').locator('a.group, article.group');
  const rows = await cards.evaluateAll((els) =>
    els.map((el) => {
      const card = el.getBoundingClientRect();
      const mode = (el.querySelector('[data-testid="project-mode"]') as HTMLElement).getBoundingClientRect();
      return { top: Math.round(card.top), gap: Math.round(card.bottom - mode.bottom), modeTop: Math.round(mode.top) };
    }),
  );
  // Every mode line is the same distance from its card's bottom edge...
  expect(new Set(rows.map((r) => r.gap)).size).toBe(1);
  // ...so cards on the same row have their mode lines at the same height.
  const firstRow = rows.filter((r) => r.top === rows[0].top);
  expect(firstRow.length).toBeGreaterThan(1);
  expect(new Set(firstRow.map((r) => r.modeTop)).size).toBe(1);
});
