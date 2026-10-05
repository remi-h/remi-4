import { expect, test } from '@playwright/test';
import { fixtureProjects } from '../lib/contentful.fixtures';
import { commands, folderName, lsAll } from '../lib/terminal';

// Featured first, as the pages order them.
const ordered = [...fixtureProjects].sort(
  (a, b) => Number(Boolean(b.fields.featured)) - Number(Boolean(a.fields.featured)),
);
const folders = ordered.map((p, i) => folderName({ slug: p.fields.slug, title: p.fields.title }, i));

test('/projects types "cd projects" then "ls -a" and lists exactly what ls -a would print', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  const main = page.getByRole('main');

  await expect(main.getByText(commands.toProjects, { exact: true })).toHaveCount(1);
  await expect(main.getByText(commands.listAll, { exact: true })).toHaveCount(1);
  await expect(main.locator('li').filter({ hasText: /^\.{1,2}$|^[a-z]/ })).toHaveText(lsAll(folders));

  // The prompt shows where each command ran.
  await expect(main.getByText('remi@portfolio:~$').first()).toBeVisible();
  await expect(main.getByText('remi@portfolio:~/projects$').first()).toBeVisible();
});

test('/projects lists a folder for every card', async ({ page }) => {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  for (const [i, folder] of folders.entries()) {
    await expect(page.getByText(`${String(i + 1).padStart(2, '0')}_${folder}/`)).toBeVisible();
  }
});

test('home types "cat about.txt" and heads the featured list with "ls -t featured"', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(commands.about, { exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: new RegExp(commands.featured) })).toBeVisible();
});

test('/log types "cat log.txt" and its output is the entries', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(commands.log, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(2);
});

test('a project page types "cd projects/<folder>" then "cat README.md"', async ({ page }) => {
  await page.goto('/projects/fixture-alpha', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(commands.toProject('fixture-alpha'), { exact: true })).toHaveCount(1);
  await expect(page.getByText(commands.readme, { exact: true })).toHaveCount(1);
  await expect(page.getByText('remi@portfolio:~/projects/fixture-alpha$').first()).toBeVisible();
});

test.describe('without a motion preference', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the intro animates, keeps all text in the page, and ends on a blinking cursor', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });

    // Animations are running, yet every command and listing is already in the DOM.
    expect(await page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
    await expect(page.getByText(commands.listAll, { exact: true })).toHaveCount(1);
    await expect(page.getByText('fixture-alpha', { exact: true })).toHaveCount(1);

    // After the intro only the cursor's blink is still running.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            document
              .getAnimations()
              .filter((a) => a.playState === 'running')
              .map((a) => (a as CSSAnimation).animationName),
          ),
        { timeout: 10_000 },
      )
      .toEqual(['t-blink']);
  });

  test('the typed command grows character by character', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'commit' });
    const command = page.locator('.t-type').first();
    await command.waitFor({ state: 'attached' });
    const widths = await page.evaluate(async () => {
      const el = document.querySelector('.t-type') as HTMLElement;
      const samples: number[] = [];
      for (let i = 0; i < 12; i++) {
        samples.push(el.getBoundingClientRect().width);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      return samples;
    });
    // Starts narrower than it ends, and never shrinks.
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths));
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
  });
});
