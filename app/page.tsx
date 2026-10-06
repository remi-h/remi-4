import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ProjectsTile } from '@/components/ProjectsTile';
import { TerminalSession } from '@/components/TerminalSession';
import { FlightLog } from '@/components/FlightLog';
import { Shell } from '@/components/Shell';
import { Prompt } from '@/components/TerminalSession';
import { ABOUT } from '@/lib/shell';
import { commands, schedule, TIMING } from '@/lib/terminal';

const steps = [
  {
    cwd: '~',
    command: commands.about,
    output: (
      <div className="pb-2 pt-5">
        <h1 className="text-[clamp(38px,7.2vw,104px)] font-extrabold leading-none tracking-[-0.045em]">{ABOUT.name}</h1>
        <p className="mt-7 text-[clamp(16px,1.6vw,22px)] leading-normal">
          <span className="text-hot">&gt;</span> Experience Designer <span className="text-muted">&amp;</span> Software
          Engineer
        </p>
        <p className="font-grotesk mt-7 max-w-[560px] text-[21px] leading-[1.55] text-body">{ABOUT.intro}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            className="border border-cyan px-[18px] py-3 text-sm text-cyan hover:bg-cyan hover:text-ink hover:no-underline"
            href="/projects"
          >
            {commands.toProjects} ↵
          </Link>
          <Link
            className="border border-line-2 px-[18px] py-3 text-sm hover:border-cyan hover:no-underline"
            href="/log"
          >
            {commands.toLog} ↵
          </Link>
        </div>
      </div>
    ),
  },
];

export default function Home() {
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: true })));
  const at = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <main className="px-4 sm:px-8">
      <section className="flex flex-wrap items-start justify-between gap-12 py-12 sm:py-20">
        <TerminalSession className="min-w-0 flex-[1_1_600px] text-lg" steps={steps} />

        <FlightLog className="t-in min-w-[min(100%,300px)] flex-[0_1_460px]" delayMs={450} style={at(150)} />
      </section>

      <section className="pb-24">
        <div
          className="t-in mb-8 flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-5"
          style={at(contentAt)}
        >
          <h2 className="text-lg font-medium">
            <Prompt cwd="~" />
            {commands.featured} <span className="font-jp text-muted">{'# プロジェクト'}</span>
          </h2>
          <Link className="text-sm text-cyan" href="/projects">
            view all →
          </Link>
        </div>
        <ProjectsTile delayMs={contentAt + TIMING.content} featuredOnly />
        <Shell className="mt-10 text-base leading-7" cwd={[]} delayMs={contentAt + 300} />
      </section>
    </main>
  );
}
