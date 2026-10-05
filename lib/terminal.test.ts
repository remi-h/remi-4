/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixtureProjects } from './contentful.fixtures';
import { commands, cwdFor, folderMode, folderName, lsAll, schedule, shellQuote, slugify, TIMING } from './terminal';

const projects = fixtureProjects.map((p, i) => ({
  folder: folderName({ slug: p.fields.slug, title: p.fields.title }, i),
  featured: Boolean(p.fields.featured),
  slug: p.fields.slug,
}));

describe('the displayed commands are real shell commands', () => {
  let root: string;

  beforeAll(() => {
    // A mirror of what the site claims exists: ~/about.txt, ~/log.txt, ~/featured and ~/projects.
    root = mkdtempSync(join(tmpdir(), 'portfolio-'));
    writeFileSync(join(root, 'about.txt'), 'Remi Higuchi\n');
    writeFileSync(join(root, 'log.txt'), '2026-02-10 Fixture Conf Fixture talk\n');
    mkdirSync(join(root, 'featured'));
    mkdirSync(join(root, 'projects'));
    for (const { folder, featured } of projects) {
      mkdirSync(join(root, 'projects', folder));
      writeFileSync(join(root, 'projects', folder, 'README.md'), '# readme\n');
      if (featured) mkdirSync(join(root, 'featured', folder));
    }
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const sh = (script: string, cwd = root) =>
    execFileSync('sh', ['-c', script], { cwd, env: { ...process.env, LC_ALL: 'C' }, encoding: 'utf8' });

  it('home: cat about.txt and ls -t featured succeed', () => {
    expect(sh(commands.about)).toContain('Remi Higuchi');
    expect(sh(commands.featured).trim().split('\n').sort()).toEqual(
      projects
        .filter((p) => p.featured)
        .map((p) => p.folder)
        .sort(),
    );
  });

  it('projects: cd projects then ls -a prints exactly what the page shows', () => {
    const printed = sh(`${commands.toProjects} && ${commands.listAll}`).trim().split('\n');
    expect(printed).toEqual(lsAll(projects.map((p) => p.folder)));
  });

  it('project detail: cd projects/<folder> then cat README.md, then cd .. all succeed', () => {
    for (const { folder } of projects) {
      expect(sh(`${commands.toProject(folder)} && ${commands.readme} && ${commands.parent}`)).toContain('readme');
    }
  });

  it('log: cat log.txt succeeds', () => {
    expect(sh(commands.log)).toContain('Fixture talk');
  });

  it('every command passes a shell syntax check', () => {
    const all = [
      commands.about,
      commands.featured,
      commands.toProjects,
      commands.listAll,
      commands.toProject("my project's name"),
      commands.readme,
      commands.parent,
      commands.log,
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

  it('lists . and .. first, then names in byte order', () => {
    expect(lsAll(['project-02', 'alpha', 'Zed'])).toEqual(['.', '..', 'Zed', 'alpha', 'project-02']);
  });

  it('shows a folder mode that matches whether it can be opened', () => {
    expect(folderMode(false)).toBe('drwxr-xr-x');
    expect(folderMode(true)).toBe('d---------');
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
      { command: 'ls -a', hasOutput: true },
    ]);
    const typed1 = TIMING.typeDelay + 'cd projects'.length * TIMING.char;
    expect(steps[0]).toEqual({ promptAt: 0, typeAt: TIMING.typeDelay, outputAt: typed1 + TIMING.pause });
    // With no output, the next prompt follows straight after the pause.
    expect(steps[1].promptAt).toBe(steps[0].outputAt);
    expect(steps[1].outputAt).toBe(steps[1].promptAt + TIMING.typeDelay + 'ls -a'.length * TIMING.char + TIMING.pause);
    expect(endAt).toBe(steps[1].outputAt + TIMING.settle);
    expect(contentAt).toBe(steps[1].outputAt + 150);
  });

  it('handles an empty session', () => {
    expect(schedule([])).toEqual({ steps: [], endAt: 0, contentAt: 0 });
  });
});
