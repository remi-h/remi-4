import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  // The dev server compiles each route on first visit, which can exceed the 5s default.
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The home page's WebGL background is too heavy for CI's software rendering and starves clicks.
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Optional override for sandboxes with a pre-installed Chromium build that
          // doesn't match the pinned @playwright/test version. Unset in CI, where
          // `npx playwright install --with-deps chromium` provides a matching binary.
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
        },
      },
    },
  ],
  webServer: {
    // CI tests the production build: the dev server compiles each route on first visit,
    // which made navigation tests time out on the slower runners.
    command: process.env.CI ? `npm run build && npm run start -- --port ${PORT}` : `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { CONTENTFUL_FIXTURES: '1' },
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 300_000 : 120_000,
  },
});
