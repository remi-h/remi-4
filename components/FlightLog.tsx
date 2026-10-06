import type { CSSProperties } from 'react';
import { Window } from '@/components/Window';

const CELLS = 24;
const FLY_MS = 2400;

/**
 * Tokyo to Stockholm as a package-install log: the plane steps along the route while the
 * bar and percentage fill, then it lands. Pure CSS (.flight-* in globals.css); with reduced
 * motion it shows the landed state.
 */
export const FlightLog = ({
  delayMs,
  className,
  style,
}: {
  delayMs: number;
  className?: string;
  style?: CSSProperties;
}) => {
  const vars = { '--cells': CELLS, '--fly': `${FLY_MS}ms`, '--d': `${delayMs}ms` } as CSSProperties;
  return (
    <Window className={className} meta="[ relocating ]" style={style} title="tokyo → stockholm">
      <div className="overflow-x-auto px-4 py-[18px] text-[13.5px] leading-[1.9]" data-testid="flight-log" style={vars}>
        <div>
          <span className="text-muted">resolving route</span> <span className="text-yellow">tokyo</span>{' '}
          <span className="text-muted">→</span> <span className="text-yellow">stockholm</span>
        </div>
        <div className="whitespace-pre">
          <span className="text-cyan">HND</span>{' '}
          <span aria-hidden="true" className="relative inline-block align-bottom" style={{ width: `${CELLS}ch` }}>
            <span className="text-line-2">{'·'.repeat(CELLS)}</span>
            <span className="flight-fill absolute left-0 top-0 text-muted">{'─'.repeat(CELLS - 1)}</span>
            <span className="flight-plane absolute top-0 inline-block w-[1ch] text-center text-hot">✈</span>
          </span>{' '}
          <span className="text-cyan">ARN</span>
        </div>
        <div className="whitespace-pre">
          <span className="text-muted">[</span>
          <span aria-hidden="true" className="relative inline-block align-bottom" style={{ width: `${CELLS}ch` }}>
            <span className="text-line-2">{'░'.repeat(CELLS)}</span>
            <span className="flight-fill absolute left-0 top-0 text-cyan">{'█'.repeat(CELLS)}</span>
          </span>
          <span className="text-muted">]</span> <span aria-hidden="true" className="flight-pct text-fg" />
          <span className="sr-only">100%</span>
        </div>
        <div className="t-in" style={{ '--d': `${delayMs + FLY_MS}ms` } as CSSProperties}>
          <span className="text-cyan">✓</span> landed <span className="text-muted">·</span> based in stockholm
        </div>
      </div>
    </Window>
  );
};
