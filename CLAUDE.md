# Remi Higuchi portfolio — agent guide & plan

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 portfolio. Content
(projects, log) comes from Contentful via `lib/contentful.ts`; with no
`CONTENTFUL_*` env vars the fetchers return empty lists, so the app must still
build and render without secrets (CI relies on this).

> Next.js 16 has breaking changes vs. older versions. Check
> `node_modules/next/dist/docs/` before using a Next API you are unsure about.

This file has two parts: **Conventions** (how to work here, kept current) and
**Plan** (the redesign + tooling roadmap, tick items off as they land).

---

## Conventions

### Where code lives
`app/` routes (`/`, `/projects`, `/projects/[slug]`, `/log`), `components/`
React components, `lib/` non-React logic (Contentful). Tests sit next to the
file they cover (`*.test.ts(x)`); Playwright specs live in `e2e/`.

### Commands
| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Lint (0 warnings) | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` (own server on port 3100; dev server locally, production build when `CI=true`) |
| Format files | `npm run format -- <paths>` |
| Build | `npm run build` |

### Rules
- Every change ships with its tests and docs in the same PR: changed logic →
  Jest test; changed user-visible behaviour/navigation → Playwright test;
  changed scripts/stack/workflow → update this file and README.
- Suppress a lint rule only with a targeted `eslint-disable-next-line` plus a
  reason. Never disable a rule project-wide to get green.
- Never skip or quarantine a test to get CI green.
- The redesign is stacked and must not reach `main` (it deploys) until it is
  complete: `claude/redesign` is the integration branch, each step's PR targets
  the previous step's branch, and the bottom PR targets `claude/redesign`.
  Merge bottom-up; after a PR merges, retarget the next one to
  `claude/redesign`. Only the final `claude/redesign` → `main` PR deploys.
- Don't require Contentful secrets for build, unit tests or e2e. E2E uses
  `CONTENTFUL_FIXTURES=1`.
- Treat a PR as mergeable only when CI is green.

---

## Plan

### Phase 0 — Direction (decide first, then freeze here)
Design language: **simple + bold, with Japanese and Scandinavian restraint.**

- **Simple (Scandinavian):** generous whitespace, one column of thought at a
  time, functional typography, soft natural light, no decoration that doesn't
  carry meaning, calm and legible.
- **Bold:** oversized type, strong contrast, a single confident accent colour,
  big image crops. Boldness comes from scale and contrast, not from effects.
- **Japanese touches:** *ma* (deliberate empty space), asymmetric balance, thin
  rules and a vertical-rhythm grid, a vermilion (shu-iro) "hanko" seal accent,
  small vertical Japanese text (e.g. 東京 → ストックホルム) as a quiet detail,
  paper/sumi tones.

Proposed tokens (adjust in one place, `app/globals.css` `@theme`):
- Colour: paper `#F4F1EA`, sumi ink `#16140F`, mid grey-warm `#8A857A`,
  accent vermilion `#D8431F`; optional dark mode inverts paper/ink.
- Type: one bold grotesk display (e.g. Space Grotesk, already loaded, or Inter
  Tight) at very large sizes + Noto Serif JP / Noto Sans JP for Japanese and
  small accents + a sparse monospace for metadata. Drop Bitcount/DotGothic
  (pixel fonts) — they fight the calm direction.
- Layout: 12-col grid, 8px spacing scale, thin 1px rules, small radii
  (≤ 4px) instead of the current `rounded-4xl` pills/cards.
- Motion: minimal; slow fades/underline reveals; respect
  `prefers-reduced-motion`. The WebGL `Galaxy` background is removed from the
  default theme (heavy, off-direction). Keep or retire the file once the new
  home page ships.

**Approved mockup:** https://claude.ai/artifact/Cv3eBchkaZCu4XQyWQyJUU (home
desktop + mobile, projects, project detail, log). Decisions locked from it:
light-only (no dark mode), pixel fonts and Galaxy fully retired, vermilion
accent, visible-but-small Japanese details (seal 樋口, vertical 東京 →
ストックホルム, 作品). Final tokens: Familjen Grotesk (display/body), IBM Plex
Mono (labels, uppercase 13px), Noto Serif JP (Japanese); extra colours
`#DDD6C7` stone, `#B9C4BD` sage, `#3F3B33` body grey, `#6B665B` muted,
`#B8341A` accent for small text (contrast). Hero headline copy "Calm tools for a
loud world." is a mockup suggestion, confirm before shipping. Project/log copy
in the mockup is placeholder; real content comes from Contentful.

### Phase 1 — Tooling baseline (mirrors `remi-h/micrographics`)
Goal: same quality gate as micrographics, before touching visuals so the
redesign is protected by tests.

- [x] `package.json` scripts: `lint` → `eslint . --max-warnings 0`,
      `typecheck` → `tsc --noEmit`, `test` → `jest`, `test:e2e` →
      `playwright test`, `format` → `prettier --write`.
- [x] ESLint: keep flat config; append `eslint-config-prettier` last; ignore
      `playwright-report/`, `test-results/`, `coverage/`.
- [x] Prettier: `.prettierrc.json` (+ `.prettierignore`) matching the existing
      tree style (the repo is mixed 2/4-space today, so no repo-wide format
      check in CI — same stance as micrographics).
- [x] Jest: `jest.config.mjs` via `next/jest`, `jsdom`, `jest.setup.ts` with
      `@testing-library/jest-dom`; ignore `e2e/`. Deps: jest@29,
      jest-environment-jsdom, @testing-library/react, @testing-library/jest-dom,
      @types/jest.
- [x] Playwright: `playwright.config.ts` (chromium, port 3100,
      `webServer: npm run dev -- --port 3100`, retries + html report on CI,
      optional `PLAYWRIGHT_CHROMIUM_PATH` for sandboxes — pre-installed at
      `/opt/pw-browsers/chromium` in cloud sessions).
- [x] `.gitignore`: add `playwright-report/`, `test-results/`.
- [x] GitHub Actions `.github/workflows/ci.yml`, on `pull_request` and push to
      `main`, `concurrency` cancel-in-progress, Node 22, `npm ci` with cache:
      - `lint` job: `npm run lint`
      - `build-and-unit-test` job: `typecheck`, `build`, `test -- --ci`
      - `e2e-test` job: `npx playwright install --with-deps chromium`,
        `npm run test:e2e` with `CI=true`, upload `playwright-report/` on
        failure
- [x] `.github/workflows/claude-code-review.yml` — copy the micrographics
      workflow (needs repo secret `CLAUDE_CODE_OAUTH_TOKEN`; Remi to add).
- [ ] Optional: Dependabot (npm + actions, weekly) — micrographics does not
      have it, so only if wanted.
- [x] Fix whatever lint/typecheck surfaces in existing code in a separate,
      mechanical commit (no visual changes mixed in).
- [ ] Repo settings (Remi, in GitHub UI): protect `main`, require the three CI
      jobs.

### Phase 2 — Test seams for Contentful
- [x] Unit-test `lib/contentful.ts` (asset map, image resolution, missing-env
      fallback, sorting/featured logic) with `fetch` mocked.
- [x] Add a deterministic fixture mode (e.g. `CONTENTFUL_FIXTURES=1`, or a
      Playwright route mock for `cdn.contentful.com`) so e2e sees stable
      projects/log entries without secrets. Server-component fetches happen on
      the Next server, so prefer the env-var fixture mode over browser
      `page.route`. Set it in `playwright.config.ts` `webServer.env`.
      Implemented as `CONTENTFUL_FIXTURES=1` (data in
      `lib/contentful.fixtures.ts`), set automatically by the Playwright
      `webServer`. Fixtures: Alpha (featured), Beta (not featured), Gamma
      (featured + locked, no slug), two log entries.

### Phase 3 — E2E coverage (written against current UI, kept through redesign)
Use role/text/`data-testid` selectors, not Tailwind classes, so the redesign
doesn't churn tests.
- [x] `navigation.spec.ts`: nav links reach `/`, `/projects`, `/log`; footer
      links (the active-state check moves to Phase 4 step 2, the current nav has none); external links have `rel="noopener noreferrer"`.
- [x] `home.spec.ts`: hero name/role render, featured projects section, "View
      all" → `/projects`.
- [x] `projects.spec.ts`: grid shows fixture projects, card → detail page,
      locked project renders lock state, unknown slug → 404.
- [x] `log.spec.ts`: entries render with formatted dates and links.
- [x] `responsive.spec.ts`: no horizontal overflow at 375px and 1280px on every
      route; nav usable on mobile.
- [x] `a11y.spec.ts`: add `@axe-core/playwright`; zero serious/critical
      violations per route (also guards the colour-contrast of the new palette).
- [x] `reduced-motion.spec.ts`: with `reducedMotion: 'reduce'` nothing animates.
- [ ] Optional later: visual snapshot tests once the design stabilises.
      Notes: e2e runs with `reducedMotion: 'reduce'` by default (the Galaxy
      shader starves CI's software rendering); `reduced-motion.spec.ts`
      overrides it per test. Tests that start on `/` or `/projects` rely on
      that. Dates in `log.spec.ts` allow a one-day time-zone shift.

### Phase 4 — Redesign (each step its own PR, tests green)
1. **Foundations:** ✅ done. Tokens in `globals.css` (`paper`, `ink`, `stone`,
   `sage`, `body`, `muted`, `vermilion`, `vermilion-text`; `font-display`,
   `font-mono`, `font-jp`), fonts in `layout.tsx`, base link and focus styles,
   `!important` link hack removed. Surfaces stay dark and `font-bitcount` is
   an alias of the display font until steps 2-6 migrate the components; flip
   `--background`/`--foreground` to paper/ink in step 3 and delete the alias
   in Phase 5. Font tokens must stay in `@theme inline` (next/font defines its
   variables on `<body>`).
2. **Shell:** ✅ done. `Navigation` is a top header (seal, wordmark,
   Projects / Log, vermilion dot + `aria-current` on the active
   page) and `Footer` is the full-width ink "Say hello." block with social links. The
   header rule and footer background span the full viewport, their content is
   capped at `max-w-7xl`. Both
   inherit the page colour, so they follow the surface flip in step 3. The
   seal uses `vermilion-text` as its fill: paper on `vermilion` is 3.9:1 and
   fails contrast for small text. `Navigatin.tsx` is now `Navigation.tsx`.
3. **Home:** oversized name/role statement, `ma`-heavy hero, featured projects
   as an asymmetric grid with large crops and thin rules; remove Galaxy.
4. **Projects index + tile:** `ProjectsTile` redesign (square corners, caption
   under image, index numbers, hover underline), responsive grid.
5. **Project detail:** reading column (~65ch), big title, meta row
   (date/duration/link), rewrite `.project-page` rich-text styles for the new
   tokens.
6. **Log:** typographic list/table, date column, thin rules.
7. **Polish:** metadata/OG image, favicon, 404 page, reduced-motion pass,
   Lighthouse check (perf ≥ 90, a11y 100).

### Phase 5 — Cleanup
- [ ] Remove unused deps/files (`ogl` if Galaxy goes, `public/*.svg` Next
      boilerplate, `Cursor.tsx` if unused).
- [ ] Rewrite `README.md` (stack, setup, env vars, testing, deploy) and update
      the Commands table above to "current state".
- [ ] Add `components/*.test.tsx` for non-trivial components.

### Working agreement
- One phase item = one small commit; one logical step = one PR. Phase 1 first,
  merged before any visual work.
- For visual work, use the `frontend-design` skill and verify in a real browser
  (`run` skill / Playwright screenshots at 375, 768, 1280) — type checks don't
  prove a design reads well.
- Update the checkboxes above in the same PR that completes them.
