import type { CSSProperties } from 'react';
import { InvestForm } from '@/components/InvestForm';
import { Shell } from '@/components/Shell';
import { TerminalSession } from '@/components/TerminalSession';
import { Window } from '@/components/Window';
import { commands, schedule, TIMING } from '@/lib/terminal';

const description = 'Become an investor in Remi Higuchi for any amount, even 10 kr, and get a quarterly report.';

export const metadata = { title: 'Investor', description };

// Laid out like the log page: the command, then the heading, then the content, then the working prompt.
export default function InvestorPage() {
  const steps = [{ cwd: '~', command: commands.toInvestor }];
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: false })));
  const at = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <main className="px-4 sm:px-8">
      <TerminalSession className="pt-10 text-[15px] leading-7 sm:pt-14" steps={steps} />

      <div className="t-in" style={at(contentAt)}>
        <div className="pb-8 pt-12 sm:pt-16">
          <h1 className="text-[clamp(44px,8vw,112px)] font-extrabold leading-none tracking-[-0.045em]">investor/</h1>
        </div>
        <p className="font-grotesk mb-10 max-w-3xl text-xl leading-normal text-body">
          Anyone who visits can be my investor, for any amount, even 10 kr. Investors get a quarterly report on what I
          built, what broke and what is next.
        </p>
      </div>
      <section className="grid gap-8 border-t border-line pb-24 pt-10 lg:grid-cols-2">
        <div className="t-in" style={at(contentAt + TIMING.content)}>
          <InvestForm />
        </div>
        <div className="t-in" style={at(contentAt + TIMING.content + TIMING.stagger)}>
          <Window title="Q4 2026 report" meta="sample">
            <div className="space-y-2 p-5 text-sm leading-6 text-body">
              <p>
                <span className="text-yellow">shipped</span> a portfolio that is a terminal
              </p>
              <p>
                <span className="text-yellow">broke</span> nothing that stayed broken
              </p>
              <p>
                <span className="text-yellow">next</span> more small things, made well
              </p>
              <p className="pt-2 text-muted"># this is a sample. Real reports are not sent yet.</p>
            </div>
          </Window>
        </div>
        <Shell
          className="text-base leading-7 lg:col-span-2"
          cwd={['investor']}
          delayMs={contentAt + TIMING.content + 2 * TIMING.stagger + 80}
        />
      </section>
    </main>
  );
}
