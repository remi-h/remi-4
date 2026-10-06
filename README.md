# Remi Higuchi, portfolio

The portfolio of Remi Higuchi, Experience Designer & Software Engineer. It is laid out as a
terminal session: every page opens with a real shell command typed out, then its output.

## Stack

- [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript
- Tailwind CSS v4, fonts through `next/font` (JetBrains Mono, Familjen Grotesk, DotGothic16)
- Content (projects, log) from [Contentful](https://www.contentful.com)
- OG image and icons generated at build time with `next/og`
- Jest + Testing Library for unit tests, Playwright + axe for end-to-end tests
- Deployed on Vercel from `main`

## Getting started

```bash
npm ci
npm run dev        # http://localhost:3000
```

Without Contentful credentials the site still builds and runs, with empty project and log
lists. To see sample content, run with fixtures:

```bash
CONTENTFUL_FIXTURES=1 npm run dev
```

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `CONTENTFUL_SPACE_ID` | for real content | none | Contentful space |
| `CONTENTFUL_DELIVERY_TOKEN` | for real content | none | Content Delivery API token |
| `CONTENTFUL_ENVIRONMENT` | no | `master` | Contentful environment |
| `CONTENTFUL_PROJECT_CONTENT_TYPE` | no | `project` | Content type for projects |
| `CONTENTFUL_LOG_CONTENT_TYPE` | no | `log` | Content type for log entries |
| `CONTENTFUL_FIXTURES` | no | unset | `1` uses `lib/contentful.fixtures.ts` instead of Contentful (tests use this) |

## Scripts

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Lint (0 warnings) | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` |
| Format files | `npm run format -- <paths>` |
| Build | `npm run build` |

`npm run test:e2e` starts its own server on port 3100 with `CONTENTFUL_FIXTURES=1`: the dev
server locally, a production build when `CI=true`. Set `PLAYWRIGHT_CHROMIUM_PATH` to use a
Chromium that is already installed.

## Project layout

```
app/          routes: /, /projects, /projects/[slug], /log, the 404, OG image and icons
components/   React components (Navigation, Footer, TerminalSession, ProjectsTile, ...)
lib/          Contentful client and fixtures, terminal commands and timing, OG fonts
e2e/          Playwright specs
assets/fonts/ font files for the generated images
```

## The commands are real

Every command shown on screen comes from `lib/terminal.ts`, and `lib/terminal.test.ts` runs
each one in a real shell against a mirror of the site's content. That includes the folder
modes (`drwxr-xr-x` for public projects, `drwxr-x---` for locked ones) and the 404's
`bash: cd: <path>: No such file or directory`. To change a command or its output, change
that test too.

## CI and deploy

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck + build + unit tests, and
the Playwright suite on every pull request and on `main`. Claude Code reviews pull requests
(`.github/workflows/claude-code-review.yml`). Vercel deploys `main`.

See `CLAUDE.md` for conventions and the design system.
