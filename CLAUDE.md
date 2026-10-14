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
`app/` routes (`/`, `/projects`, `/projects/[slug]`, `/log`, the 404 in
`not-found.tsx`, and the generated `opengraph-image.tsx`, `icon.tsx`, `apple-icon.tsx`),
`components/` React components, `lib/` non-React logic (Contentful, terminal commands,
OG fonts). `assets/fonts/` holds the font files the generated images need. Tests sit next to the
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
- `main` deploys. The redesign shipped through a stack of PRs into
  `claude/redesign` (now merged); new work goes in small branches with PRs
  straight to `main`.
- Don't require Contentful secrets for build, unit tests or e2e. E2E uses
  `CONTENTFUL_FIXTURES=1`.
- Every command shown on screen must come from `lib/terminal.ts` and be covered
  by the real-shell test in `lib/terminal.test.ts`. Changing a command or its
  output means changing that test in the same PR.
- E2E runs with `reducedMotion: 'reduce'` so assertions never race a fade-in;
  `e2e/terminal.spec.ts` opts back in to check the animation itself.
- Treat a PR as mergeable only when CI is green.

---

## Plan

### Phase 0 — Direction (done)
Design language: **a terminal that shows the engineer who designs.** Visitors
should read "full-stack software engineer with a designer's eye" from the shell
alone.

- **Mono is the system, grotesk is the human.** Everything the machine says
  (navigation, prompts, labels, paths, code, metadata) is JetBrains Mono.
  Everything meant to be read and felt (summaries, intro, case-study prose, card
  titles) is Familjen Grotesk. DotGothic16 (pixel Japanese) is only for the
  樋口 seal and the `# プロジェクト` / `# ログ` tags (shell comments start with `#`, never `//`).
- **Colour:** ink `#07080c` page, panel `#0c0e15` (titlebars `#11141e`), line
  `#232a3b`, text `#dfe3ee`, body `#b4bacb`, muted `#8a91a6`, cyan `#22e5d3`
  (prompt, links, focus), hot `#ff4a2b` (active tab, seal, locked, errors),
  magenta `#ff4fa3` and yellow `#ffd84a` (code colours). All text pairs keep
  ≥ 4.5:1. Hot is only text of 13px and up, or a fill behind ink text.
- **Shape:** 1px lines, no radii, a faint cyan 64px grid on the page, windows
  with a titlebar for code and project cards, a vim-style status line as the
  footer: `remi · main · ~/path` on the left, the social links and © on the right.
- **Every command on screen is real.** Commands and their outputs live in
  `lib/terminal.ts`; `lib/terminal.test.ts` runs every one in a real shell
  against a mirror of the content (`cat about.txt`, `ls -lt featured`,
  `ls -lt featured # プロジェクト`, `cd projects`, `ls -lt`, `cd projects/<folder>`, `cat README.md`,
  `cd .. # go back`, `cd log`, and on the 404
  `cd <path>` with interactive bash's `bash: cd: <path>: No such file or directory`, then
  `cd ~`). Never show a command that
  is not in that test, and never invent flags or output (no `ls --featured`).
  Folder modes are honest too, and the test checks them with `ls -ld`:
  `drwxr-xr-x` (755) for public projects, `drwxr-x---` (750) for locked ones: owner
  rwx, group r-x (the people given access), everyone else nothing. `ls` output is sorted in byte order (C locale).
- **Motion:** each page opens with its command typed out (12ms per character, kept quick so nobody waits; only the home flight takes its time),
  then its output fades in, ending on a fresh prompt with a blinking cursor.
  Pure CSS (`.t-type`, `.t-in`, `.t-cursor` in `globals.css`, timings from
  `schedule()` in `lib/terminal.ts`), no JavaScript, no hydration risk. All text
  is in the DOM from the start, so search engines and screen readers see
  everything. `prefers-reduced-motion` turns every animation off, even the
  cursor blink. Keep `--char` in `globals.css` equal to `TIMING.char`.
  Commands longer than `MAX_TYPED` (36) characters cannot wrap while typing, so they are
  shown already typed and wrap like a terminal line.
- **The working prompt:** every page ends on a prompt the visitor can type into
  (`components/Shell.tsx` → `ShellPrompt.tsx`, logic in `lib/shell.ts`). The visitor is
  `guest@portfolio` (HOME is still `~`), so locked folders (750) refuse them. It knows
  `ls` (-a -A -d -l -t -r -1; `-l` prints GNU's long format with remi as owner and group,
  ext4-style sizes and UTC dates), `cd`, `cat`, `pwd`, `clear` and `#` comments over a virtual copy of
  the site (about.txt, featured/, projects/<folder>/README.md, log/<date>_<title>.md).
  `cd` into a folder with a page opens it. `lib/shell.test.ts` writes the same tree to disk
  and checks every case against interactive bash run as an unprivileged user, with a PATH
  holding only ls and cat. Add a case there for any new command or flag. Unimplemented
  real ls flags say so ("not supported in this shell") rather than faking output.
- **The hidden page:** `/.secret` is the folder `~/.secret`:
  `ls` hides it, `ls -a` / `ls -A` list it, `cd .secret` opens it (the shell tree in
  `lib/shell.ts`, checked against real bash in `lib/shell.test.ts`). The header has a `0 .secret`
  tab before `1 home` that is invisible until hover or keyboard focus (and hidden on phones). It is `noindex` and not
  in any sitemap, but anyone can type the URL; dot-prefixed route folders work in Next 16.
  Its content is a flight home, Stockholm → Tokyo (`components/SecretFlight.tsx`, logic in `lib/flight/`),
  drawn with **vgpu**. A `stockholm → tokyo` window holds the plane on its runway and `[ board ]`; WebGPU,
  every pipeline and the sky's lookup tables warm up as soon as the page loads. Boarding
  (`boarding.wgsl`) runs over a canvas redraw of the page (`snapshot.ts`): its 64px tiles flip like a
  departures board, the plane rolls and takes off as the page tilts into city lights, then flies away
  into the dusk with a contrail. The real sky dissolves in under that shot and the cockpit frame closes in
  from beyond the screen: a physically based sky with volumetric clouds (`lib/flight/atmosphere/`, adapted
  from vgpu's MIT Atmosphere & Clouds example, see its NOTICE.md), stars, aurora, city lights and Fuji,
  driven along the route by `route.ts`, seen through thick windshield glass (edge refraction, dust, wiper
  scratches and frost, `cockpit.wgsl`) under a cyan head-up display. The landing board says おかえり.
  Keep it at about 60 fps on a laptop: measure before raising cloud detail or the render width. Pointer looks around, ← → and the slider move along the route; Esc or reaching Tokyo
  lands: the board flips to `LANDED` and back to the page, which then says it landed. Timings live in
  `timeline.ts`. Read the installed version's docs with `npm exec --no -- vgpu docs …` (never bare
  `npx vgpu`), and validate every changed shader with `npm exec --no -- vgpu check <file>
  --require-validation` (the build does not). Without WebGPU the button says so; reduced motion skips
  straight to a still cockpit. The canvas is `aria-hidden`; the HUD readout and slider are real elements.
- **Kept simple:** a command or two per page, no filters.
- Tailwind note: base element styles (`a`, `body`, focus) live in
  `@layer base`; unlayered CSS would beat utilities such as `text-cyan`. Font
  tokens stay in `@theme inline` (next/font defines its variables on `<body>`).

**Approved mockup:** https://claude.ai/artifact/39NJtQDQLu4SSjsQAgqYGn (home,
mobile, projects with the typing animation, project detail, log, and a System
board). It replaces the earlier paper-and-vermilion mockup
(https://claude.ai/artifact/Cv3eBchkaZCu4XQyWQyJUU), which is kept only for
reference. Project and log copy in the mockup is placeholder; real content
comes from Contentful. The old location and coordinates lines were removed on
purpose; Tokyo → Stockholm now lives only in the home page's flight log (no coordinates).

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
      `@testing-library/jest-dom`; ignore `e2e/`. Deps: jest@30,
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
      Notes: dates in `log.spec.ts` allow a one-day time-zone shift. Pages
      are prerendered at build time, so anything that shows fixtures needs
      `CONTENTFUL_FIXTURES=1` on `npm run build` too (Playwright's
      `webServer.env` does this for the e2e build).

### Phase 4 — Redesign (terminal)
Built on the stacked branches, never merged to `main` until complete.
1. **Foundations:** ✅ terminal tokens, JetBrains Mono / Familjen Grotesk /
   DotGothic16, base styles in `@layer base`, the CSS animation classes.
2. **Shell:** ✅ `Navigation` (seal, `remi@portfolio ~/path` prompt that follows
   the route, numbered tabs with `aria-current`) and `Footer` (the status line).
   Header rule and footer background are full width; content is capped at
   `max-w-7xl`.
3. **Home:** ✅ `cat about.txt` typed, output is the name, role, intro and two
   buttons (`cd projects`, `cd log`); a `tokyo → stockholm` window (`FlightLog`): a plane
   flies a full-width parabolic HND → ARN arc (steady move across plus a quadratic
   rise and fall, tilting with the slope), drawing its contrail, while a
   progress bar, percentage and distance (8170 km) fill, then Stockholm lights up and
   "landed · based in stockholm" appears; CSS only, about 2.4s; `remi@portfolio:~$ ls -lt featured # プロジェクト`
   heads the featured cards, and the working prompt ends the page. The mockup
   headline "Calm tools for a loud world." was not used (unconfirmed copy).
4. **Projects:** ✅ `cd projects` then `ls -lt` are typed. The page is the listing: no
   printed output, `projects/` and the cards fade in, and the working prompt comes
   after the cards. The real-shell test checks
   `ls -lt` lists one folder per card, newest first. `ProjectsTile`
   is shared with the home page; the listing shows three cards per row from 1024px (`threeUp`).
5. **Project detail:** ✅ `cd projects/<folder>` then `cat README.md`; the
   output is the title, summary, a `metadata` window (a label, not a file name, so it
   claims no format; only fields that exist: date, duration, link), the cover, and Contentful rich text styled by
   `.project-page`, all as wide as the cover. `← cd .. # go back` links back to the list
   at the top and bottom.
6. **Log:** ✅ laid out exactly like Projects: `cd log` then `ls -r`, the entries are
   the listing, and the working prompt follows them; first `log/` + `# ログ` + the description, then the
   entries (ISO date, organisation, title, ↗ for links) fade in like the cards.
   Projects and Log must stay structurally identical; `e2e/terminal.spec.ts`
   compares them.
   Project cards are full-height columns with the mode line (`drwxr-xr-x` /
   `drwxr-x---`) pinned to the bottom, so it lines up across a row.
7. **Polish:** ✅ title template (`<page> · Remi Higuchi`), OG/Twitter metadata, a
   terminal-style OG image (the home session as a 1200×630 PNG), the 樋口 seal as favicon
   and touch icon, a terminal 404 (`cd <path>` →
   `bash: cd: <path>: No such file or directory`, header and footer stay in `~`), and a
   read-through at 375 / 768 / 1280 / 1800. Lighthouse: a11y 100 and SEO 100 on every
   route, desktop perf 100. Mobile perf is 79–92 because the typing intro holds back the
   largest paint on purpose.

### Phase 5 — Cleanup
- [x] Remove unused deps/files (`public/*.svg` Next
      boilerplate, `public/lock.png`, `Cursor.tsx`, the default `favicon.ico`).
- [x] Rewrite `README.md` (stack, setup, env vars, testing, deploy) and update
      the Commands table above to "current state".
- [ ] Add `components/*.test.tsx` for non-trivial components.

### Working agreement
- One phase item = one small commit; one logical step = one PR. Phase 1 first,
  merged before any visual work.
- For visual work, use the `frontend-design` skill and verify in a real browser
  (`run` skill / Playwright screenshots at 375, 768, 1280) — type checks don't
  prove a design reads well.
- Update the checkboxes above in the same PR that completes them.
