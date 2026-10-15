'use client';

import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useRouter } from 'next/navigation';
import { Prompt } from '@/components/TerminalSession';
import { type BlackHole, prepareBlackHole } from '@/lib/blackhole/engine';
import { collapseSite, FALL_AT, RESTORED_NOTE, RM_RF_NOTES } from '@/lib/collapse';
import { displayCwd, GUEST_HOST, routeFor, run, type ShellDir, SUPPORTED } from '@/lib/shell';

/** `notes` are the site's own comments under a command's output, never part of it. */
type Entry = { id: number; cwd: string[]; line: string; output: string[]; notes?: string[] };

const noSubscription = () => () => {};

/** Plays `rm -rf` out under the entry it was typed in: the site's comments, the collapse, the restore. */
function useRmRf(setEntries: Dispatch<SetStateAction<Entry[]>>, reveal: () => void) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // A hole warmed up for a page that is left before it opens is let go with the page.
  const waiting = useRef<Promise<BlackHole | null>[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      waiting.current.forEach((hole) => void hole.then((h) => h?.dispose()));
    },
    [],
  );
  return (id: number) => {
    // Each note scrolls into view as it comes: the visitor is watching the prompt, not the page.
    const say = (text: string) => {
      setEntries((list) => list.map((e) => (e.id === id ? { ...e, notes: [...(e.notes ?? []), text] } : e)));
      requestAnimationFrame(reveal);
    };
    const later = (ms: number, then: () => void) => timers.current.push(setTimeout(then, ms));
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The black hole warms up (WebGPU, its shader) while the site is still talking.
    const hole = still ? Promise.resolve(null) : prepareBlackHole().catch(() => null);
    waiting.current.push(hole);
    RM_RF_NOTES.forEach(({ at, text }) => later(at, () => say(text)));
    later(FALL_AT, () => {
      waiting.current = waiting.current.filter((h) => h !== hole);
      void collapseSite(still, hole).then(() => {
        say(RESTORED_NOTE);
      });
    });
  };
}

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
  // Until React has hydrated the prompt, Enter would submit the form natively and reload the page.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const rmRf = useRmRf(setEntries, () => {
    input.current?.focus({ preventScroll: true });
    input.current?.scrollIntoView({ block: 'nearest' });
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = run(tree, cwd, line);
    setLine('');
    setRecall(null);
    if (result.clear) {
      setEntries([]);
      return;
    }
    const id = entries.length ? entries[entries.length - 1].id + 1 : 0;
    setEntries((list) => [...list, { id, cwd, line, output: result.output }]);
    if (result.effect === 'collapse') rmRf(id);
    follow(result.cwd);
  };

  // cd into a folder that has a page of its own opens that page.
  const follow = (next: string[]) => {
    const route = routeFor(next, tree);
    if (route && route !== routeFor(startCwd, tree)) router.push(route);
    setCwd(next);
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
      data-ready={hydrated ? 'true' : undefined}
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
            {entry.notes?.map((text, i) => (
              <div className="whitespace-pre-wrap break-words text-muted" data-testid="shell-note" key={i}>
                {text}
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
