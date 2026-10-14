import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { TerminalSession } from '@/components/TerminalSession';
import { fetchLogs } from '@/lib/contentful';
import { commands, schedule, TIMING } from '@/lib/terminal';

export const metadata = {
  title: 'Log',
  description: 'Media coverage, conferences, and things I have done and am proud of.',
};

/** yyyy-mm-dd in UTC, so the date never shifts with the server's time zone. */
const isoDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf()) ? date.toISOString().slice(0, 10) : '';
};

const rowClass =
  'group grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-x-6 gap-y-1 px-1 py-4 text-sm sm:grid-cols-[110px_200px_minmax(0,1fr)_auto]';

// Laid out like the projects page: the command, then the page heading, then the entries.
export default async function LogPage() {
  const { items } = await fetchLogs();
  // The page itself is the output of ls -r: the heading, then one entry per item.
  const steps = [
    { cwd: '~', command: commands.toLog },
    { cwd: '~/log', command: commands.listLog },
  ];
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: false })));
  const at = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <main className="px-4 sm:px-8">
      <TerminalSession className="pt-10 text-[15px] leading-7 sm:pt-14" steps={steps} />

      <div className="t-in" style={at(contentAt)}>
        <div className="flex flex-wrap items-end justify-between gap-5 pb-8 pt-12 sm:pt-16">
          <h1 className="text-[clamp(44px,8vw,112px)] font-extrabold leading-none tracking-[-0.045em]">log/</h1>
          <p className="font-jp pb-2 text-lg text-muted">{'# ログ'}</p>
        </div>
        <p className="font-grotesk mb-8 text-xl leading-normal text-body">
          Media coverage, conferences, and things I have done and am proud of.
        </p>
      </div>
      <section className="border-t border-line pb-24 pt-2">
        <ul className="divide-y divide-line" data-testid="log-entries">
          {items.map((entry, i) => {
            const row = (
              <>
                <span className="text-muted">{isoDate(entry.fields.date)}</span>
                <span className="text-yellow">{entry.fields.org ?? ''}</span>
                <span className="font-grotesk col-span-2 text-xl text-fg group-hover:text-cyan sm:col-span-1">
                  {entry.fields.title ?? 'Untitled'}
                  {entry.fields.link ? <span className="ml-2 text-cyan sm:hidden">↗</span> : null}
                </span>
                <span className="hidden text-cyan sm:inline">{entry.fields.link ? '↗' : ''}</span>
              </>
            );
            return (
              <li className="t-in" key={entry.sys.id} style={at(contentAt + TIMING.content + i * TIMING.stagger)}>
                {entry.fields.link ? (
                  <Link
                    className={`${rowClass} hover:bg-panel-2 hover:no-underline`}
                    href={entry.fields.link}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className={rowClass}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
        <Shell
          className="mt-10 text-base leading-7"
          cwd={['log']}
          delayMs={contentAt + TIMING.content + items.length * TIMING.stagger + 80}
        />
      </section>
    </main>
  );
}
