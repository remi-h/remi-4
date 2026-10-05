import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { fetchProjects, getAssetMap, resolveAssetImage, type ContentfulProject } from '@/lib/contentful';
import { folderMode, folderName } from '@/lib/terminal';
import { Window } from './Window';

const grid = (color: string, size: number) =>
  ({
    backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
    backgroundSize: `${size}px ${size}px`,
  }) as CSSProperties;

// Neon placeholder art for projects without a cover, cycling through three variants.
const placeholders = [
  <div className="absolute inset-0 bg-ink" key="a" style={grid('rgba(34,229,211,.12)', 32)}>
    <div className="absolute left-[12%] top-[16%] aspect-square w-[34%] rounded-full border-2 border-cyan" />
    <div className="absolute bottom-0 right-0 h-[30%] w-[42%] bg-hot" />
    <div className="absolute bottom-[14%] left-[12%] h-1.5 w-[22%] bg-yellow" />
  </div>,
  <div className="absolute inset-0 bg-ink" key="b" style={grid('rgba(255,79,163,.12)', 24)}>
    <div className="absolute inset-[14%] border-2 border-magenta" />
    <div className="absolute left-[14%] top-[14%] h-[42%] w-[34%] bg-magenta" />
    <div className="absolute bottom-[14%] right-[14%] h-1.5 w-[20%] bg-cyan" />
  </div>,
  <div className="absolute inset-0 bg-ink" key="c" style={grid('rgba(255,216,74,.1)', 32)}>
    <div className="absolute left-1/2 top-1/2 aspect-square w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow" />
    <div className="absolute left-1/2 top-1/2 aspect-square w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan" />
    <div className="absolute left-1/2 top-1/2 aspect-square w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-hot" />
  </div>,
];

const lockedArt = (
  <div
    className="absolute inset-0 flex items-center justify-center bg-ink"
    style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,74,43,.14) 0 2px, transparent 2px 14px)' }}
  >
    <div className="text-center">
      <svg
        aria-label="Locked"
        className="mx-auto"
        fill="none"
        height="44"
        role="img"
        stroke="#ff4a2b"
        strokeLinecap="square"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
        width="44"
      >
        <rect height="9" width="14" x="5" y="11" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <div className="mt-3 text-[13px] text-hot">permission denied</div>
    </div>
  </div>
);

const yearOf = (project: ContentfulProject) => {
  const date = project.fields.date ? new Date(project.fields.date) : null;
  return date && !Number.isNaN(date.valueOf()) ? String(date.getUTCFullYear()) : null;
};

type ProjectsTileProps = {
  featuredOnly?: boolean;
  /** Heading level for project titles, so it fits under the page's own headings. */
  titleAs?: 'h2' | 'h3';
  /** Delay before the cards start fading in, so they follow the page's terminal intro. */
  delayMs?: number;
};

export const ProjectsTile = async ({ featuredOnly = false, titleAs: Title = 'h3', delayMs = 0 }: ProjectsTileProps) => {
  const data = await fetchProjects({ featuredOnly, featuredFirst: true });
  const assets = getAssetMap(data.includes?.Asset);

  if (data.items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-8">
      {data.items.map((project, index) => {
        const cover = resolveAssetImage(assets.get(project.fields.cover?.sys.id ?? ''));
        const slug = project.fields.slug;
        const locked = Boolean(project.fields.lock);
        const folder = folderName({ slug, title: project.fields.title }, index);
        const year = yearOf(project);
        const number = String(index + 1).padStart(2, '0');

        const content = (
          <Window
            className="h-full transition-colors group-hover:border-cyan"
            meta={year}
            title={
              <>
                <span className={locked ? 'text-hot' : 'text-cyan'}>{number}</span>_{folder}/
              </>
            }
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-ink" data-testid="project-art">
              {cover ? (
                <Image
                  alt={cover.title}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  src={cover.url}
                />
              ) : locked ? (
                lockedArt
              ) : (
                placeholders[index % placeholders.length]
              )}
              {locked && cover ? (
                <div className="absolute bottom-2 left-2 bg-ink/80 p-2">
                  <svg
                    aria-label="Locked"
                    fill="none"
                    height="16"
                    role="img"
                    stroke="#ff4a2b"
                    strokeLinecap="square"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                    width="16"
                  >
                    <rect height="9" width="14" x="5" y="11" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>
              ) : null}
            </div>
            <div className="px-[18px] pb-5 pt-[18px]">
              <Title className="font-grotesk text-[26px] font-bold leading-tight tracking-tight">
                {project.fields.title}
              </Title>
              {project.fields.summary ? (
                <p className="font-grotesk mt-2 text-[19px] leading-normal text-body">{project.fields.summary}</p>
              ) : null}
              <div className="mt-4 flex justify-between text-[13px]">
                <span className={locked ? 'text-hot' : 'text-muted'}>{folderMode(locked)}</span>
                <span className={locked ? 'text-muted' : 'text-cyan group-hover:underline'}>
                  {locked ? 'locked' : 'open ↵'}
                </span>
              </div>
            </div>
          </Window>
        );

        const wrapperStyle = { '--d': `${delayMs + index * 120}ms` } as CSSProperties;

        return slug ? (
          <Link
            className="t-in group block hover:no-underline"
            href={`/projects/${slug}`}
            key={project.sys.id}
            style={wrapperStyle}
          >
            {content}
          </Link>
        ) : (
          <article className="t-in group" key={project.sys.id} style={wrapperStyle}>
            {content}
          </article>
        );
      })}
    </div>
  );
};
