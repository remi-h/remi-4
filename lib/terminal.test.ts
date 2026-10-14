/** @jest-environment node */
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixtureLogs, fixtureProjects } from './contentful.fixtures';
import {
  cdError,
  commands,
  cwdFor,
  FOLDER_MODES,
  folderMode,
  folderName,
  isTyped,
  MAX_TYPED,
  missingPath,
  schedule,
  shellQuote,
  slugify,
  TIMING,
} from './terminal';

// Log entries have no file names on the site; in the mirror each is a file named by date and title.
const logEntryFile = (fields: { date?: string; title?: string }) =>
  `${fields.date ?? ''}_${slugify(fields.title ?? '')}`;

const projects = fixtureProjects.map((p, i) => ({
  folder: folderName({ slug: p.fields.slug, title: p.fields.title }, i),
  featured: Boolean(p.fields.featured),
  slug: p.fields.slug,
  locked: Boolean(p.fields.lock),
  date: p.fields.date ?? '',
}));

// ls -t orders by modification time, so the mirror gives every item the date the site shows for it.
const touch = (path: string, date: string) => utimesSync(path, new Date(date), new Date(date));

describe('the displayed commands are real shell commands', () => {
  let root: string;

  beforeAll(() => {
    // A mirror of what the site claims exists: ~/about.txt, ~/featured, ~/projects and ~/log.
    root = mkdtempSync(join(tmpdir(), 'portfolio-'));
    writeFileSync(join(root, 'about.txt'), 'Remi Higuchi\n');
    mkdirSync(join(root, 'log'));
    for (const entry of fixtureLogs) {
      const file = join(root, 'log', logEntryFile(entry.fields));
      writeFileSync(file, '');
      touch(file, entry.fields.date ?? '');
    }
    mkdirSync(join(root, 'featured'));
    mkdirSync(join(root, 'projects'));
    for (const { folder, featured, locked, date } of projects) {
      mkdirSync(join(root, 'projects', folder));
      writeFileSync(join(root, 'projects', folder, 'README.md'), '# readme\n');
      chmodSync(join(root, 'projects', folder), locked ? FOLDER_MODES.locked : FOLDER_MODES.public);
      touch(join(root, 'projects', folder), date);
      if (featured) {
        mkdirSync(join(root, 'featured', folder));
        chmodSync(join(root, 'featured', folder), locked ? FOLDER_MODES.locked : FOLDER_MODES.public);
        touch(join(root, 'featured', folder), date);
      }
    }
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  // HOME points at the mirror, so ~ is the site's root as in the prompt.
  const sh = (script: string, cwd = root) =>
    execFileSync('sh', ['-c', script], { cwd, env: { ...process.env, HOME: root, LC_ALL: 'C' }, encoding: 'utf8' });

  it('home: cat about.txt succeeds', () => {
    expect(sh(commands.about)).toContain('Remi Higuchi');
  });

  it('home: ls -lt featured lists the featured folders newest first, with the modes the cards show', () => {
    const lines = sh(commands.featured).trim().split('\n').slice(1);
    const featured = projects.filter((p) => p.featured).sort((a, b) => b.date.localeCompare(a.date));
    expect(lines.map((line) => line.split(' ').pop())).toEqual(featured.map((p) => p.folder));
    // The first ten characters are the type and permission bits; some systems append . or +.
    expect(lines.map((line) => line.slice(0, 10))).toEqual(featured.map((p) => folderMode(p.locked)));
  });

  it('projects: cd projects succeeds and leaves you in ~/projects', () => {
    expect(sh(`${commands.toProjects} && pwd`).trim()).toBe(join(root, 'projects'));
  });

  it('project detail: cd projects/<folder> then cat README.md, then cd .. all succeed', () => {
    for (const { folder } of projects) {
      expect(sh(`${commands.toProject(folder)} && ${commands.readme} && ${commands.parent}`)).toContain('readme');
    }
  });

  it('folder modes match what ls -ld prints for 755 (public) and 750 (locked)', () => {
    for (const [locked, mode] of [
      [false, FOLDER_MODES.public],
      [true, FOLDER_MODES.locked],
    ] as const) {
      const dir = join(root, `mode-${mode.toString(8)}`);
      mkdirSync(dir);
      chmodSync(dir, mode);
      // The first ten characters are the type and permission bits; some systems append . or +.
      expect(sh(`ls -ld ${dir}`).slice(0, 10)).toBe(folderMode(locked));
    }
  });

  // ls -l prints "total N", then one line per entry with the name as the last field.
  const listed = (script: string) =>
    sh(script)
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => line.split(' ').pop());

  it('projects: ls -l in ~/projects lists one folder per card', () => {
    // The cards are the listing, so the page shows ls -l without printing it.
    expect(listed(`${commands.toProjects} && ${commands.list}`)).toEqual(projects.map((p) => p.folder).sort());
  });

  it('log: ls -r in ~/log lists one file per entry, newest first', () => {
    // fixtureLogs is newest first, like the page; the file names start with the date.
    expect(sh(`${commands.toLog} && ${commands.listLog}`).trim().split('\n')).toEqual(
      fixtureLogs.map((e) => logEntryFile(e.fields)),
    );
  });

  it('log: cd log succeeds and leaves you in ~/log', () => {
    expect(sh(`${commands.toLog} && pwd`).trim()).toBe(join(root, 'log'));
  });

  it('404: cd into a missing path fails with exactly the error the page shows', () => {
    for (const path of ['nope', 'projects/does-not-exist', "it's missing"]) {
      // Interactive bash, as someone typing at a prompt would see it (bash -c adds "line 1:").
      const result = spawnSync('bash', ['--norc', '--noprofile', '-i', '-c', commands.toPath(path)], {
        cwd: root,
        env: { ...process.env, LC_ALL: 'C' },
        encoding: 'utf8',
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr.split('\n')).toContain(cdError(path));
    }
  });

  it('404: cd ~ takes you home, then cd projects works from there', () => {
    expect(sh(`${commands.home} && pwd`, join(root, 'projects')).trim()).toBe(root);
    expect(sh(`${commands.home} && ${commands.toProjects} && pwd`, join(root, 'log')).trim()).toBe(
      join(root, 'projects'),
    );
  });

  it('every command passes a shell syntax check', () => {
    const all = [
      commands.about,
      commands.featured,
      commands.toProjects,
      commands.toProject("my project's name"),
      commands.readme,
      commands.parent,
      commands.toLog,
      commands.list,
      commands.listLog,
      commands.home,
      commands.toPath("it's missing"),
    ];
    for (const command of all) {
      expect(() => execFileSync('sh', ['-n', '-c', command])).not.toThrow();
    }
  });

  it('quotes folder names that need it, and the quoted command still works', () => {
    const tricky = "my project's name";
    mkdirSync(join(root, 'projects', tricky));
    writeFileSync(join(root, 'projects', tricky, 'README.md'), '# tricky\n');
    expect(sh(commands.toProject(tricky) + ' && ' + commands.readme)).toContain('tricky');
  });
});

describe('shellQuote', () => {
  it('leaves safe names alone', () => {
    expect(shellQuote('project-01')).toBe('project-01');
    expect(shellQuote('a/b_c.d')).toBe('a/b_c.d');
  });

  it('quotes unsafe names', () => {
    expect(shellQuote('two words')).toBe("'two words'");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});

describe('folder names', () => {
  it('slugifies titles', () => {
    expect(slugify('Fixture Gamma!')).toBe('fixture-gamma');
    expect(slugify('Café Östra')).toBe('cafe-ostra');
  });

  it('prefers the slug, then the title, then a numbered fallback', () => {
    expect(folderName({ slug: 'alpha', title: 'Alpha Project' }, 0)).toBe('alpha');
    expect(folderName({ title: 'Locked Thing' }, 1)).toBe('locked-thing');
    expect(folderName({}, 2)).toBe('project-03');
  });

  it('shows a folder mode that matches whether it can be opened', () => {
    expect(folderMode(false)).toBe('drwxr-xr-x');
    expect(folderMode(true)).toBe('drwxr-x---');
  });
});

describe('missingPath', () => {
  it('turns a 404 pathname into the path cd was asked for', () => {
    expect(missingPath('/nope')).toBe('nope');
    expect(missingPath('/projects/does-not-exist/')).toBe('projects/does-not-exist');
    expect(missingPath('/caf%C3%A9')).toBe('café');
    expect(missingPath('/bad%E0%A4%A')).toBe('bad%E0%A4%A');
  });
});

describe('cwdFor', () => {
  it("maps routes to the prompt's working directory", () => {
    expect(cwdFor('/')).toBe('~');
    expect(cwdFor('/projects')).toBe('~/projects');
    expect(cwdFor('/projects/fixture-alpha')).toBe('~/projects/fixture-alpha');
    expect(cwdFor('/log/')).toBe('~/log');
  });
});

describe('schedule', () => {
  it('types each command after its prompt and shows output after a pause', () => {
    const { steps, endAt, contentAt } = schedule([
      { command: 'cd projects', hasOutput: false },
      { command: 'ls -l', hasOutput: true },
    ]);
    const typed1 = TIMING.typeDelay + 'cd projects'.length * TIMING.char;
    expect(steps[0]).toEqual({ promptAt: 0, typeAt: TIMING.typeDelay, outputAt: typed1 + TIMING.pause });
    // With no output, the next prompt follows straight after the pause.
    expect(steps[1].promptAt).toBe(steps[0].outputAt);
    expect(steps[1].outputAt).toBe(steps[1].promptAt + TIMING.typeDelay + 'ls -l'.length * TIMING.char + TIMING.pause);
    expect(endAt).toBe(steps[1].outputAt + TIMING.settle);
    expect(contentAt).toBe(steps[1].outputAt + TIMING.content);
  });

  it('shows commands too long to type already typed, with no typing time', () => {
    const long = `cd projects/${'x'.repeat(MAX_TYPED)}`;
    expect(isTyped('cd projects')).toBe(true);
    expect(isTyped(long)).toBe(false);
    expect(schedule([{ command: long, hasOutput: true }]).steps[0].outputAt).toBe(TIMING.typeDelay + TIMING.pause);
  });

  it('handles an empty session', () => {
    expect(schedule([])).toEqual({ steps: [], endAt: 0, contentAt: 0 });
  });
});
