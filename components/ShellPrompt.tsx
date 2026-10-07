'use client';

import { type CSSProperties, type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Prompt } from '@/components/TerminalSession';
import { displayCwd, GUEST_HOST, routeFor, run, type ShellDir, SUPPORTED } from '@/lib/shell';

type Entry = { id: number; cwd: string[]; line: string; output: string[] };

/**
 * The prompt that ends every page, and it works: the visitor types as a guest and gets
 * what bash would print over a copy of the site (lib/shell.ts). `cd` into a folder that
 * has a page opens that page.
 */
export const ShellPrompt = ({
  tree,
  cwd: startCwd,
  delayMs,
  className,
}: {
  tree: ShellDir;
  cwd: string[];
  delayMs: number;
  className?: string;
}) => {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [cwd, setCwd] = useState(startCwd);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [line, setLine] = useState('');
  const [focused, setFocused] = useState(false);
  const [recall, setRecall] = useState<number | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = run(tree, cwd, line);
    setLine('');
    setRecall(null);
    if (result.clear) {
      setEntries([]);
      return;
    }
    setEntries((list) => [
      ...list,
      { id: list.length ? list[list.length - 1].id + 1 : 0, cwd, line, output: result.output },
    ]);
    const route = routeFor(result.cwd, tree);
    const here = routeFor(startCwd, tree);
    if (route && route !== here) router.push(route);
    setCwd(result.cwd);
  };

  // Arrow keys walk back through what was typed, like a shell's history.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const typed = entries.map((e) => e.line).filter(Boolean);
    if (!typed.length || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const next =
      event.key === 'ArrowUp'
        ? Math.max(0, (recall ?? typed.length) - 1)
        : recall === null || recall + 1 >= typed.length
          ? null
          : recall + 1;
    setRecall(next);
    setLine(next === null ? '' : typed[next]);
  };

  return (
    <div
      className={`t-in ${className ?? ''}`}
      data-testid="shell"
      onClick={() => input.current?.focus()}
      style={{ '--d': `${delayMs}ms` } as CSSProperties}
    >
      <div aria-live="polite">
        {entries.map((entry) => (
          <div key={entry.id}>
            <div className="whitespace-pre-wrap break-all">
              <Prompt cwd={displayCwd(entry.cwd)} user={GUEST_HOST} />
              {entry.line}
            </div>
            {entry.output.map((text, i) => (
              <div className="whitespace-pre-wrap break-words text-body" key={i}>
                {text || ' '}
              </div>
            ))}
          </div>
        ))}
      </div>
      <form className="flex flex-wrap items-baseline" onSubmit={submit}>
        <label className="whitespace-pre-wrap" htmlFor="shell-input">
          <Prompt cwd={displayCwd(cwd)} user={GUEST_HOST} />
          <span className="sr-only">Type a command</span>
        </label>
        {!focused && !line ? (
          <span aria-hidden="true" className="t-cursor mr-2" style={{ '--d': `${delayMs}ms` } as CSSProperties} />
        ) : null}
        <input
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="min-w-[12ch] flex-1 bg-transparent text-fg caret-cyan placeholder:text-muted focus:outline-none"
          enterKeyHint="go"
          id="shell-input"
          onBlur={() => setFocused(false)}
          onChange={(event) => setLine(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder={entries.length ? '' : `try ${SUPPORTED.join(', ')}`}
          ref={input}
          spellCheck={false}
          type="text"
          value={line}
        />
      </form>
    </div>
  );
};
