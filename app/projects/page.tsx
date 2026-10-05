import { ProjectsTile } from '@/components/ProjectsTile';
import { TerminalSession } from '@/components/TerminalSession';
import { commands, schedule } from '@/lib/terminal';

export const metadata = {
  title: 'Projects',
  description: 'Selected work and case studies.',
};

export default function ProjectsPage() {
  const steps = [{ cwd: '~', command: commands.toProjects }];
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: false })));

  return (
    <main className="px-4 sm:px-8">
      <TerminalSession className="pt-10 text-[15px] leading-7 sm:pt-14" endCwd="~/projects" steps={steps} />

      <div className="t-in" style={{ '--d': `${contentAt}ms` } as React.CSSProperties}>
        <div className="flex flex-wrap items-end justify-between gap-5 pb-8 pt-12 sm:pt-16">
          <h1 className="text-[clamp(44px,8vw,112px)] font-extrabold leading-none tracking-[-0.045em]">projects/</h1>
          <p className="font-jp pb-2 text-lg text-muted">{'// プロジェクト'}</p>
        </div>
        <p className="font-grotesk mb-8 max-w-xl text-xl leading-normal text-body">
          Selected work and case studies. Some projects require a login to view.
        </p>
      </div>
      <section className="border-t border-line pb-24 pt-8">
        <ProjectsTile delayMs={contentAt + 150} titleAs="h2" />
      </section>
    </main>
  );
}
