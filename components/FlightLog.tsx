import type { CSSProperties } from 'react';
import { Window } from '@/components/Window';

const FLY_MS = 2400;
/** Tokyo (HND) to Stockholm (ARN) along the great circle, roughly. */
const DISTANCE_KM = 8170;

/**
 * Tokyo to Stockholm as a package-install log, full width at any size: the plane climbs
 * from HND, tilts over the top and comes down at ARN, drawing its contrail, while the
 * progress bar fills and the distance counts up. The arc is a parabola, so the plane can
 * follow it with a constant left-to-right move and a rise-and-fall on top (see .flight-* in
 * globals.css). Reduced motion shows it landed.
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
  const vars = { '--fly': `${FLY_MS}ms`, '--d': `${delayMs}ms`, '--km': DISTANCE_KM } as CSSProperties;
  const landed = { '--d': `${delayMs + FLY_MS}ms` } as CSSProperties;

  return (
    <Window className={className} meta="[ relocating ]" style={style} title="tokyo → stockholm">
      <div className="px-4 py-[18px] text-[13.5px] leading-[1.9]" data-testid="flight-log" style={vars}>
        <div>
          <span className="text-muted">resolving route</span> <span className="text-yellow">tokyo</span>{' '}
          <span className="text-muted">→</span> <span className="text-yellow">stockholm</span>
        </div>

        <div aria-hidden="true" className="relative my-2 h-[104px]">
          {/* The route box: HND at its bottom left, ARN at its bottom right. */}
          <div className="absolute inset-x-[6px] top-[8px] h-[68px]">
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {/* A quadratic curve whose x moves evenly: the same parabola the plane flies. */}
              <path
                d="M 0 100 Q 50 -100 100 100"
                stroke="var(--color-line-2)"
                strokeDasharray="2 6"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="flight-trail"
                d="M 0 100 Q 50 -100 100 100"
                stroke="var(--color-cyan)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span className="absolute bottom-0 left-0 size-[7px] -translate-x-1/2 translate-y-1/2 rounded-full bg-yellow" />
            <span className="flight-dest absolute bottom-0 right-0 size-[7px] translate-x-1/2 translate-y-1/2 rounded-full" />
            <span className="flight-ping absolute bottom-0 right-0 size-[7px] translate-x-1/2 translate-y-1/2 rounded-full border border-cyan" />
            <span className="flight-x absolute bottom-0 top-0">
              <span className="flight-y absolute left-0">
                <svg className="flight-tilt block" height="18" viewBox="0 0 24 24" width="18">
                  {/* A plane seen from above, nose to the right. */}
                  <path
                    d="M22 12c0-.8-.7-1.4-1.5-1.4H15L10 3H7.6l2.5 7.6H5.2L3.4 8H1.6l1.2 4-1.2 4h1.8l1.8-2.6h4.9L7.6 21H10l5-7.6h5.5c.8 0 1.5-.6 1.5-1.4z"
                    fill="var(--color-hot)"
                  />
                </svg>
              </span>
            </span>
          </div>
          <span className="absolute bottom-0 left-0 text-[12px] leading-none text-cyan">HND</span>
          <span className="absolute bottom-0 right-0 text-[12px] leading-none text-cyan">ARN</span>
        </div>

        <div className="flex items-center gap-[1ch]">
          <span aria-hidden="true" className="flight-track relative h-[1.1em] flex-1 border border-line-2">
            <span className="flight-fill absolute inset-y-0 left-0 bg-cyan" />
          </span>
          <span aria-hidden="true" className="flight-pct min-w-[4ch] text-right text-fg" />
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
