import type { CSSProperties } from 'react';
import { SecretField } from '@/components/SecretField';
import { Shell } from '@/components/Shell';
import { Window } from '@/components/Window';
import { TerminalSession } from '@/components/TerminalSession';
import { commands, schedule } from '@/lib/terminal';

export const metadata = {
  title: '.secret',
  description: 'A hidden page.',
  robots: { index: false, follow: false },
};

// A hidden folder: ls only lists it with -a. The WebGPU field is a placeholder for now.
export default function SecretPage() {
  const steps = [{ cwd: '~', command: commands.toSecret }];
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: false })));

  return (
    <main className="px-4 sm:px-8">
      <TerminalSession className="pt-10 text-[15px] leading-7 sm:pt-14" steps={steps} />
      <Window className="t-in mt-8" meta="[ webgpu ]" style={{ '--d': `${contentAt}ms` } as CSSProperties} title="vgpu">
        <SecretField className="aspect-[16/9] max-h-[70vh]" />
      </Window>
      <Shell className="mt-10 pb-24 text-base leading-7" cwd={['.secret']} delayMs={contentAt + 150} />
    </main>
  );
}
