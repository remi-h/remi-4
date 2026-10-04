import Image from 'next/image';
import Link from 'next/link';
import { LockClosedIcon } from '@radix-ui/react-icons';
import { fetchProjects, getAssetMap, resolveAssetImage, type ContentfulProject } from '@/lib/contentful';

// Tonal placeholder art for projects without a cover, cycling through three variants.
const placeholders = [
  <div className="absolute inset-0 bg-stone" key="a">
    <div className="absolute left-[12%] top-[18%] aspect-square w-[38%] rounded-full bg-ink" />
    <div className="absolute bottom-0 right-0 h-[34%] w-[44%] bg-vermilion" />
  </div>,
  <div className="absolute inset-0 bg-ink" key="b">
    <div className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vermilion" />
    <div className="absolute bottom-[22%] left-0 h-px w-full bg-paper/50" />
  </div>,
  <div className="absolute inset-0 bg-sage" key="c">
    <div className="absolute inset-[14%] border-2 border-ink" />
    <div className="absolute left-[14%] top-[14%] size-[36%] bg-paper" />
  </div>,
];

const yearOf = (project: ContentfulProject) => {
  const date = project.fields.date ? new Date(project.fields.date) : null;
  return date && !Number.isNaN(date.valueOf()) ? String(date.getUTCFullYear()) : null;
};

type ProjectsTileProps = {
  featuredOnly?: boolean;
  /** Heading level for project titles, so it fits under the page's own headings. */
  titleAs?: 'h2' | 'h3';
};

export const ProjectsTile = async ({ featuredOnly = false, titleAs: Title = 'h3' }: ProjectsTileProps) => {
  const data = await fetchProjects({ featuredOnly, featuredFirst: true });
  const assets = getAssetMap(data.includes?.Asset);

  if (data.items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2 md:[&>*:nth-child(even)]:mt-24">
      {data.items.map((project, index) => {
        const cover = resolveAssetImage(assets.get(project.fields.cover?.sys.id ?? ''));
        const slug = project.fields.slug;
        const year = yearOf(project);

        const content = (
          <>
            <div className="relative aspect-[4/3] overflow-hidden">
              {cover ? (
                <Image
                  alt={cover.title}
                  className="object-cover"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  src={cover.url}
                />
              ) : (
                placeholders[index % placeholders.length]
              )}
              {project.fields.lock ? (
                <div className="absolute bottom-2 left-2 rounded-full bg-ink/80 p-2">
                  <LockClosedIcon aria-label="Locked" role="img" className="size-4 text-paper" />
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <Title className="text-4xl font-bold leading-none tracking-tight decoration-vermilion decoration-2 underline-offset-[6px] group-hover:underline">
                {project.fields.title}
              </Title>
              <span className="shrink-0 font-mono text-[13px] uppercase tracking-[0.04em] text-muted">
                {String(index + 1).padStart(2, '0')}
                {year ? ` · ${year}` : ''}
              </span>
            </div>
            {project.fields.summary ? (
              <p className="mt-2.5 max-w-[480px] text-lg leading-normal text-body">{project.fields.summary}</p>
            ) : null}
          </>
        );

        return slug ? (
          <Link className="group block hover:no-underline" href={`/projects/${slug}`} key={project.sys.id}>
            {content}
          </Link>
        ) : (
          <article key={project.sys.id}>{content}</article>
        );
      })}
    </div>
  );
};
