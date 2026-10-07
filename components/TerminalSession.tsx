import type { CSSProperties, ReactNode } from 'react';
import { isTyped, schedule, USER_HOST } from '@/lib/terminal';

export type SessionStep = {
  /** Working directory shown in the prompt while this command runs. */
  cwd: string;
  command: string;
  output?: ReactNode;
};

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

export const Prompt = ({ cwd, user = USER_HOST }: { cwd: string; user?: string }) => (
  <>
    <span className="text-cyan">{user}</span>
    <span className="text-muted">:{cwd}$</span>{' '}
  </>
);

/**
 * A few commands typed one after another, each followed by its output. Each page ends
 * with the working prompt (components/Shell.tsx) instead of a closing prompt here. Pure CSS: the full text is in the page from the start and
 * the animation only reveals it (see .t-type and .t-in in globals.css).
 */
export const TerminalSession = ({ steps, className }: { steps: SessionStep[]; className?: string }) => {
  const timing = schedule(steps.map((step) => ({ command: step.command, hasOutput: step.output != null })));

  return (
    <div className={className}>
      {steps.map((step, i) => (
        <div key={`${step.cwd}-${step.command}`}>
          <div className="t-in whitespace-pre-wrap" style={css({ '--d': `${timing.steps[i].promptAt}ms` })}>
            <Prompt cwd={step.cwd} />
            {isTyped(step.command) ? (
              <span
                className="t-type"
                style={css({ '--n': step.command.length, '--d': `${timing.steps[i].typeAt}ms` })}
              >
                {step.command}
              </span>
            ) : (
              <span className="break-all">{step.command}</span>
            )}
          </div>
          {step.output != null ? (
            <div className="t-in" style={css({ '--d': `${timing.steps[i].outputAt}ms` })}>
              {step.output}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
