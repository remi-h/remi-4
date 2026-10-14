import { expect, test } from '@playwright/test';

test('the grid lists every fixture project, newest first', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const titles = page.getByRole('main').getByRole('heading', { level: 2 });
  await expect(titles).toHaveText(['Fixture Alpha', 'Fixture Beta', 'Fixture Gamma']);
});

test('a project card opens its detail page with title, summary and body', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Fixture Beta/ }).click();
  await expect(page).toHaveURL('/projects/fixture-beta');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Beta' })).toBeVisible();
  await expect(page.getByText('A project that is not featured.')).toBeVisible();
  await expect(page.getByText('Beta body text.')).toBeVisible();
});

for (const which of ['first', 'last'] as const) {
  test(`"cd .. # go back" at the ${which === 'first' ? 'top' : 'bottom'} of a project page returns to the list`, async ({
    page,
  }) => {
    await page.goto('/projects/fixture-alpha', { waitUntil: 'domcontentloaded' });
    const links = page.getByRole('link', { name: '← cd .. # go back' });
    await expect(links).toHaveCount(2);
    await links[which]().click();
    await expect(page).toHaveURL('/projects');
  });
}

test('the facts window is labelled metadata and the text spans the cover width', async ({ page }) => {
  await page.goto('/projects/fixture-alpha', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('metadata', { exact: true })).toBeVisible();
  const main = await page.getByRole('main').boundingBox();
  const body = await page.getByText('Alpha body text.').boundingBox();
  // The body runs the full width of the column, like the cover image.
  expect(body!.width).toBeGreaterThan(main!.width - 100);
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

test('the metadata window lists only the fields that exist', async ({ page }) => {
  await page.goto('/projects/fixture-alpha', { waitUntil: 'domcontentloaded' });
  const metadata = page.getByTestId('project-metadata');
  await expect(metadata.locator('dt')).toHaveText(['date', 'duration']);
  await expect(metadata.locator('dd')).toHaveText(['2026-03-01', '3 months']);
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

test.describe('on a laptop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('/projects shows three cards in a row', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    const tops = await page
      .getByTestId('project-grid')
      .locator(':scope > *')
      .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    expect(tops).toHaveLength(3);
    expect(new Set(tops).size).toBe(1);
  });
});
