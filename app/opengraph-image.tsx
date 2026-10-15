import { ImageResponse } from 'next/og';
import { ogFonts, palette as c } from '@/lib/og';
import { commands, USER_HOST } from '@/lib/terminal';

export const alt = 'Remi Higuchi, Software Engineer & Designer, shown as a terminal session';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const Prompt = ({ cwd }: { cwd: string }) => (
  <div style={{ display: 'flex' }}>
    <span style={{ color: c.cyan }}>{USER_HOST}</span>
    <span style={{ color: c.muted }}>:{cwd}$</span>
  </div>
);

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: c.ink,
        backgroundImage: `linear-gradient(rgba(34, 229, 211, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 229, 211, 0.06) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        color: c.fg,
        fontFamily: 'JetBrains Mono',
        fontSize: 26,
      }}
    >
      {/* Header: the seal, the prompt and the tabs, as on the site. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '24px 56px',
          borderBottom: `1px solid ${c.line}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            backgroundColor: c.hot,
            color: c.ink,
            fontFamily: 'DotGothic16',
            fontSize: 26,
          }}
        >
          樋口
        </div>
        <span style={{ color: c.muted }}>{USER_HOST} ~</span>
        <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 22 }}>
          <span style={{ backgroundColor: c.hot, color: c.ink, fontWeight: 800, padding: '10px 18px' }}>1 home</span>
          <span style={{ color: c.muted, padding: '10px 18px' }}>2 projects</span>
          <span style={{ color: c.muted, padding: '10px 18px' }}>3 log</span>
        </div>
      </div>

      {/* The home page's session: cat about.txt and its output. */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '48px 56px 0' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <Prompt cwd="~" />
          <span>{commands.about}</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 112, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1 }}>
          Remi Higuchi
        </div>
        <div style={{ display: 'flex', marginTop: 30, fontSize: 32 }}>
          <span style={{ color: c.hot }}>&gt;&nbsp;</span>
          <span>Software Engineer&nbsp;</span>
          <span style={{ color: c.muted }}>&amp;</span>
          <span>&nbsp;Designer</span>
        </div>
        <div style={{ marginTop: 22, fontFamily: 'Familjen Grotesk', fontSize: 30, color: c.body }}>
          I enjoy shaping experiences at the intersection of design and technology.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 34 }}>
          <Prompt cwd="~" />
          <div style={{ width: 15, height: 30, backgroundColor: c.cyan }} />
        </div>
      </div>

      {/* Footer: the status line. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          padding: '0 56px',
          borderTop: `1px solid ${c.line}`,
          backgroundColor: c.panel,
          fontSize: 22,
        }}
      >
        <span style={{ backgroundColor: c.hot, color: c.ink, fontWeight: 800, padding: '14px 22px' }}>remi</span>
        <span style={{ color: c.muted, padding: '14px 22px' }}>main</span>
        <span style={{ padding: '14px 22px' }}>~</span>
        <span style={{ marginLeft: 'auto', color: c.muted, padding: '14px 0' }}>© 2026 Remi Higuchi</span>
      </div>
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
