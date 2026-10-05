import Link from 'next/link';
import { TerminalSession } from '@/components/TerminalSession';
import { fetchLogs } from '@/lib/contentful';
import { commands } from '@/lib/terminal';

export const metadata = {
  title: 'Log',
  description: 'Updates',
};

/** yyyy-mm-dd in UTC, so the date never shifts with the server's time zone. */
const isoDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf()) ? date.toISOString().slice(0, 10) : '';
};

export default async function LogPage() {
  const { items } = await fetchLogs();

  const steps = [
    {
      cwd: '~',
      command: commands.log,
      output: (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {items.map((entry) => {
            const row = (
              <>
                <span className="text-muted">{isoDate(entry.fields.date)}</span>
                <span className="text-yellow">{entry.fields.org ?? ''}</span>
                <span className="font-grotesk text-xl text-fg group-hover:text-cyan">
                  {entry.fields.title ?? 'Untitled'}
                </span>
                <span className="text-cyan">{entry.fields.link ? '↗' : ''}</span>
              </>
            );
            const className =
              'group grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-x-6 gap-y-1 px-1 py-4 text-sm sm:grid-cols-[110px_200px_minmax(0,1fr)_auto]';
            return (
              <li key={entry.sys.id}>
                {entry.fields.link ? (
                  <Link
                    className={`${className} hover:bg-panel-2 hover:no-underline`}
                    href={entry.fields.link}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className={className}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      ),
    },
  ];

  return (
    <main className="px-4 pb-24 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5 pb-8 pt-12 sm:pt-16">
        <h1 className="text-[clamp(44px,8vw,112px)] font-extrabold leading-none tracking-[-0.045em]">log</h1>
        <p className="font-grotesk max-w-sm pb-2 text-xl leading-normal text-body">
          <span className="font-jp mb-2 block text-base text-muted">{'// ログ'}</span>
          Media coverage, conferences, and things I have done and am proud of.
        </p>
      </div>
      <TerminalSession className="text-[15px] leading-7" steps={steps} />
    </main>
  );
}
