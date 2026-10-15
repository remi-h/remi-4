import type { BlackHole } from './blackhole/engine';

/**
 * `rm -rf` at the prompt: rm refuses (lib/shell.ts), the site sighs and gives in, and a black hole drinks
 * it (lib/blackhole/, drawn with vgpu; without WebGPU the blocks spiral into the middle instead). Every block drops off
 * the page, a plain server error is all that is left, and then everything comes back from "backup".
 * Nothing is deleted; with reduced motion the page simply cuts to the error and back.
 */

/**
 * What the site adds under rm's refusal, as shell comments: narration, not output, so nothing here
 * pretends to be bash. Times in ms after the command.
 */
export const RM_RF_NOTES = [
  { at: 900, text: "# hmm. that's not allowed, you're a guest here." },
  { at: 2200, text: "# ...but if that's what you want..." },
] as const;
/** When the hole opens (ms after the command). */
export const FALL_AT = 3400;
/** How long the server error stays up (ms), unless the visitor clicks or presses a key. */
const OUTAGE_MS = 4500;
export const RESTORED_NOTE = '# just kidding. restored from backup, nothing was deleted.';

const OUTAGE_TITLE = '503 Service Unavailable';

/** The blocks that get pulled in: the header, the footer, and what is in <main>, big containers split up. */
function pieces(): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  for (const block of document.querySelectorAll<HTMLElement>('main > *')) {
    const parts = [...block.children].filter((c): c is HTMLElement => c instanceof HTMLElement);
    blocks.push(...(parts.length >= 2 && block.getBoundingClientRect().height > 240 ? parts : [block]));
  }
  const frame = [...document.querySelectorAll<HTMLElement>('body header, body footer')];
  return [...frame, ...blocks];
}

/** Without WebGPU: a block spirals into the middle of the screen and is gone. */
function spiral(element: HTMLElement): Animation | null {
  const rect = element.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) return null;
  const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
  const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
  const turn = dx < 0 ? -1 : 1;
  return element.animate(
    [
      { transform: 'none', opacity: 1 },
      {
        transform: `translate(${dx * 0.5 - dy * 0.3}px, ${dy * 0.5 + dx * 0.3}px) rotate(${turn * 120}deg) scale(0.5)`,
        opacity: 1,
      },
      { transform: `translate(${dx}px, ${dy}px) rotate(${turn * 360}deg) scale(0)`, opacity: 0 },
    ],
    // Ease-in: slow at first, then it goes all at once.
    {
      duration: 1400 + Math.random() * 500,
      delay: Math.random() * 500,
      easing: 'cubic-bezier(0.6, 0, 0.9, 0.4)',
      fill: 'both',
    },
  );
}

/** A bare server error page, as if the site were gone. Click or any key brings it back sooner. */
function outagePage(): { element: HTMLElement; dismissed: Promise<void> } {
  const element = document.createElement('div');
  element.setAttribute('role', 'alert');
  element.dataset.testid = 'outage';
  element.setAttribute(
    'style',
    'position:fixed;inset:0;z-index:200;background:#fff;color:#000;font:16px/1.4 "Times New Roman",Times,serif;padding:8px;cursor:default',
  );
  element.innerHTML = `<h1 style="text-align:center;font-size:2em;font-weight:bold;margin:.67em 0">${OUTAGE_TITLE}</h1><hr style="border:0;border-top:1px solid #aaa"><p style="text-align:center;margin:8px 0">nginx</p>`;
  document.body.appendChild(element);
  const dismissed = new Promise<void>((done) => {
    const finish = () => {
      clearTimeout(timer);
      element.removeEventListener('click', finish);
      window.removeEventListener('keydown', finish);
      done();
    };
    const timer = setTimeout(finish, OUTAGE_MS);
    element.addEventListener('click', finish);
    window.addEventListener('keydown', finish);
  });
  return { element, dismissed };
}

/** Runs the whole thing and resolves once the page is back as it was. `hole` is being prepared meanwhile. */
export async function collapseSite(still: boolean, hole: Promise<BlackHole | null>): Promise<void> {
  const gpu = still ? null : await hole;
  const pulled: Animation[] = [];
  if (gpu) await gpu.swallow();
  else if (!still) {
    for (const element of pieces()) {
      const animation = spiral(element);
      if (animation) pulled.push(animation);
    }
    await Promise.all(pulled.map((a) => a.finished));
  }
  const title = document.title;
  document.title = OUTAGE_TITLE;
  const outage = outagePage();
  await outage.dismissed;
  outage.element.remove();
  document.title = title;
  // Restored from backup: the hole gives everything back.
  if (gpu) await gpu.spit();
  pulled.forEach((a) => {
    a.updatePlaybackRate(1.8);
    a.reverse();
  });
  await Promise.all(pulled.map((a) => a.finished));
  pulled.forEach((a) => a.cancel());
  gpu?.dispose();
}
