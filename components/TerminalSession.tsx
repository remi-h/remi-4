import type { CSSProperties, ReactNode } from 'react';
import { isTyped, schedule, USER_HOST } from '@/lib/terminal';

export type SessionStep = {
  /** Working directory shown in the prompt while this command runs. */
  cwd: string;
  command: string;
  output?: ReactNode;
};

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

export const Prompt = ({ cwd }: { cwd: string }) => (
  <>
    <span className="text-cyan">{USER_HOST}</span>
    <span className="text-muted">:{cwd}$</span>{' '}
  </>
);

/**
 * A few commands typed one after another, each followed by its output, ending on a fresh
 * prompt with a blinking cursor. Pure CSS: the full text is in the page from the start and
 * the animation only reveals it (see .t-type and .t-in in globals.css).
 */
export const TerminalSession = ({
  steps,
  className,
  endCwd,
}: {
  steps: SessionStep[];
  className?: string;
  /** Working directory for the closing prompt, when the last command changed it (e.g. `cd`). */
  endCwd?: string;
}) => {
  const timing = schedule(steps.map((step) => ({ command: step.command, hasOutput: step.output != null })));
  const closingCwd = endCwd ?? steps[steps.length - 1]?.cwd ?? '~';

  return (
    <div className={className}>
      {steps.map((step, i) => (
        <div key={`${step.cwd}-${step.command}`}>
          <div
            className="t-in overflow-x-auto overflow-y-hidden whitespace-pre-wrap"
            style={css({ '--d': `${timing.steps[i].promptAt}ms` })}
          >
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
      <div aria-hidden="true" className="t-in" style={css({ '--d': `${timing.endAt}ms` })}>
        <Prompt cwd={closingCwd} />
        <span className="t-cursor" style={css({ '--d': `${timing.endAt}ms` })} />
      </div>
    </div>
  );
};
