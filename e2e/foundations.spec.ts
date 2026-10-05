import { expect, test } from '@playwright/test';

test('colour tokens are available as CSS variables', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ['--color-ink', '--color-cyan', '--color-hot', '--color-magenta', '--color-yellow'].map((name) =>
      style.getPropertyValue(name).trim(),
    );
  });
  expect(tokens).toEqual(['#07080c', '#22e5d3', '#ff4a2b', '#ff4fa3', '#ffd84a']);
});

test('font utilities resolve to the terminal fonts', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const families = await page.evaluate(() => {
    const probe = (className: string) => {
      const el = document.createElement('span');
      el.className = className;
      document.body.append(el);
      const family = getComputedStyle(el).fontFamily;
      el.remove();
      return family;
    };
    return { mono: probe('font-mono'), grotesk: probe('font-grotesk'), jp: probe('font-jp') };
  });
  expect(families.mono).toMatch(/JetBrains Mono/i);
  expect(families.grotesk).toMatch(/Familjen Grotesk/i);
  expect(families.jp).toMatch(/DotGothic16/i);
});

test('mono is the system font and grotesk carries the prose', async ({ page }) => {
  await page.goto('/projects/fixture-alpha', { waitUntil: 'domcontentloaded' });
  const family = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(await family('body')).toMatch(/JetBrains Mono/i);
  expect(await family('h1')).toMatch(/JetBrains Mono/i);
  expect(await family('.project-page')).toMatch(/Familjen Grotesk/i);
  expect(await family('body')).not.toMatch(/IBM Plex|Space Grotesk|Bitcount/i);
});

test('links without a colour class inherit their colour', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const link = page.getByRole('banner').getByRole('link', { name: 'Remi Higuchi' });
  const [linkColor, parentColor] = await link.evaluate((el) => [
    getComputedStyle(el).color,
    getComputedStyle(el.parentElement as HTMLElement).color,
  ]);
  expect(linkColor).toBe(parentColor);
});

test('keyboard focus shows a cyan outline', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element);
    return { width: style.outlineWidth, color: style.outlineColor };
  });
  expect(outline.width).toBe('2px');
  expect(outline.color).toBe('rgb(34, 229, 211)');
});
