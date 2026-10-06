import type { CSSProperties } from 'react';
import { Window } from '@/components/Window';

const CELLS = 24;
const FLY_MS = 2400;
/** Tokyo (HND) to Stockholm (ARN) along the great circle, roughly. */
const DISTANCE_KM = 8170;

// The route is drawn in a fixed 300×104 box (narrow enough for a 375px phone) so the plane (an HTML element on a CSS motion
// path) and the SVG arc share the same pixel coordinates.
const W = 300;
const H = 104;
/** Where the cities sit: above their labels, at either end of the arc. */
const GROUND = 76;
const ROUTE = `M 12 ${GROUND} Q ${W / 2} -8 ${W - 12} ${GROUND}`;

/**
 * Tokyo to Stockholm as a package-install log: the plane takes off from HND, banks along
 * the arc drawing its contrail, and lands at ARN while the distance and progress bar fill.
 * Pure CSS (.flight-* in globals.css); with reduced motion it shows the landed state.
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
  const vars = {
    '--cells': CELLS,
    '--fly': `${FLY_MS}ms`,
    '--d': `${delayMs}ms`,
    '--km': DISTANCE_KM,
    '--route': `path('${ROUTE}')`,
  } as CSSProperties;
  const landed = { '--d': `${delayMs + FLY_MS}ms` } as CSSProperties;

  return (
    <Window className={className} meta="[ relocating ]" style={style} title="tokyo → stockholm">
      <div className="px-4 py-[18px] text-[13.5px] leading-[1.9]" data-testid="flight-log" style={vars}>
        <div>
          <span className="text-muted">resolving route</span> <span className="text-yellow">tokyo</span>{' '}
          <span className="text-muted">→</span> <span className="text-yellow">stockholm</span>
        </div>

        <div aria-hidden="true" className="relative my-2 max-w-full overflow-hidden" style={{ width: W, height: H }}>
          <svg className="absolute inset-0" fill="none" height={H} viewBox={`0 0 ${W} ${H}`} width={W}>
            {/* The planned route, then the contrail drawn over it as the plane flies. */}
            <path d={ROUTE} stroke="var(--color-line-2)" strokeDasharray="2 6" strokeWidth="1.5" />
            <path className="flight-route" d={ROUTE} pathLength={1} stroke="var(--color-cyan)" strokeWidth="1.5" />
            <circle cx="12" cy={GROUND} fill="var(--color-yellow)" r="3.5" />
            <circle className="flight-dest" cx={W - 12} cy={GROUND} r="3.5" />
            <circle className="flight-ping" cx={W - 12} cy={GROUND} fill="none" r="3.5" stroke="var(--color-cyan)" />
          </svg>
          <svg className="flight-jet absolute left-0 top-0" height="18" viewBox="0 0 24 24" width="18">
            {/* A plane seen from above, nose to the right. */}
            <path
              d="M22 12c0-.8-.7-1.4-1.5-1.4H15L10 3H7.6l2.5 7.6H5.2L3.4 8H1.6l1.2 4-1.2 4h1.8l1.8-2.6h4.9L7.6 21H10l5-7.6h5.5c.8 0 1.5-.6 1.5-1.4z"
              fill="var(--color-hot)"
            />
          </svg>
          <span className="absolute bottom-0 left-0 text-[12px] leading-none text-cyan">HND</span>
          <span className="absolute bottom-0 right-0 text-[12px] leading-none text-cyan">ARN</span>
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
        <div className="text-muted">
          distance <span aria-hidden="true" className="flight-km text-fg" />
          <span className="sr-only">{DISTANCE_KM} km</span>
        </div>
        <div className="t-in" style={landed}>
          <span className="text-cyan">✓</span> landed <span className="text-muted">·</span> based in stockholm
        </div>
      </div>
    </Window>
  );
};
