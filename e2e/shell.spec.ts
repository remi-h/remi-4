import { expect, test } from '@playwright/test';

const prompt = (page: import('@playwright/test').Page) => page.getByRole('textbox', { name: 'Type a command' });

const type = async (page: import('@playwright/test').Page, line: string) => {
  // Typing before hydration would submit the form natively instead of running the command.
  await expect(page.getByTestId('shell')).toHaveAttribute('data-ready', 'true');
  await prompt(page).fill(line);
  await prompt(page).press('Enter');
};

for (const path of ['/', '/projects', '/projects/fixture-alpha', '/log', '/.secret', '/.secret/card', '/nope']) {
  test(`${path} ends on a working prompt`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(prompt(page)).toBeVisible();
    await expect(page.getByTestId('shell')).toContainText('guest@portfolio:');
  });
}

test('the prompt answers like bash: listing, reading, and refusing locked folders', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const shell = page.getByTestId('shell');

  await type(page, 'ls');
  await expect(shell).toContainText('about.txt');
  await expect(shell).toContainText('projects');

  await type(page, 'cat about.txt');
  await expect(shell).toContainText('Software Engineer & Designer');

  await type(page, 'ls -l projects');
  await expect(shell).toContainText('drwxr-x--- 2 remi remi 4096');
  await expect(shell).toContainText('fixture-gamma');

  await type(page, 'cd projects/fixture-gamma');
  await expect(shell).toContainText('bash: cd: projects/fixture-gamma: Permission denied');

  await type(page, 'sudo');
  await expect(shell).toContainText('bash: sudo: command not found');

  await type(page, 'clear');
  await expect(shell).not.toContainText('about.txt');
});

test('cd opens the page for a folder, and the new page ends on a prompt there', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await type(page, 'cd projects');
  await expect(page).toHaveURL('/projects');
  await expect(page.getByTestId('shell')).toContainText('guest@portfolio:~/projects$');

  await type(page, 'cd fixture-alpha');
  await expect(page).toHaveURL('/projects/fixture-alpha');

  await type(page, 'cd ../../log');
  await expect(page).toHaveURL('/log');

  await type(page, 'cd');
  await expect(page).toHaveURL('/');
});

test('the arrow keys bring back earlier commands', async ({ page }) => {
  await page.goto('/log', { waitUntil: 'domcontentloaded' });
  await type(page, 'pwd');
  await type(page, 'ls');
  await prompt(page).press('ArrowUp');
  await expect(prompt(page)).toHaveValue('ls');
  await prompt(page).press('ArrowUp');
  await expect(prompt(page)).toHaveValue('pwd');
  await prompt(page).press('ArrowDown');
  await expect(prompt(page)).toHaveValue('ls');
});
