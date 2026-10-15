# Remi Higuchi, portfolio

The portfolio of Remi Higuchi, Experience Designer & Software Engineer. It is laid out as a
terminal session: every page opens with a real shell command typed out, then its output,
and ends on a prompt visitors can type into (`ls`, `cd`, `cat`, `pwd`, `clear`).

## Stack

- [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript
- Tailwind CSS v4, fonts through `next/font` (JetBrains Mono, Familjen Grotesk, DotGothic16)
- Content (projects, log) from [Contentful](https://www.contentful.com)
- OG image and icons generated at build time with `next/og`
- WebGPU on the hidden `/.secret` page with [vgpu](https://www.npmjs.com/package/vgpu): a flight from Stockholm to Tokyo, with a physically based sky adapted from vgpu's Atmosphere & Clouds example (MIT, see `lib/flight/atmosphere/NOTICE.md`), and in `/.secret/card` a holographic business card (`lib/card/`, diffraction from vgpu's Holographic Card example, see `lib/card/NOTICE.md`). `.wgsl` files are prepared at build time by `@vgpu/wgsl` (the `turbopack.rules` entry in `next.config.ts`). Check a shader on a real device with `npm exec --no -- vgpu check <file.wgsl> --require-validation`
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
| Unused code, duplication, complexity | `npm run fallow` |
| Build | `npm run build` |

`npm run fallow` runs [fallow](https://fallow.tools/docs/) (config in `.fallowrc.json`): it fails on any
unused file, export or dependency and on copy-paste duplication, and on complexity beyond the committed
baseline in `fallow-baselines/health.json`. Paid down some complexity? Re-save the baseline with
`npx fallow health --save-baseline fallow-baselines/health.json` so it only ratchets down.

### Flight tools

For working on the `/.secret` flight (`scripts/flight/`, output in `tmp/flight/`, which is ignored):

| Task | Command |
| --- | --- |
| Render the cockpit view at points along the route, headless | `npm run flight:sky -- --at 0.35,0.86` |
| Combine renders or screenshots into one image | `npm run flight:sheet -- a.png b.png` |
| Frame rate at dusk, night and sunrise, in Chrome | `npm run flight:bench -- --url <url>` |
| Screenshots of the boarding sequence at given seconds | `npm run flight:capture -- --at 5,10` |

The Chrome tools default to `http://localhost:3000/.secret`. Measure frame rate against a production
build (`npm run build && npx next start -p 3200`, then `--url http://localhost:3200/.secret`): the dev
server is much slower and reloads while files change.

`npm run test:e2e` starts its own server on port 3100 with `CONTENTFUL_FIXTURES=1`: the dev
server locally, a production build when `CI=true`. Set `PLAYWRIGHT_CHROMIUM_PATH` to use a
Chromium that is already installed.

## Project layout

```
app/          routes: /, /projects, /projects/[slug], /log, the 404, OG image and icons
components/   React components (Navigation, Footer, TerminalSession, ProjectsTile, ...)
lib/          Contentful client and fixtures, terminal commands and timing, OG fonts, WebGPU shaders
e2e/          Playwright specs
assets/fonts/ font files for the generated images
```

## The commands are real

Every command shown on screen comes from `lib/terminal.ts`, and `lib/terminal.test.ts` runs
each one in a real shell against a mirror of the site's content. That includes the folder
modes (`drwxr-xr-x` for public projects, `drwxr-x---` for locked ones) and the 404's
`bash: cd: <path>: No such file or directory`. To change a command or its output, change
that test too.

The working prompt (`lib/shell.ts`) runs over a virtual copy of the site. `lib/shell.test.ts`
writes that copy to disk and compares every supported command with interactive bash, run as
an unprivileged user so locked folders really refuse it.

## CI and deploy

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck + build + unit tests, and
the Playwright suite on every pull request and on `main`. Claude Code reviews pull requests
(`.github/workflows/claude-code-review.yml`). Vercel deploys `main`.

See `CLAUDE.md` for conventions and the design system.
