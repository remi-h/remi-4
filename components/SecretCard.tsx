'use client';

import { type MouseEvent, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Window } from '@/components/Window';
import { CARD_LINKS } from '@/lib/card/faces';
import { isFlipKey, type KeyPress } from '@/lib/card/motion';
import { type Card, createCard, phoneNeedsPermission } from '@/lib/card/renderer';
import { ABOUT } from '@/lib/shell';

type Status = 'loading' | 'ready' | 'unsupported';

const STATUS_TEXT: Record<Status, string> = {
  loading: 'printing…',
  ready: 'move the mouse or tilt your phone · click or f flips it',
  unsupported: 'this card needs a browser with webgpu',
};

/** Sets the card up in `frameRef`, and tears it down on unmount or when the GPU goes away. */
function useCard(frameRef: RefObject<HTMLDivElement | null>) {
  const cardRef = useRef<Card | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [askTilt, setAskTilt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Each setup gets its own canvas: a WebGPU context belongs to one device, so React's development
    // double mount must never hand the second card a canvas the first one is still tearing down.
    const canvas = document.createElement('canvas');
    canvas.className = 'block h-full w-full';
    frameRef.current!.appendChild(canvas);
    const lost = () => {
      cardRef.current?.dispose();
      cardRef.current = null;
      if (!cancelled) setStatus('unsupported');
    };
    void createCard(canvas, lost)
      .catch((error: unknown) => {
        console.warn('[card] could not set up:', error);
        return null;
      })
      .then((card) => {
        if (cancelled) return card?.dispose();
        cardRef.current = card;
        setStatus(card ? 'ready' : 'unsupported');
        setAskTilt(Boolean(card) && phoneNeedsPermission());
      });
    return () => {
      cancelled = true;
      cardRef.current?.dispose();
      cardRef.current = null;
      canvas.remove();
    };
  }, [frameRef]);

  const followPhone = () => {
    void cardRef.current?.followPhone().then((following) => following && setAskTilt(false));
  };
  return { cardRef, status, askTilt, followPhone };
}

/**
 * Remi's business card, drawn with vgpu (lib/card/): holographic foil, glitter and a glass coat that
 * catch a light which follows the mouse, or the phone's tilt. Click or press f to turn it over. The
 * canvas is decoration; the card's text and links are real elements under it.
 */
export const SecretCard = ({ className }: { className?: string }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const { cardRef, status, askTilt, followPhone } = useCard(frameRef);
  const [back, setBack] = useState(false);

  const flip = useCallback(() => {
    if (cardRef.current) setBack(cardRef.current.flip());
  }, [cardRef]);

  // The links printed on the back open like links; a click anywhere else on the card turns it over.
  const onCardClick = (e: MouseEvent) => {
    const link = cardRef.current?.linkAt(e.clientX, e.clientY);
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
    else flip();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFlipKey(e as KeyPress)) flip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip]);

  return (
    <Window className={className} meta={back ? '[ back ]' : '[ front ]'} title="business card">
      <div data-testid="secret-card">
        <div
          aria-hidden="true"
          className={`aspect-3/2 w-full touch-none sm:aspect-16/10 ${status === 'ready' ? 'cursor-pointer' : ''}`}
          onClick={onCardClick}
          ref={frameRef}
        />
        <div className="border-t border-line px-4 py-4.5 text-[13.5px] leading-[1.9]">
          <p className="sr-only">
            {ABOUT.name}, {ABOUT.role}.
          </p>
          <div className="flex flex-wrap gap-x-4">
            {CARD_LINKS.map((link) => (
              <a href={link.href} key={link.label} rel="noopener noreferrer" target="_blank">
                {link.label}
              </a>
            ))}
          </div>
          <CardControls askTilt={askTilt} flip={flip} followPhone={followPhone} status={status} />
        </div>
      </div>
    </Window>
  );
};

type ControlsProps = { status: Status; askTilt: boolean; flip: () => void; followPhone: () => void };

const CardControls = ({ status, askTilt, flip, followPhone }: ControlsProps) => (
  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
    <button
      className="border border-cyan px-3 text-cyan hover:bg-cyan hover:text-ink disabled:border-line-2 disabled:text-muted"
      disabled={status !== 'ready'}
      onClick={flip}
      type="button"
    >
      [ flip ]
    </button>
    {askTilt ? (
      <button className="text-cyan hover:underline" onClick={followPhone} type="button">
        [ tilt with your phone ]
      </button>
    ) : null}
    <span className="text-muted">{STATUS_TEXT[status]}</span>
  </div>
);
