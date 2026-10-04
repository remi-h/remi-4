import { expect, test } from '@playwright/test';

test('colour tokens are available as CSS variables', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ['--color-paper', '--color-ink', '--color-vermilion'].map((name) => style.getPropertyValue(name).trim());
  });
  expect(tokens).toEqual(['#f4f1ea', '#16140f', '#d8431f']);
});

test('font utilities resolve to the new font families', async ({ page }) => {
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
    return { display: probe('font-display'), mono: probe('font-mono'), jp: probe('font-jp') };
  });
  expect(families.display).toMatch(/Familjen Grotesk/i);
  expect(families.mono).toMatch(/IBM Plex Mono/i);
  expect(families.jp).toMatch(/Noto Serif JP/i);
});

test('body text uses the display font, not the old pixel or Space Grotesk fonts', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toMatch(/Familjen Grotesk/i);
  expect(family).not.toMatch(/Space Grotesk|Bitcount|DotGothic/i);
});

test('links inherit their colour instead of forcing one', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const link = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log' });
  const [linkColor, parentColor] = await link.evaluate((el) => [
    getComputedStyle(el).color,
    getComputedStyle(el.parentElement as HTMLElement).color,
  ]);
  expect(linkColor).toBe(parentColor);
});

test('keyboard focus shows a vermilion outline', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element);
    return { width: style.outlineWidth, color: style.outlineColor };
  });
  expect(outline.width).toBe('2px');
  expect(outline.color).toBe('rgb(216, 67, 31)');
});
