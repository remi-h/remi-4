import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Font files for images rendered with next/og (the OG image and the icons).
// See assets/fonts/README.md for where they come from.
const font = (file: string) => readFile(join(process.cwd(), 'assets/fonts', file));

type Weight = 400 | 800;

export const ogFonts = async () => {
  const [mono, monoBold, grotesk, hi, guchi] = await Promise.all([
    font('jetbrains-mono-latin-400-normal.woff'),
    font('jetbrains-mono-latin-800-normal.woff'),
    font('familjen-grotesk-latin-400-normal.woff'),
    font('dotgothic16-hi-400-normal.woff'),
    font('dotgothic16-guchi-400-normal.woff'),
  ]);
  return [
    { name: 'JetBrains Mono', data: mono, weight: 400 as Weight, style: 'normal' as const },
    { name: 'JetBrains Mono', data: monoBold, weight: 800 as Weight, style: 'normal' as const },
    { name: 'Familjen Grotesk', data: grotesk, weight: 400 as Weight, style: 'normal' as const },
    { name: 'DotGothic16', data: hi, weight: 400 as Weight, style: 'normal' as const },
    { name: 'DotGothic16', data: guchi, weight: 400 as Weight, style: 'normal' as const },
  ];
};

/** The terminal palette from app/globals.css, for places that cannot read CSS variables. */
export const palette = {
  ink: '#07080c',
  panel: '#0c0e15',
  panel2: '#11141e',
  line: '#232a3b',
  fg: '#dfe3ee',
  body: '#b4bacb',
  muted: '#8a91a6',
  cyan: '#22e5d3',
  hot: '#ff4a2b',
} as const;
