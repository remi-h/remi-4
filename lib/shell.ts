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
export const readmeFor = (project: ShellProject) =>
  `# ${project.title ?? 'Untitled'}\n${project.summary ? `\n${project.summary}\n` : ''}`;
/** Log entries have no file names on the page; in the shell each is `<date>_<title>.md`. */
export const logFileName = (log: ShellLog) => `${log.date ?? 'undated'}_${slugify(log.title ?? '') || 'entry'}.md`;
const logContent = (log: ShellLog) =>
  `# ${log.title ?? 'Untitled'}\n\n${[log.org, log.link].filter(Boolean).join('\n')}\n`;

/** Projects in page order (featured first), as the cards and their folder names use them. */
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
  return dir({
    'about.txt': file(aboutTxt()),
    featured: dir(featured),
    log: dir(logFiles),
    projects: dir(projectDirs),
  });
};

/** The page a directory has, if any. */
export const routeFor = (path: string[], tree: ShellDir) => {
  if (path.length === 0) return '/';
  if (path.length === 1 && (path[0] === 'projects' || path[0] === 'log')) return `/${path[0]}`;
  if (path.length === 2 && path[0] === 'projects') {
    const node = tree.children.projects;
    const project = node?.type === 'dir' ? node.children[path[1]] : undefined;
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
  let node: ShellNode = tree;
  for (const p of path) node = (node as ShellDir).children[p];
  for (const [i, part] of parts.entries()) {
    if (part === '' || part === '.') {
      if (node.type !== 'dir') return { error: 'notdir' };
      continue;
    }
    if (node.type !== 'dir') return { error: 'notdir' };
    if (!canEnter(node)) return { error: 'denied' };
    if (part === '..') {
      path = path.slice(0, -1);
      node = tree;
      for (const p of path) node = (node as ShellDir).children[p];
      continue;
    }
    const child: ShellNode | undefined = node.children[part];
    if (!child) return { error: 'missing' };
    // A trailing slash on a file is "Not a directory".
    if (child.type === 'file' && i < parts.length - 1) return { error: 'notdir' };
    node = child;
    path = [...path, part];
  }
  return { node, path };
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

const ls = (tree: ShellDir, cwd: string[], args: string[]): string[] => {
  let all = false;
  let almostAll = false;
  let byTime = false;
  let reverse = false;
  const targets: string[] = [];
  for (const arg of args) {
    if (arg.startsWith('-') && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === 'a') all = true;
        else if (flag === 'A') almostAll = true;
        else if (flag === 't') byTime = true;
        else if (flag === 'r') reverse = true;
        else if (flag === '1') continue;
        else if (GNU_LS_FLAGS.includes(flag))
          return [`ls: -${flag} is not supported in this shell (try -a, -A, -t, -r)`];
        else return [`ls: invalid option -- '${flag}'`, "Try 'ls --help' for more information."];
      }
    } else targets.push(arg);
  }
  const list = (node: ShellDir, path: string[]) => {
    let entries = Object.entries(node.children);
    if (all && !almostAll) {
      const parent = resolve(tree, path, '..');
      entries = [['.', node], ['..', 'node' in parent ? parent.node : node], ...entries];
    }
    const sorted = sortEntries(entries, byTime).map(([name]) => name);
    return reverse ? sorted.reverse() : sorted;
  };
  const names = targets.length ? targets : ['.'];
  const errors: string[] = [];
  const files: string[] = [];
  const dirs: { name: string; lines: string[] }[] = [];
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
    } else if (found.node.type === 'file') {
      files.push(name);
    } else if (!canRead(found.node)) {
      errors.push(`ls: cannot open directory '${name}': Permission denied`);
    } else {
      dirs.push({ name, lines: list(found.node, found.path) });
    }
  }
  const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  dirs.sort((a, b) => byName(a.name, b.name));
  const out = [...errors, ...files.sort(byName)];
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
export const run = (tree: ShellDir, cwd: string[], line: string): ShellResult => {
  const [command, ...args] = tokenize(line);
  if (!command) return { output: [], cwd };
  switch (command) {
    case 'ls':
      return { output: ls(tree, cwd, args), cwd };
    case 'cat':
      return { output: args.length ? cat(tree, cwd, args) : [], cwd };
    case 'pwd':
      return { output: [[HOME, ...cwd].join('/')], cwd };
    case 'clear':
      return { output: [], cwd, clear: true };
    case 'cd': {
      if (args.length > 1) return { output: ['bash: cd: too many arguments'], cwd };
      const target = args[0] ?? '~';
      const found = resolve(tree, cwd, target);
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
