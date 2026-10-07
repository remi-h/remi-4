'use client';

import Link from 'next/link';
import { TerminalSession } from '@/components/TerminalSession';
import { useBrowserPathname, useMarkMissing } from '@/components/useCwd';
import { cdError, commands, missingPath } from '@/lib/terminal';

/** The 404 as a terminal: `cd` into the path that was asked for, and bash's answer. */
export const NotFoundSession = () => {
  const pathname = useBrowserPathname();
  useMarkMissing(pathname ?? '/_not-found');
  // The 404 is prerendered without a URL, so the command and bash's answer appear once the
  // browser knows which path was asked for; the heading and the way out are always there.
  const path = pathname === null ? null : missingPath(pathname);

  const steps = [
    {
      cwd: '~',
      command: path === null ? '' : commands.toPath(path),
      output: (
        <div className="pb-2 pt-1">
          {path === null ? null : (
            <p className="break-all text-hot" data-testid="cd-error">
              {cdError(path)}
            </p>
          )}
          <h1 className="mt-10 text-[clamp(44px,8vw,112px)] font-extrabold leading-none tracking-[-0.045em]">404</h1>
          <p className="font-grotesk mt-6 max-w-xl text-xl leading-normal text-body">
            This page does not exist, or it has moved. Try one of these instead.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              className="border border-cyan px-[18px] py-3 text-sm text-cyan hover:bg-cyan hover:text-ink hover:no-underline"
              href="/"
            >
              {commands.home} ↵
            </Link>
            <Link
              className="border border-line-2 px-[18px] py-3 text-sm hover:border-cyan hover:no-underline"
              href="/projects"
            >
              {commands.toProjects} ↵
            </Link>
          </div>
        </div>
      ),
    },
  ];

  return <TerminalSession className="pb-2 pt-10 text-[15px] leading-7 sm:pt-14" steps={steps} />;
};
