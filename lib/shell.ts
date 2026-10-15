// The working prompt at the end of each page: a tiny shell over a virtual copy of the site.
// lib/shell.test.ts writes the same tree to disk and runs every supported command through
// real bash, so what this prints is what bash and GNU coreutils print.
import { FOLDER_MODES, folderName, slugify } from './terminal';

/** Who types at the working prompt: a visitor, so locked folders (750) are closed to them. */
export const GUEST_HOST = 'guest@portfolio';
/** The visitor's HOME points at the portfolio, so `~` is the same place as in Remi's prompt. */
export const HOME = '/home/remi';

export const ABOUT = {
  name: 'Remi Higuchi',
  role: 'Experience Designer & Software Engineer',
  intro:
    'I enjoy shaping experiences at the intersection of design and technology, and collaborating across disciplines to turn complexity into something intuitive and human.',
} as const;

export type ShellFile = { type: 'file'; content: string; mtime: number };
export type ShellDir = { type: 'dir'; mode: number; mtime: number; children: Record<string, ShellNode> };
export type ShellNode = ShellFile | ShellDir;

export type ShellProject = {
  title?: string;
  slug?: string;
  summary?: string;
  date?: string;
  featured?: boolean;
  lock?: boolean;
};
export type ShellLog = { title?: string; org?: string; link?: string; date?: string };

const time = (date?: string) => {
  const t = date ? Date.parse(date) : NaN;
  return Number.isNaN(t) ? 0 : Math.floor(t / 1000);
};

const file = (content: string, mtime = 0): ShellFile => ({ type: 'file', content, mtime });
const dir = (children: Record<string, ShellNode>, mode: number = FOLDER_MODES.public, mtime = 0): ShellDir => ({
  type: 'dir',
  mode,
  mtime,
  children,
});

export const aboutTxt = () => `${ABOUT.name}\n${ABOUT.role}\n\n${ABOUT.intro}\n`;
const readmeFor = (project: ShellProject) =>
  `# ${project.title ?? 'Untitled'}\n${project.summary ? `\n${project.summary}\n` : ''}`;
/** Log entries have no file names on the page; in the shell each is `<date>_<title>.md`. */
export const logFileName = (log: ShellLog) => `${log.date ?? 'undated'}_${slugify(log.title ?? '') || 'entry'}.md`;
const logContent = (log: ShellLog) =>
  `# ${log.title ?? 'Untitled'}\n\n${[log.org, log.link].filter(Boolean).join('\n')}\n`;

/** A folder's last change is its newest entry's, as on disk once its files are written. */
const newest = (children: Record<string, ShellNode>) =>
  Math.max(0, ...Object.values(children).map((child) => child.mtime));

/** Projects in page order (newest first), as the cards and their folder names use them. */
export const buildTree = (projects: ShellProject[], logs: ShellLog[]): ShellDir => {
  const projectDirs: Record<string, ShellNode> = {};
  const featured: Record<string, ShellNode> = {};
  projects.forEach((project, index) => {
    const name = folderName(project, index);
    const mode = project.lock ? FOLDER_MODES.locked : FOLDER_MODES.public;
    const mtime = time(project.date);
    projectDirs[name] = dir({ 'README.md': file(readmeFor(project), mtime) }, mode, mtime);
    if (project.featured) featured[name] = dir({}, mode, mtime);
  });
  const logFiles = Object.fromEntries(logs.map((log) => [logFileName(log), file(logContent(log), time(log.date))]));
  const folders = {
    featured: dir(featured, FOLDER_MODES.public, newest(featured)),
    log: dir(logFiles, FOLDER_MODES.public, newest(logFiles)),
    projects: dir(projectDirs, FOLDER_MODES.public, newest(projectDirs)),
  };
  const updated = newest(folders);
  // A hidden page: ls only shows it with -a or -A, and cd opens it.
  return dir(
    { 'about.txt': file(aboutTxt(), updated), '.secret': dir({}, FOLDER_MODES.public, updated), ...folders },
    FOLDER_MODES.public,
    updated,
  );
};

/** A directory's entry by name. Own keys only, so names like `constructor` are just missing. */
const childOf = (node: ShellDir, name: string): ShellNode | undefined =>
  Object.hasOwn(node.children, name) ? node.children[name] : undefined;

/** The page a directory has, if any. */
export const routeFor = (path: string[], tree: ShellDir) => {
  if (path.length === 0) return '/';
  if (path.length === 1 && (path[0] === 'projects' || path[0] === 'log' || path[0] === '.secret')) return `/${path[0]}`;
  if (path.length === 2 && path[0] === 'projects') {
    const node = tree.children.projects;
    const project = node?.type === 'dir' ? childOf(node, path[1]) : undefined;
    return project?.type === 'dir' && project.mode === FOLDER_MODES.public ? `/projects/${path[1]}` : null;
  }
  return null;
};

/** The shell path (relative to ~) for a route, e.g. /projects/alpha → ['projects', 'alpha']. */
export const pathForRoute = (pathname: string) => pathname.split('/').filter(Boolean).map(decodeURIComponent);

export const displayCwd = (path: string[]) => (path.length ? `~/${path.join('/')}` : '~');

/** Splits a command line into words, honouring single and double quotes and # comments. */
export const tokenize = (line: string) => {
  const words: string[] = [];
  let word = '';
  let inWord = false;
  let quote: string | null = null;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else word += ch;
    } else if (ch === '#' && !inWord) {
      break; // a comment runs to the end of the line
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      inWord = true;
    } else if (/\s/.test(ch)) {
      if (inWord) words.push(word);
      word = '';
      inWord = false;
    } else {
      word += ch;
      inWord = true;
    }
  }
  if (inWord) words.push(word);
  return words;
};

// Others (the guest) may read a directory's listing with r and enter it with x.
const canRead = (node: ShellDir) => (node.mode & 0o004) !== 0;
const canEnter = (node: ShellDir) => (node.mode & 0o001) !== 0;

type Resolved = { node: ShellNode; path: string[] } | { error: 'missing' | 'notdir' | 'denied' };

/** Resolves an argument against the cwd, following . .. and ~ like the kernel does. */
const resolve = (tree: ShellDir, cwd: string[], arg: string): Resolved => {
  const parts = arg.split('/');
  let path: string[] = [];
  if (arg.startsWith('/')) {
    // Only $HOME exists in this shell; anything else under / is missing.
    const rest = arg.split('/').filter(Boolean);
    const home = HOME.split('/').filter(Boolean);
    if (rest.length < home.length || home.some((p, i) => rest[i] !== p)) return { error: 'missing' };
    parts.splice(0, parts.length, ...rest.slice(home.length));
  } else if (parts[0] === '~') {
    parts.shift();
  } else {
    path = [...cwd];
  }
  // The page decides where the prompt starts; if that folder is not in the tree, nothing
  // below it can be found either.
  const walk = (to: string[]) => {
    let at: ShellNode | undefined = tree;
    for (const p of to) at = at?.type === 'dir' ? childOf(at, p) : undefined;
    return at;
  };
  const start = walk(path);
  if (!start) return { error: 'missing' };
  let node: ShellNode = start;
  for (const [i, part] of parts.entries()) {
    if (part === '' || part === '.') {
      if (node.type !== 'dir') return { error: 'notdir' };
      continue;
    }
    if (node.type !== 'dir') return { error: 'notdir' };
    if (!canEnter(node)) return { error: 'denied' };
    if (part === '..') {
      path = path.slice(0, -1);
      node = walk(path) ?? tree;
      continue;
    }
    const child = childOf(node, part);
    if (!child) return { error: 'missing' };
    // A trailing slash on a file is "Not a directory".
    if (child.type === 'file' && i < parts.length - 1) return { error: 'notdir' };
    node = child;
    path = [...path, part];
  }
  return { node, path };
};

/** The `~/…` path bash's `cd -L` would try for an argument, with . and .. applied as text. */
const logicalPath = (cwd: string[], arg: string) => {
  let parts: string[];
  if (arg.startsWith('/')) {
    const home = HOME.split('/').filter(Boolean);
    const rest = arg.split('/').filter(Boolean);
    // Anything outside $HOME does not exist in this shell.
    if (rest.length < home.length || home.some((p, i) => rest[i] !== p)) return arg;
    parts = rest.slice(home.length);
  } else if (arg === '~' || arg.startsWith('~/')) {
    parts = arg.split('/').slice(1);
  } else {
    parts = [...cwd, ...arg.split('/')];
  }
  const path: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') path.pop();
    else path.push(part);
  }
  return ['~', ...path].join('/');
};

export type ShellResult = { output: string[]; cwd: string[]; clear?: boolean };

const sortEntries = (entries: [string, ShellNode][], byTime: boolean) =>
  [...entries].sort(([a, na], [b, nb]) => {
    if (byTime && na.mtime !== nb.mtime) return nb.mtime - na.mtime;
    return a < b ? -1 : a > b ? 1 : 0; // C locale: byte order
  });

// Every short option GNU ls accepts. This shell implements a few; the rest say so plainly
// instead of pretending to be invalid.
const GNU_LS_FLAGS = 'aAbBcCdDfFgGhHiIkLlmnNopqQrRsStTuUvwxXZ1';
const HINT = '-a, -A, -d, -l, -t, -r';

/** Owner and group shown by `ls -l`: Remi owns the portfolio. */
export type ShellUser = { owner: string; group: string };
const REMI: ShellUser = { owner: 'remi', group: 'remi' };

const FILE_MODE = 0o644;
// The portfolio sits on an ext4-like disk: folders take one 4 KiB block, files whole blocks.
const BLOCK = 4096;
const sizeOf = (node: ShellNode) => (node.type === 'dir' ? BLOCK : new TextEncoder().encode(node.content).length);
const blocksOf = (node: ShellNode) => (Math.ceil(sizeOf(node) / BLOCK) * BLOCK) / 1024;
const linksOf = (node: ShellNode) =>
  node.type === 'dir' ? 2 + Object.values(node.children).filter((c) => c.type === 'dir').length : 1;

const modeString = (node: ShellNode) => {
  const mode = node.type === 'dir' ? node.mode : FILE_MODE;
  const bits = [6, 3, 0].map((shift) => {
    const m = (mode >> shift) & 7;
    return `${m & 4 ? 'r' : '-'}${m & 2 ? 'w' : '-'}${m & 1 ? 'x' : '-'}`;
  });
  return `${node.type === 'dir' ? 'd' : '-'}${bits.join('')}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** GNU ls's date column (UTC, C locale): the time within the last six months, else the year. */
const dateString = (mtime: number, now: number) => {
  const d = new Date(mtime * 1000);
  const day = String(d.getUTCDate()).padStart(2, ' ');
  const recent = mtime > now - 31556952 / 2 && mtime <= now;
  const tail = recent
    ? `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
    : ` ${d.getUTCFullYear()}`;
  return `${MONTHS[d.getUTCMonth()]} ${day} ${tail}`;
};

/** `ls -l` lines for a group of entries, with columns padded across the group like GNU ls. */
const longLines = (entries: [string, ShellNode][], user: ShellUser, now: number, alsoFits: ShellNode[] = []) => {
  const fit = alsoFits.map((node) => ({ links: String(linksOf(node)), size: String(sizeOf(node)) }));
  const rows = entries.map(([name, node]) => ({
    mode: modeString(node),
    links: String(linksOf(node)),
    size: String(sizeOf(node)),
    date: dateString(node.mtime, now),
    name,
  }));
  const width = (key: 'links' | 'size') => Math.max(0, ...[...rows, ...fit].map((r) => r[key].length));
  const [links, size] = [width('links'), width('size')];
  return rows.map(
    (r) =>
      `${r.mode} ${r.links.padStart(links)} ${user.owner} ${user.group} ${r.size.padStart(size)} ${r.date} ${r.name}`,
  );
};

const ls = (tree: ShellDir, cwd: string[], args: string[], user: ShellUser, now: number): string[] => {
  let all = false;
  let long = false;
  let directory = false;
  let almostAll = false;
  let byTime = false;
  let reverse = false;
  const targets: string[] = [];
  // GNU long options for the flags this shell has; any other long option says so.
  const LONG: Record<string, string> = { all: 'a', 'almost-all': 'A', reverse: 'r', directory: 'd' };
  let optionsDone = false;
  for (const arg of args) {
    if (!optionsDone && arg === '--') {
      optionsDone = true;
    } else if (!optionsDone && arg.startsWith('--')) {
      const flag = LONG[arg.slice(2)];
      if (!flag) return [`ls: ${arg} is not supported in this shell (try ${HINT})`];
      if (flag === 'a') all = true;
      else if (flag === 'A') almostAll = true;
      else if (flag === 'd') directory = true;
      else reverse = true;
    } else if (!optionsDone && arg.startsWith('-') && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === 'a') all = true;
        else if (flag === 'A') almostAll = true;
        else if (flag === 't') byTime = true;
        else if (flag === 'r') reverse = true;
        else if (flag === 'l') long = true;
        else if (flag === 'd') directory = true;
        else if (flag === '1') continue;
        else if (GNU_LS_FLAGS.includes(flag)) return [`ls: -${flag} is not supported in this shell (try ${HINT})`];
        else return [`ls: invalid option -- '${flag}'`, "Try 'ls --help' for more information."];
      }
    } else targets.push(arg);
  }
  const order = (entries: [string, ShellNode][]) => {
    const sorted = sortEntries(entries, byTime);
    return reverse ? sorted.reverse() : sorted;
  };
  const show = (entries: [string, ShellNode][], alsoFits: ShellNode[] = []) =>
    long ? longLines(entries, user, now, alsoFits) : entries.map(([name]) => name);
  const list = (node: ShellDir, path: string[]) => {
    // Names starting with a dot are hidden unless -a or -A asks for them.
    let entries = Object.entries(node.children).filter(([name]) => all || almostAll || !name.startsWith('.'));
    if (all && !almostAll) {
      const parent = resolve(tree, path, '..');
      entries = [['.', node], ['..', 'node' in parent ? parent.node : node], ...entries];
    }
    const sorted = order(entries);
    const total = long ? [`total ${sorted.reduce((sum, [, child]) => sum + blocksOf(child), 0)}`] : [];
    return [...total, ...show(sorted)];
  };
  const names = targets.length ? targets : ['.'];
  const errors: string[] = [];
  const files: [string, ShellNode][] = [];
  const dirs: { name: string; lines: string[] }[] = [];
  // GNU ls sizes the columns of file arguments over every argument it stat'ed, folders too.
  const statted: ShellNode[] = [];
  for (const name of names) {
    const found = resolve(tree, cwd, name);
    if (!('node' in found)) {
      errors.push(
        found.error === 'denied'
          ? `ls: cannot access '${name}': Permission denied`
          : found.error === 'notdir'
            ? `ls: cannot access '${name}': Not a directory`
            : `ls: cannot access '${name}': No such file or directory`,
      );
    } else if (found.node.type === 'file' || directory) {
      statted.push(found.node);
      // With -d a folder is listed as itself, which needs no permission on the folder.
      files.push([name, found.node]);
    } else if (!canRead(found.node)) {
      errors.push(`ls: cannot open directory '${name}': Permission denied`);
    } else {
      statted.push(found.node);
      dirs.push({ name, lines: list(found.node, found.path) });
    }
  }
  const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  dirs.sort((a, b) => byName(a.name, b.name));
  const out = [...errors, ...show(order(files), statted)];
  const many = names.length > 1;
  dirs.forEach((d, i) => {
    if (many && (i > 0 || files.length)) out.push('');
    if (many) out.push(`${d.name}:`);
    out.push(...d.lines);
  });
  return out;
};

const cat = (tree: ShellDir, cwd: string[], args: string[]): string[] => {
  const out: string[] = [];
  for (const name of args) {
    const found = resolve(tree, cwd, name);
    if (!('node' in found)) {
      out.push(
        `cat: ${name}: ${found.error === 'denied' ? 'Permission denied' : found.error === 'notdir' ? 'Not a directory' : 'No such file or directory'}`,
      );
    } else if (found.node.type === 'dir') out.push(`cat: ${name}: Is a directory`);
    else out.push(...found.node.content.replace(/\n$/, '').split('\n'));
  }
  return out;
};

/** Runs one line typed at the prompt. */
export const run = (
  tree: ShellDir,
  cwd: string[],
  line: string,
  { user = REMI, now = Math.floor(Date.now() / 1000) }: { user?: ShellUser; now?: number } = {},
): ShellResult => {
  const [command, ...args] = tokenize(line);
  if (!command) return { output: [], cwd };
  switch (command) {
    case 'ls':
      return { output: ls(tree, cwd, args, user, now), cwd };
    case 'cat':
      return { output: args.length ? cat(tree, cwd, args) : [], cwd };
    case 'pwd':
      return { output: [[HOME, ...cwd].join('/')], cwd };
    case 'clear':
      return { output: [], cwd, clear: true };
    case 'cd': {
      if (args.length > 1) return { output: ['bash: cd: too many arguments'], cwd };
      const target = args[0] ?? '~';
      // Like bash's default `cd -L`: `..` is taken off the path as text first, so leaving a
      // folder never needs permission on the folder you are in.
      const found = resolve(tree, [], logicalPath(cwd, target));
      if (!('node' in found)) {
        const reason =
          found.error === 'denied'
            ? 'Permission denied'
            : found.error === 'notdir'
              ? 'Not a directory'
              : 'No such file or directory';
        return { output: [`bash: cd: ${target}: ${reason}`], cwd };
      }
      if (found.node.type === 'file') return { output: [`bash: cd: ${target}: Not a directory`], cwd };
      if (!canEnter(found.node)) return { output: [`bash: cd: ${target}: Permission denied`], cwd };
      return { output: [], cwd: found.path };
    }
    default:
      return { output: [`bash: ${command}: command not found`], cwd };
  }
};

/** The commands the prompt understands, shown as a hint. */
export const SUPPORTED = ['ls', 'cd', 'cat', 'pwd', 'clear'] as const;
