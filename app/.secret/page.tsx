import type { CSSProperties } from 'react';
import { SecretFlight } from '@/components/SecretFlight';
import { Shell } from '@/components/Shell';
import { TerminalSession } from '@/components/TerminalSession';
import { commands, schedule } from '@/lib/terminal';

export const metadata = {
  title: '.secret',
  description: 'A hidden page.',
  robots: { index: false, follow: false },
};

// A hidden folder: ls only lists it with -a. Inside, a flight home to Tokyo (SecretFlight).
export default function SecretPage() {
  const steps = [{ cwd: '~', command: commands.toSecret }];
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: false })));

  return (
    <main className="px-4 sm:px-8">
      <TerminalSession className="pt-10 text-[15px] leading-7 sm:pt-14" steps={steps} />
      <div className="t-in mt-8 max-w-[560px]" style={{ '--d': `${contentAt}ms` } as CSSProperties}>
        <p className="font-grotesk text-[21px] leading-[1.55] text-body" data-testid="secret-welcome">
          Congrats, you found a hidden page. Board the flight below to fly home to Haneda. There are more hidden things
          in here; good luck finding them.
        </p>
        <SecretFlight className="mt-8" />
      </div>
      <Shell className="mt-10 pb-24 text-base leading-7" cwd={['.secret']} delayMs={contentAt + 150} />
    </main>
  );
}
