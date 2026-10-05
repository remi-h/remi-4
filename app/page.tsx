import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ProjectsTile } from '@/components/ProjectsTile';
import { TerminalSession } from '@/components/TerminalSession';
import { Window } from '@/components/Window';
import { commands, schedule } from '@/lib/terminal';

const intro =
  'I enjoy shaping experiences at the intersection of design and technology, and collaborating across disciplines to turn complexity into something intuitive and human.';

const steps = [
  {
    cwd: '~',
    command: commands.about,
    output: (
      <div className="pb-2 pt-5">
        <h1 className="text-[clamp(38px,7.2vw,104px)] font-extrabold leading-none tracking-[-0.045em]">Remi Higuchi</h1>
        <p className="mt-7 text-[clamp(16px,1.6vw,22px)] leading-normal">
          <span className="text-hot">&gt;</span> Experience Designer <span className="text-muted">&amp;</span> Software
          Engineer
        </p>
        <p className="font-grotesk mt-7 max-w-[560px] text-[21px] leading-[1.55] text-body">{intro}</p>
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
            {commands.log}
          </Link>
        </div>
      </div>
    ),
  },
];

const Code = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-4">
    <span className="w-3.5 text-right text-muted">{n}</span>
    <span>{children}</span>
  </div>
);

export default function Home() {
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: true })));
  const at = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <main className="px-4 sm:px-8">
      <section className="flex flex-wrap items-start justify-between gap-12 py-12 sm:py-20">
        <TerminalSession className="min-w-0 flex-[1_1_600px] text-lg" steps={steps} />

        <Window
          className="t-in min-w-[min(100%,300px)] flex-[0_1_460px]"
          meta="[ read-only ]"
          style={at(300)}
          title="about.ts"
        >
          <div className="overflow-x-auto px-4 py-[18px] text-[13.5px] leading-[1.75]">
            <Code n={1}>
              <span className="text-magenta">export const</span> <span className="text-cyan">remi</span> = {'{'}
            </Code>
            <Code n={2}>
              {'  '}
              <span className="text-cyan">roles</span>: [
              <span className="text-yellow">&quot;experience designer&quot;</span>,{' '}
              <span className="text-yellow">&quot;software engineer&quot;</span>],
            </Code>
            <Code n={3}>
              {'  '}
              <span className="text-cyan">focus</span>:{' '}
              <span className="text-yellow">&quot;design and technology&quot;</span>,
            </Code>
            <Code n={4}>
              {'  '}
              <span className="text-cyan">works</span>:{' '}
              <span className="text-yellow">&quot;across disciplines&quot;</span>,
            </Code>
            <Code n={5}>
              {'  '}
              <span className="text-cyan">makes</span>:{' '}
              <span className="text-yellow">&quot;complexity intuitive&quot;</span>,
            </Code>
            <Code n={6}>
              {'}'} <span className="text-magenta">as const</span>;
            </Code>
          </div>
        </Window>
      </section>

      <section className="pb-24">
        <div
          className="t-in mb-8 flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-5"
          style={at(contentAt)}
        >
          <h2 className="text-lg font-medium">
            <span className="text-cyan">$</span> {commands.featured}
            <span className="font-jp ml-3 text-muted">{'// プロジェクト'}</span>
          </h2>
          <Link className="text-sm text-cyan" href="/projects">
            view all →
          </Link>
        </div>
        <ProjectsTile delayMs={contentAt + 150} featuredOnly />
      </section>
    </main>
  );
}
