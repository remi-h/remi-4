'use client';

import { type CSSProperties, type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Window } from '@/components/Window';
import { PLANE_PATH } from '@/lib/flight/atlas';
import { type Flight, type FlightState, prepareFlight } from '@/lib/flight/engine';
import { routePosition } from '@/lib/flight/route';
import { CabinSound } from '@/lib/flight/sound';
import { DISTANCE_KM, readout } from '@/lib/flight/timeline';

type Status = 'loading' | 'ready' | 'unsupported';

/** Arrow keys move along the route this far (shift: five times as far). */
const ARROW_STEP = 0.01;

/**
 * Stockholm → Tokyo on /.secret. The window waits on the page with the plane on its runway; WebGPU,
 * the atmosphere and every shader warm up in the background as soon as the page loads, so pressing
 * board starts at once. The canvas then takes over the browser window (lib/flight/), and landing
 * hands it back to this page, which now says it landed.
 */
export const SecretFlight = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planeRef = useRef<SVGSVGElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<Flight | null>(null);
  const soundRef = useRef<CabinSound | null>(null);
  const arrivingRef = useRef(false);
  const [status, setStatus] = useState<Status>('loading');
  const [state, setState] = useState<FlightState>({ scene: 'idle', hud: false, progress: 0 });
  const [sound, setSound] = useState(true);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let canvas: HTMLCanvasElement | null = null;
    let retries = 0;

    // Each setup gets its own canvas: a WebGPU context belongs to one device, so a remount
    // (React's development double mount) or a lost device must never reuse the old one.
    const setup = () => {
      canvas = document.createElement('canvas');
      canvas.className = 'invisible fixed inset-0 z-[100] block h-full w-full';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('data-snapshot-skip', '');
      document.body.appendChild(canvas);
      canvasRef.current = canvas;
      setStatus('loading');
      const onBroken = () => {
        flightRef.current?.dispose();
        flightRef.current = null;
        canvas?.remove();
        if (!cancelled && retries++ < 3) setup();
        else setStatus('unsupported');
      };
      const onChange = (next: FlightState) => {
        setState(next);
        // The page shows its landed state under the canvas before the arrival board snapshots it.
        if (next.scene === 'landing') setLanded(true);
      };
      void prepareFlight(canvas, onChange, onBroken)
        .catch((error: unknown) => {
          console.warn('[flight] could not set up:', error);
          return null;
        })
        .then((flight) => {
          if (cancelled) return flight?.dispose();
          flightRef.current = flight;
          setStatus(flight ? 'ready' : 'unsupported');
        });
    };
    setup();
    soundRef.current = new CabinSound();
    return () => {
      cancelled = true;
      flightRef.current?.dispose();
      flightRef.current = null;
      soundRef.current?.dispose();
      canvas?.remove();
    };
  }, []);

  const flying = state.scene !== 'idle';
  useEffect(() => {
    canvasRef.current?.classList.toggle('invisible', !flying);
  }, [flying]);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const board = useCallback(() => {
    const flight = flightRef.current;
    if (!flight || !planeRef.current) return;
    arrivingRef.current = false;
    flight.board(planeRef.current, reduced());
    if (reduced()) soundRef.current?.cruise();
    else soundRef.current?.board();
  }, []);

  // Fly again from the landed page: put the plane back at Arlanda first, so the snapshot shows it there.
  const flyAgain = () => {
    setLanded(false);
    requestAnimationFrame(() => requestAnimationFrame(board));
  };

  const toggleSound = useCallback(() => {
    const next = !(soundRef.current?.enabled ?? true);
    soundRef.current?.setEnabled(next);
    setSound(next);
  }, []);

  const land = useCallback(() => {
    flightRef.current?.land();
  }, []);

  const skip = useCallback(() => {
    flightRef.current?.skip();
    soundRef.current?.cruise();
  }, []);

  // Landing: the page switches to its landed state under the canvas, then the arrival board snapshots it.
  useEffect(() => {
    if (state.scene !== 'landing' || !landed || arrivingRef.current || !planeRef.current) return;
    arrivingRef.current = true;
    soundRef.current?.arrive();
    const plane = planeRef.current;
    requestAnimationFrame(() => requestAnimationFrame(() => flightRef.current?.arrive(plane)));
  }, [state.scene, landed]);

  // No scrolling under the flight. Esc skips the boarding or lands; ← → fly along the route.
  useEffect(() => {
    if (!flying) return;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleSound();
        return;
      }
      if (e.key === 'Escape') {
        if (state.scene === 'boarding') skip();
        else if (state.scene === 'flight') land();
        return;
      }
      if (!state.hud || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      // The slider handles its own arrows when it has focus.
      if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'range') return;
      e.preventDefault();
      const step = ARROW_STEP * (e.shiftKey ? 5 : 1) * (e.key === 'ArrowLeft' ? -1 : 1);
      flightRef.current?.nudge(step);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [flying, state.scene, state.hud, skip, land, toggleSound]);

  useEffect(() => {
    if (flightRef.current) flightRef.current.hud = hudRef.current ?? undefined;
  }, [state.hud]);

  const onPointerMove = (e: PointerEvent) => {
    flightRef.current?.setLook((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2);
  };

  const info = readout(state.progress);
  const where = routePosition(state.progress);
  const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

  return (
    <>
      <Window className={className} meta={landed ? '[ landed ]' : '[ boarding ]'} title="stockholm → tokyo">
        <div className="px-4 py-4.5 text-[13.5px] leading-[1.9]" data-testid="secret-flight">
          <div aria-live="polite">
            <span className="text-muted">flight</span> <span className="text-yellow">ARN</span>{' '}
            <span className="text-muted">→</span> <span className="text-yellow">HND</span>{' '}
            {landed ? (
              <span className="text-muted">
                · landed · <span className="font-jp text-fg">おかえり</span>
              </span>
            ) : (
              <span className="text-muted">· gate 0 · {DISTANCE_KM} km</span>
            )}
          </div>
          <div aria-hidden="true" className="relative my-3 h-6">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line-2" />
            <svg
              className={`absolute top-1/2 -translate-y-1/2 ${landed ? 'right-0' : 'left-0'}`}
              height="18"
              ref={planeRef}
              viewBox="0 0 24 24"
              width="18"
            >
              <path d={PLANE_PATH} fill="var(--color-hot)" />
            </svg>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              className="border border-cyan px-3 text-cyan hover:bg-cyan hover:text-ink disabled:border-line-2 disabled:text-muted"
              disabled={status !== 'ready'}
              onClick={landed ? flyAgain : board}
              type="button"
            >
              {landed ? '[ fly again ]' : '[ board ]'}
            </button>
            <button className="text-muted hover:text-cyan" onClick={toggleSound} type="button">
              sound: {sound ? 'on' : 'off'}
            </button>
            <span className="text-muted">
              {status === 'unsupported'
                ? 'this flight needs a browser with webgpu'
                : status === 'loading'
                  ? 'preparing…'
                  : 'esc lands you back here'}
            </span>
          </div>
        </div>
      </Window>

      {flying
        ? createPortal(
          <div
            className="fixed inset-0 z-101 select-none font-mono text-[13px] text-fg"
            data-snapshot-skip
            onClick={state.scene === 'boarding' ? skip : undefined}
            onPointerMove={onPointerMove}
          >
            {state.scene === 'boarding' ? (
              <>
                <button
                  className="absolute bottom-4 left-5 border border-line bg-ink/85 px-3 py-1 text-fg hover:border-cyan hover:text-cyan"
                  onClick={(e) => {
                    // A click elsewhere skips the boarding; this one only mutes.
                    e.stopPropagation();
                    toggleSound();
                  }}
                  type="button"
                >
                  {sound ? '♪ sound on · press m to mute' : 'sound off · press m to unmute'}
                </button>
                <span className="absolute bottom-4 right-5 text-muted">click or esc to skip</span>
              </>
            ) : null}
            {state.hud ? (
              <>
                <HeadUpDisplay
                  altitude={info.altitude}
                  heading={where.heading}
                  hudRef={hudRef}
                  lat={where.lat}
                  lon={where.lon}
                />
                <div className="absolute right-5 top-4 flex gap-4">
                  <button className="text-muted hover:text-cyan" onClick={toggleSound} type="button">
                    sound: {sound ? 'on' : 'off'}
                  </button>
                  <button className="text-muted hover:text-cyan" onClick={board} type="button">
                    replay
                  </button>
                  <button className="text-cyan" onClick={land} type="button">
                    esc · land
                  </button>
                </div>
                <label className="absolute inset-x-0 bottom-5 mx-auto block w-[min(480px,85vw)] text-center text-muted">
                  <span className="mb-1 block">
                    <span className="text-yellow">ARN</span> → <span className="text-yellow">HND</span> ·{' '}
                    {spaced(info.km)} km to go
                  </span>
                  <input
                    aria-label="flight progress, Stockholm to Tokyo"
                    className="block w-full accent-cyan"
                    max={1}
                    min={0}
                    onChange={(e) => flightRef.current?.setProgress(Number(e.target.value))}
                    step={0.001}
                    type="range"
                    value={state.progress}
                  />
                  <span className="mt-1 block">drag or ← → to fly · move to look around</span>
                </label>
              </>
            ) : null}
          </div>,
          document.body,
        )
        : null}
    </>
  );
};

/** Degrees to screen height with the camera's 60° vertical field of view: (50vh / tan 30°) · π/180. */
const DEG = '1.5115vh';
const GLOW: CSSProperties = {
  textShadow: '0 0 6px rgba(34, 229, 211, 0.55)',
  filter: 'drop-shadow(0 0 3px rgba(34, 229, 211, 0.45))',
};

/**
 * A head-up display in the terminal's cyan, as if projected on the glass: horizon and pitch ladder, the
 * flight path marker (where the plane is going, which moves as you look around), a heading tape, and speed
 * and altitude. The engine writes the view's pitch and yaw into --pitch and --yaw every frame, so the
 * symbols track the sky without a React render.
 */
function HeadUpDisplay({
  hudRef,
  heading,
  altitude,
  lat,
  lon,
}: {
  hudRef: React.RefObject<HTMLDivElement | null>;
  heading: number;
  altitude: number;
  lat: number;
  lon: number;
}) {
  const ladder = [-10, -5, 5, 10];
  const ticks: number[] = [];
  for (let d = Math.ceil((heading - 70) / 5) * 5; d <= heading + 70; d += 5) ticks.push(d);
  const label = (d: number) => String(Math.round((((d % 360) + 360) % 360) / 10)).padStart(2, '0');
  const dms = (v: number, pos: string, neg: string, width: number) => {
    const a = Math.abs(v);
    return `${v >= 0 ? pos : neg} ${String(Math.floor(a)).padStart(width, '0')}°${String(Math.floor((a % 1) * 60)).padStart(2, '0')}′`;
  };
  const feet = Math.round((altitude * 3.28084) / 100) * 100;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 text-[12px] text-cyan"
      ref={hudRef}
      style={{ ...GLOW, '--pitch': -2, '--yaw': 0 } as CSSProperties}
    >
      {/* Earth-fixed: the horizon sits at the view's pitch below the centre. */}
      <div
        className="absolute left-1/2 top-1/2 h-0 w-[min(44vw,520px)]"
        style={{ transform: `translate(-50%, calc(var(--pitch) * ${DEG}))` }}
      >
        <div className="absolute inset-x-0 top-0 flex justify-between">
          <span className="block h-px w-[38%] bg-cyan" />
          <span className="block h-px w-[38%] bg-cyan" />
        </div>
        {ladder.map((k) => (
          <div
            className="absolute inset-x-[18%] flex items-center justify-between"
            key={k}
            style={{ top: `calc(${-k} * ${DEG})` }}
          >
            <span className="-translate-x-full pr-1">{Math.abs(k)}</span>
            <span className={`mx-1 block h-px flex-1 ${k < 0 ? 'border-t border-dashed border-cyan' : 'bg-cyan'}`} />
            <span className="block w-[34%]" />
            <span className={`mx-1 block h-px flex-1 ${k < 0 ? 'border-t border-dashed border-cyan' : 'bg-cyan'}`} />
            <span className="translate-x-full pl-1">{Math.abs(k)}</span>
          </div>
        ))}
        {/* Flight path marker: level flight, straight ahead along the route. */}
        <svg
          className="absolute top-0 -translate-x-1/2 -translate-y-1/2 overflow-visible"
          height="14"
          style={{ left: `calc(50% - var(--yaw) * ${DEG})` }}
          width="44"
        >
          <circle cx="22" cy="7" fill="none" r="5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M0 7h17M27 7h17M22 2V-3" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Aircraft-fixed: the boresight. */}
      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" height="10" width="30">
        <path d="M0 2h9l6 6 6-6h9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>

      {/* Heading tape. */}
      <div className="absolute left-1/2 top-20 h-8 sm:top-12 w-[min(40vw,420px)] -translate-x-1/2 overflow-hidden mask-[linear-gradient(90deg,transparent,#000_20%,#000_80%,transparent)]">
        <div className="absolute inset-0" style={{ transform: `translateX(calc(var(--yaw) * -1 * ${DEG}))` }}>
          {ticks.map((d) => (
            <span
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              key={d}
              style={{ left: `calc(50% + ${(d - heading).toFixed(2)} * ${DEG})` }}
            >
              <span className={`block w-px bg-cyan ${d % 10 === 0 ? 'h-2.5' : 'h-1.5'}`} />
              {d % 10 === 0 ? <span className="mt-0.5 leading-none">{label(d)}</span> : null}
            </span>
          ))}
        </div>
      </div>
      <span className="absolute left-1/2 top-29 -translate-x-1/2 sm:top-21">▲</span>

      {/* Speed and altitude. */}
      <div className="absolute left-[max(20px,calc(50%-min(30vw,360px)))] top-1/2 -translate-y-1/2 border border-cyan px-2 py-1 leading-5">
        <div>M .84</div>
        <div>GS 488</div>
      </div>
      <div className="absolute right-[max(20px,calc(50%-min(30vw,360px)))] top-1/2 -translate-y-1/2 border border-cyan px-2 py-1 text-right leading-5">
        <div>{feet >= 18000 ? `FL${String(Math.round(feet / 100)).padStart(3, '0')}` : `${feet} FT`}</div>
        <div>{Math.round(altitude / 10) * 10} M</div>
      </div>

      <div className="absolute left-5 top-11 leading-5 sm:top-4">
        <div>
          HDG {String(Math.round(heading) % 360).padStart(3, '0')}° · {dms(lat, 'N', 'S', 2)} {dms(lon, 'E', 'W', 3)}
        </div>
      </div>
    </div>
  );
}
