import { Shell } from '@/components/Shell';
import { TerminalSession } from '@/components/TerminalSession';
import { commands, schedule } from '@/lib/terminal';

export const metadata = {
  title: '.secret',
  description: 'A hidden page.',
  robots: { index: false, follow: false },
};

// A hidden folder: ls only lists it with -a, and the page is a blank for now.
export default function SecretPage() {
  const steps = [{ cwd: '~', command: commands.toSecret }];
  const { contentAt } = schedule(steps.map((s) => ({ command: s.command, hasOutput: false })));

  return (
    <main className="px-4 sm:px-8">
      <TerminalSession className="pt-10 text-[15px] leading-7 sm:pt-14" steps={steps} />
      <Shell className="mt-10 pb-24 text-base leading-7" cwd={['.secret']} delayMs={contentAt + 150} />
    </main>
  );
}
