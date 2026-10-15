/** @jest-environment node */
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixtureLogs, fixtureProjects } from './contentful.fixtures';
import {
  aboutTxt,
  buildTree,
  displayCwd,
  HOME,
  logFileName,
  pathForRoute,
  plantBonsai,
  routeFor,
  run,
  type ShellDir,
  tokenize,
} from './shell';
import { FOLDER_MODES, folderName } from './terminal';

// Newest first, as the pages order them (the fixtures are already in that order).
const projects = fixtureProjects.map((p) => p.fields);
const tree = buildTree(
  projects,
  fixtureLogs.map((l) => l.fields),
);
const folders = projects.map((p, i) => folderName(p, i));
const [alpha, beta, gamma] = folders;

// The visitor is "other" on every folder. As root we drop to nobody, so a 750 folder is
// closed to them for real. Without root the owner is the only user we can be, so locked
// folders get mode 000 instead: the owner is then refused the same way, with the same message.
const isRoot = process.getuid?.() === 0;
const owner = {
  owner: execFileSync('id', ['-un'], { encoding: 'utf8' }).trim(),
  group: execFileSync('id', ['-gn'], { encoding: 'utf8' }).trim(),
};
// bash and setpriv run with a bare PATH, so start them by their full paths.
const which = (tool: string) => execFileSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).trim();
const BASH = which('bash');

const write = (node: ShellDir, path: string) => {
  for (const [name, child] of Object.entries(node.children)) {
    const target = join(path, name);
    if (child.type === 'file') {
      writeFileSync(target, child.content);
      chmodSync(target, 0o644);
      utimesSync(target, child.mtime, child.mtime);
    } else {
      mkdirSync(target);
      write(child, target);
      utimesSync(target, child.mtime, child.mtime);
      chmodSync(target, child.mode === FOLDER_MODES.locked && !isRoot ? 0o000 : child.mode);
    }
  }
};

const planted = plantBonsai(tree, Math.floor(Date.now() / 1000));

/** Sets every folder's write bit for its owner on or off (the visitor is never the owner). */
const ownerWrites = (node: ShellDir, path: string, on: boolean) => {
  for (const [name, child] of Object.entries(node.children)) {
    if (child.type === 'dir' && child.mode !== FOLDER_MODES.locked) ownerWrites(child, join(path, name), on);
  }
  chmodSync(path, on ? node.mode : node.mode & ~0o200);
};

describe('the working prompt matches real bash', () => {
  let root: string;
  let bin: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'portfolio-shell-'));
    chmodSync(root, 0o755);
    // The bonsai grows daily, so the disk gets today's, as the prompt plants it.
    write(planted, root);
    utimesSync(root, tree.mtime, tree.mtime);
    // The portfolio machine only has ls, cat and rm (cd and pwd are bash builtins), so the real
    // bash gets a PATH with just those: anything else is "command not found" there too.
    bin = mkdtempSync(join(tmpdir(), 'portfolio-bin-'));
    chmodSync(bin, 0o755);
    for (const tool of ['ls', 'cat', 'rm']) {
      symlinkSync(which(tool), join(bin, tool));
    }
  });

  afterAll(() => {
    // Give the owner back access to locked folders so they can be removed.
    execFileSync('chmod', ['-R', 'u+rwx', root]);
    rmSync(root, { recursive: true, force: true });
    rmSync(bin, { recursive: true, force: true });
  });

  /**
   * Opens the disk to bash as the guest would find it while `run` runs. A page can open the prompt inside
   * a locked folder (it has a page but is 750): as root we enter it before dropping to nobody; without
   * root it is opened for the start and locked again from inside (the returned prefix). rm must find
   * nothing it may delete: as nobody that is already so; as the owner, folders lose their write bit.
   */
  const asGuest = <T>(cwd: string[], line: string, run: (prefix: string) => T): T => {
    const dir = join(root, ...cwd);
    const startsLocked = !isRoot && cwd.length >= 2 && cwd[0] === 'projects' && cwd[1] === gamma;
    const guardsRm = !isRoot && line.startsWith('rm');
    if (startsLocked) chmodSync(dir, 0o700);
    if (guardsRm) ownerWrites(planted, root, false);
    try {
      return run(startsLocked ? `${which('chmod')} 000 "$PWD"\n` : '');
    } finally {
      if (startsLocked) chmodSync(dir, 0o000);
      if (guardsRm) ownerWrites(planted, root, true);
    }
  };

  /** bash's output with the mirror's path read as $HOME, and where it ended up (the @@ line). */
  const parse = (stdout: string) => {
    const lines = stdout
      .replaceAll(root, HOME)
      .split('\n')
      // Without root, locked folders stand in as 000 (see above); ls -l shows their real 750.
      .map((l) => (isRoot ? l : l.replace(/^d---------/, 'drwxr-x---')));
    const end = lines.findIndex((l) => l.startsWith('@@'));
    const pwd = lines[end].slice(2);
    const relative = pwd === HOME ? [] : pwd.slice(HOME.length + 1).split('/');
    return { output: lines.slice(0, end), cwd: relative };
  };

  /** Runs a line in interactive bash in ~/<cwd>; returns its output and where it ended up. */
  const bash = (cwd: string[], line: string) =>
    asGuest(cwd, line, (prefix) => {
      const dir = join(root, ...cwd);
      const script = `${prefix}{\n:\n${line}\n} 2>&1\necho "@@$PWD"`;
      const args = ['--norc', '--noprofile', '-i', '-c', script];
      const options = {
        cwd: dir,
        env: { PATH: bin, HOME: root, PWD: dir, LC_ALL: 'C', NODE_ENV: 'test' as const },
        encoding: 'utf8' as const,
      };
      const result = isRoot
        ? spawnSync(which('setpriv'), ['--reuid=65534', '--regid=65534', '--clear-groups', BASH, ...args], options)
        : spawnSync(BASH, args, options);
      return parse(result.stdout);
    });

  const cases: [string[], string][] = [
    [[], 'ls'],
    [[], 'ls -a'],
    [[], 'ls -lA'],
    [[], 'ls -t'],
    [[], 'ls .secret'],
    [[], 'ls -a .secret'],
    [['.secret'], 'ls -a'],
    [['.secret'], 'ls'],
    [['.secret'], 'pwd'],
    [['.secret'], 'ls -l'],
    [['.secret'], 'cat bonsai.txt'],
    [[], 'cat .secret/bonsai.txt'],
    [[], 'ls -la .secret'],
    [[], 'rm about.txt'],
    [[], 'rm'],
    [[], 'rm -rf'],
    [[], 'rm nope'],
    [[], 'rm -f nope'],
    [[], 'rm projects'],
    [[], 'rm -r projects'],
    [[], 'rm -rf ~'],
    [[], 'rm -rf /'],
    [[], 'rm -rf .'],
    [['log'], 'rm -rf ..'],
    [[], 'rm -rf *'],
    [['projects'], 'rm -fr ../log'],
    [[], `rm -rf projects/${gamma}`],
    [[], `rm -rf projects/${gamma}/README.md`],
    [['.secret'], 'rm -Rf card bonsai.txt'],
    [[], 'rm --recursive --force featured'],
    [[], 'rm -rf -- log'],
    [[], 'rm -z about.txt'],
    [['.secret'], 'cd card'],
    [[], 'cd .secret/card'],
    [['.secret', 'card'], 'ls -a'],
    [['.secret', 'card'], 'cd ..'],
    [['.secret'], 'cd ..'],
    [[], 'cd .secret'],
    [[], 'cd ./.secret'],
    [[], 'cd ~/.secret'],
    [[], 'cat .secret'],
    [[], 'ls -t featured'],
    [[], 'ls projects'],
    [[], 'ls -a projects'],
    [[], 'ls -t projects'],
    [[], 'ls log'],
    [[], 'ls -at log'],
    [[], 'ls -A'],
    [[], 'ls --all'],
    [[], 'ls --almost-all projects'],
    [[], 'ls --reverse log'],
    [[], 'ls -- projects'],
    [[], 'ls -r projects'],
    [[], 'ls -1t log'],
    [[], 'ls -t featured # プロジェクト'],
    [[], '# just a comment'],
    [[], 'ls nope'],
    [[], 'ls about.txt'],
    [[], 'ls about.txt/'],
    [[], 'ls -j'],
    // Long listings, compared column for column (owner and group are this machine's).
    [[], 'ls -l'],
    [[], 'ls -l projects'],
    [[], 'ls -la projects'],
    [[], 'ls -lt projects'],
    [[], 'ls -ltr log'],
    [[], 'ls -l featured'],
    [[], 'ls -l about.txt'],
    [[], 'ls -ld projects'],
    [[], `ls -ld projects/${gamma}`],
    [[], `ls -l projects/${gamma}`],
    [[], `ls -l projects/${alpha}`],
    [[], 'ls -ld'],
    [[], 'ls -d projects log'],
    [[], 'ls -l about.txt projects'],
    [['projects'], 'ls -l'],
    [[], 'ls projects log'],
    [[], `ls projects/${gamma}`],
    [[], `ls projects/${alpha}`],
    [['projects'], 'ls'],
    [['projects'], 'ls ..'],
    [[], 'cat about.txt'],
    [[], 'cat nope'],
    [[], 'cat projects'],
    [[], `cat projects/${alpha}/README.md`],
    [[], `cat projects/${gamma}/README.md`],
    [[], `cat about.txt/x`],
    [[], `cat log/${logFileName(fixtureLogs[0].fields)}`],
    [['projects', beta], 'cat README.md'],
    [[], 'pwd'],
    [['projects', alpha], 'pwd'],
    [[], 'cd projects'],
    [[], `cd projects/${alpha}`],
    [[], `cd projects/${gamma}`],
    [[], 'cd nope'],
    [[], 'cd about.txt'],
    [[], 'cd log projects'],
    [[], 'cd "log"'],
    [['projects', alpha], 'cd ..'],
    // Leaving a locked folder works: bash takes .. off the path without touching the folder.
    [['projects', gamma], 'cd ..'],
    [['projects', gamma], 'cd ../../log'],
    [['projects', gamma], 'cd'],
    [['projects', alpha], 'cd .. # go back'],
    [['projects', alpha], 'cd ../..'],
    [['projects', alpha], 'cd'],
    [['projects', alpha], 'cd ~'],
    [['projects'], 'cd ~/log'],
    [['log'], 'cd ./../featured'],
    // Names that are also JavaScript object properties are just missing files.
    [['projects'], 'cd constructor'],
    [['projects'], 'cd toString'],
    [[], 'cat constructor'],
    [[], 'ls __proto__'],
    [['projects'], 'cd cat'],
    [[], 'whoami-not-a-command'],
    [[], 'sudo ls'],
  ];

  it.each(cases)('in ~/%j: %s', (cwd, line) => {
    const real = bash(cwd, line);
    // ls -l names the files' real owner here; the site shows remi.
    const ours = run(tree, cwd, line, { user: owner, now: Math.floor(Date.now() / 1000) });
    // rm walks folders in the disk's own order; the site lists them sorted.
    const order = (lines: string[]) => (line.startsWith('rm') ? [...lines].sort() : lines);
    expect({ output: order(ours.output), cwd: ours.cwd }).toEqual({ output: order(real.output), cwd: real.cwd });
  });

  it('the bash run really is refused by locked folders', () => {
    expect(bash([], `cd projects/${gamma}`).output[0]).toMatch(/Permission denied$/);
  });
});

describe('the virtual tree', () => {
  it('holds about.txt with the name, role and intro the home page shows', () => {
    expect(run(tree, [], 'cat about.txt').output).toEqual(aboutTxt().trimEnd().split('\n'));
  });

  it('has a folder per project, locked ones at 750, and one file per log entry', () => {
    const projectsDir = tree.children.projects as ShellDir;
    expect(Object.keys(projectsDir.children).sort()).toEqual([...folders].sort());
    expect((projectsDir.children[gamma] as ShellDir).mode).toBe(FOLDER_MODES.locked);
    expect(Object.keys((tree.children.log as ShellDir).children)).toHaveLength(fixtureLogs.length);
  });
});

describe('rm', () => {
  it('refuses the guest like GNU rm, and with -r and -f the site then plays along', () => {
    const result = run(tree, [], 'rm -rf ~');
    expect(result.effect).toBe('collapse');
    expect(result.output).toContain("rm: cannot remove '/home/remi/about.txt': Permission denied");
    expect(result.output.every((l) => l.endsWith('Permission denied'))).toBe(true);
    for (const line of ['rm -fr /', 'rm -Rf .', 'rm -r -f projects', 'rm --recursive --force *']) {
      expect(run(tree, [], line).effect).toBe('collapse');
    }
  });

  it('says so for real rm options it does not have, rather than faking them', () => {
    expect(run(tree, [], 'rm -i about.txt').output).toEqual(['rm: -i is not supported in this shell (try -r, -f)']);
    expect(run(tree, [], 'rm --verbose x').output).toEqual([
      'rm: --verbose is not supported in this shell (try -r, -f)',
    ]);
  });

  it('only -r with -f sets it off, even with nothing to remove', () => {
    expect(run(tree, [], 'rm -rf')).toEqual({ output: [], cwd: [], effect: 'collapse' });
    for (const line of ['rm about.txt', 'rm -r projects', 'rm -f about.txt', 'rm -rf -z x']) {
      expect(run(tree, [], line).effect).toBeUndefined();
    }
  });
});

describe('the bonsai in the shell', () => {
  it('is in ~/.secret, and today’s', () => {
    const now = Date.parse('2026-12-01T12:00:00Z') / 1000;
    expect(run(tree, ['.secret'], 'ls', { now }).output).toEqual(['bonsai.txt', 'card']);
    expect(run(tree, ['.secret'], 'cat bonsai.txt', { now }).output.join('\n')).toContain('day 47 ·');
  });
});

describe('routes', () => {
  it('maps directories to the pages that show them', () => {
    expect(routeFor([], tree)).toBe('/');
    expect(routeFor(['projects'], tree)).toBe('/projects');
    expect(routeFor(['log'], tree)).toBe('/log');
    expect(routeFor(['.secret'], tree)).toBe('/.secret');
    expect(routeFor(['.secret', 'card'], tree)).toBe('/.secret/card');
    expect(routeFor(['projects', alpha], tree)).toBe(`/projects/${alpha}`);
    // Locked projects and featured/ have no page of their own.
    expect(routeFor(['projects', gamma], tree)).toBeNull();
    expect(routeFor(['featured'], tree)).toBeNull();
  });

  it('maps pages back to directories', () => {
    expect(pathForRoute('/')).toEqual([]);
    expect(pathForRoute('/projects/fixture-alpha')).toEqual(['projects', 'fixture-alpha']);
    expect(displayCwd(['log'])).toBe('~/log');
    expect(pathForRoute('/.secret')).toEqual(['.secret']);
    expect(pathForRoute('/.secret/card')).toEqual(['.secret', 'card']);
    expect(displayCwd([])).toBe('~');
  });
});

describe('tokenize', () => {
  it('splits on spaces and keeps quoted words together', () => {
    expect(tokenize('  ls   -a  projects ')).toEqual(['ls', '-a', 'projects']);
    expect(tokenize(`cd "my dir" 'it''s'`)).toEqual(['cd', 'my dir', 'its']);
    expect(tokenize('cat ""')).toEqual(['cat', '']);
    expect(tokenize('ls -t featured # プロジェクト')).toEqual(['ls', '-t', 'featured']);
    expect(tokenize('cat a#b')).toEqual(['cat', 'a#b']);
  });

  it('says plainly when a real ls option is not implemented here', () => {
    const hint = '(try -a, -A, -d, -l, -t, -r)';
    expect(run(tree, [], 'ls -R').output).toEqual([`ls: -R is not supported in this shell ${hint}`]);
    expect(run(tree, [], 'ls --help').output).toEqual([`ls: --help is not supported in this shell ${hint}`]);
  });

  it('shows remi as owner and group on the site', () => {
    expect(run(tree, [], 'ls -ld projects', { now: Date.parse('2026-10-07') / 1000 }).output).toEqual([
      'drwxr-xr-x 5 remi remi 4096 Mar  1  2026 projects',
    ]);
  });

  it('clear empties the screen and keeps the cwd', () => {
    expect(run(tree, ['log'], 'clear')).toEqual({ output: [], cwd: ['log'], clear: true });
    expect(run(tree, ['log'], '   ')).toEqual({ output: [], cwd: ['log'] });
  });
});
