'use client';

import { usePathname } from 'next/navigation';
import { cwdFor } from '@/lib/terminal';

const social = [
  { href: 'https://linkedin.com/in/hremi', label: 'linkedin' },
  { href: 'https://instagram.com/remihiguchi', label: 'instagram' },
  { href: 'https://github.com/remi-h', label: 'github' },
];

/** A vim-style status line: mode, branch, current path, links and the stack this site is built with. */
export const Footer = () => {
  const pathname = usePathname();

  return (
    <footer className="relative z-10 mt-16 border-t border-line bg-panel text-[13px]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-stretch px-4 sm:px-8">
        <span className="bg-hot px-4 py-3 font-bold text-ink">NORMAL</span>
        <span className="px-4 py-3 text-muted">main</span>
        <span className="px-4 py-3">{cwdFor(pathname)}</span>
        <span className="flex-1" />
        {social.map(({ href, label }) => (
          <a className="px-3 py-3 text-body" href={href} key={label} rel="noopener noreferrer" target="_blank">
            {label}
          </a>
        ))}
        <span className="px-4 py-3 text-muted">Next.js · TypeScript · Tailwind</span>
        <span className="px-4 py-3 text-muted">© 2026 Remi Higuchi</span>
      </div>
    </footer>
  );
};
