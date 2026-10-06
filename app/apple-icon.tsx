import { ImageResponse } from 'next/og';
import { ogFonts, palette as c } from '@/lib/og';

// The 樋口 seal at home-screen size (a multiple of 16px keeps DotGothic16 crisp).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
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
        fontSize: 64,
        lineHeight: 1,
      }}
    >
      樋口
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
