'use client';

import Link from 'next/link';
import { useCwd } from '@/components/useCwd';
import { USER_HOST } from '@/lib/terminal';

// `hidden` tabs show only on hover or focus, and not at all on phones (no hover); `ls -a` finds the page too.
const tabs = [
  { href: '/.secret', label: '.secret', n: 0, hidden: true },
  { href: '/', label: 'home', n: 1 },
  { href: '/projects', label: 'projects', n: 2 },
  { href: '/log', label: 'log', n: 3 },
];

export const Navigation = () => {
  const { pathname, notFound, cwd } = useCwd();

  return (
    <header className="relative z-10 border-b border-line bg-ink">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 sm:px-8">
        <Link className="flex items-center gap-3 text-sm hover:no-underline" href="/">
          <span
            aria-hidden="true"
            className="font-jp inline-flex size-9 items-center justify-center bg-hot text-sm text-ink"
          >
            樋口
          </span>
          <span className="sr-only">Remi Higuchi</span>
          <span aria-hidden="true">
            <span className="text-cyan">{USER_HOST.split('@')[0]}</span>
            <span className="text-muted">
              @{USER_HOST.split('@')[1]} {cwd}
            </span>
          </span>
        </Link>
        <nav aria-label="Main" className="flex gap-1 text-sm">
          {tabs.map(({ href, label, n, hidden }) => {
            const active = notFound
              ? false
              : href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={`px-3.5 py-2.5 hover:no-underline ${
                  active ? 'bg-hot font-bold text-ink hover:text-ink' : 'text-muted hover:text-cyan'
                } ${hidden && !active ? 'opacity-0 hover:opacity-100 focus-visible:opacity-100 max-sm:hidden' : ''}`}
                href={href}
                key={href}
              >
                <span aria-hidden="true" className="opacity-70">
                  {n}
                </span>{' '}
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
