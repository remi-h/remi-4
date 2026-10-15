// The site is a terminal session. Every command shown on screen comes from here, and
// lib/terminal.test.ts runs each of them in a real shell against a mirror of the content,
// so what is displayed is what a shell would actually accept and print.

export const USER_HOST = 'remi@portfolio';

/** Keep in sync with --char in app/globals.css. */
export const TIMING = {
  /** Time to type one character. */
  char: 12,
  /** Wait before the first character of a line is typed. */
  typeDelay: 40,
  /** Wait between finishing a command and its output (or the next prompt). */
  pause: 60,
  /** Wait after output before the next prompt or the final cursor. */
  settle: 80,
  /** Gap between a session's last output and the content that follows it. */
  content: 30,
  /** Gap between consecutive cards or log rows fading in. */
  stagger: 30,
} as const;

/**
 * Longest command that is typed out. A typed line cannot wrap, and after the prompt a 375px
 * screen fits about 38 characters, so longer commands (a long project folder, a 404 path)
 * are shown already typed and wrap like a real terminal line.
 */
export const MAX_TYPED = 36;
export const isTyped = (command: string) => command.length <= MAX_TYPED;

export type ScheduleInput = { command: string; hasOutput: boolean };

type ScheduledStep = {
  promptAt: number;
  typeAt: number;
  outputAt: number;
};

/** When each prompt appears, typing starts and output fades in, in milliseconds. */
export const schedule = (steps: ScheduleInput[]) => {
  let t = 0;
  const scheduled: ScheduledStep[] = steps.map(({ command, hasOutput }) => {
    const promptAt = t;
    const typeAt = promptAt + TIMING.typeDelay;
    const typing = isTyped(command) ? command.length * TIMING.char : 0;
    const outputAt = typeAt + typing + TIMING.pause;
    t = hasOutput ? outputAt + TIMING.settle : outputAt;
    return { promptAt, typeAt, outputAt };
  });
  const last = scheduled[scheduled.length - 1];
  return {
    steps: scheduled,
    /** When the closing prompt with the blinking cursor appears. */
    endAt: t,
    /** When content that follows the session (cards, lists) should start fading in. */
    contentAt: last ? last.outputAt + TIMING.content : 0,
  };
};

/** Quotes a path segment for the shell only when it needs it. */
export const shellQuote = (value: string) =>
  /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** The folder a project lives in: its slug, else its title, else a numbered fallback. */
export const folderName = (project: { slug?: string; title?: string }, index: number) =>
  project.slug || slugify(project.title ?? '') || `project-${String(index + 1).padStart(2, '0')}`;

/**
 * A directory's mode as `ls -l` prints it.
 * Public: owner rwx, group r-x, others r-x (755).
 * Locked: owner rwx, group r-x (the people given access), others nothing (750).
 */
export const FOLDER_MODES = { public: 0o755, locked: 0o750 } as const;
export const folderMode = (locked: boolean) => (locked ? 'drwxr-x---' : 'drwxr-xr-x');

export const commands = {
  about: 'cat about.txt',
  featured: 'ls -lt featured',
  toProjects: 'cd projects',
  toProject: (folder: string) => `cd projects/${shellQuote(folder)}`,
  readme: 'cat README.md',
  parent: 'cd ..',
  back: 'cd .. # go back',
  toLog: 'cd log',
  toSecret: 'cd .secret',
  /** Projects are shown newest first, which is what -t prints; -l adds the modes the cards show. */
  list: 'ls -lt',
  /** Log files are named <date>_<title>, so reverse name order is newest first, like the page. */
  listLog: 'ls -r',
  home: 'cd ~',
  /** `cd` into a path that may not exist, as the 404 page shows it. */
  toPath: (path: string) => `cd ${shellQuote(path)}`,
} as const;

/** What an interactive bash prints when `cd` cannot find the directory. */
export const cdError = (path: string) => `bash: cd: ${path}: No such file or directory`;

/** The path a 404 tried to reach, relative to ~ and decoded, e.g. `projects/nope`. */
export const missingPath = (pathname: string) => {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  try {
    return decodeURIComponent(trimmed) || '.';
  } catch {
    return trimmed;
  }
};

/** The working directory shown in the prompt for a route. */
export const cwdFor = (pathname: string) => (pathname === '/' ? '~' : `~${pathname.replace(/\/$/, '')}`);
