import { ImageResponse } from 'next/og';
import { ogFonts, palette as c } from '@/lib/og';

// The 樋口 seal from the header. DotGothic16 is drawn on a 16px grid, so two characters
// fit a 32px icon pixel for pixel.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.hot,
        color: c.ink,
        fontFamily: 'DotGothic16',
        fontSize: 16,
        lineHeight: 1,
      }}
    >
      樋口
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
