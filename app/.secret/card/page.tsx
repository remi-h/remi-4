import type { CSSProperties } from 'react';
import { SecretCard } from '@/components/SecretCard';
import { Shell } from '@/components/Shell';
import { TerminalSession } from '@/components/TerminalSession';
import { commands, schedule } from '@/lib/terminal';

export const metadata = {
  title: 'card',
  description: 'A business card.',
  robots: { index: false, follow: false },
};

// ~/.secret/card: Remi's business card, in holographic foil and glass (SecretCard).
export default function SecretCardPage() {
  const steps = [{ cwd: '~', command: commands.toCard }];
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: false })));

  return (
    <main className="px-4 sm:px-8">
      <TerminalSession className="pt-10 text-[15px] leading-7 sm:pt-14" steps={steps} />
      <div className="t-in mt-8 max-w-[760px]" style={{ '--d': `${contentAt}ms` } as CSSProperties}>
        <SecretCard />
      </div>
      <Shell className="mt-10 pb-24 text-base leading-7" cwd={['.secret', 'card']} delayMs={contentAt + 150} />
    </main>
  );
}
