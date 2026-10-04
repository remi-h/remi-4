import Image from 'next/image';
import Link from 'next/link';
import { LockClosedIcon } from '@radix-ui/react-icons';
import { fetchProjects, getAssetMap, resolveAssetImage, type ContentfulProject } from '@/lib/contentful';

// Placeholder art for projects without a cover, cycling through the three tonal variants.
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

// Layouts alternate so the list reads as asymmetric rows, like the mockup.
const layouts = [
  { row: 'flex-wrap items-end', media: 'flex-[1_1_560px]', text: 'flex-[0_1_340px]', aspect: 'aspect-[4/3]' },
  {
    row: 'flex-wrap items-start justify-between lg:flex-row-reverse',
    media: 'flex-[0_1_760px] min-w-[min(100%,360px)]',
    text: 'flex-[0_1_340px]',
    aspect: 'aspect-[16/10]',
  },
  {
    row: 'flex-wrap items-end',
    media: 'flex-[1_1_440px]',
    text: 'flex-[0_1_340px] md:mr-[12%]',
    aspect: 'aspect-square',
  },
];

const yearOf = (project: ContentfulProject) => {
  const date = project.fields.date ? new Date(project.fields.date) : null;
  return date && !Number.isNaN(date.valueOf()) ? String(date.getUTCFullYear()) : null;
};

export const FeaturedProjects = async () => {
  const data = await fetchProjects({ featuredOnly: true, featuredFirst: true });
  const assets = getAssetMap(data.includes?.Asset);

  if (data.items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-24">
      {data.items.map((project, index) => {
        const layout = layouts[index % layouts.length];
        const cover = resolveAssetImage(assets.get(project.fields.cover?.sys.id ?? ''));
        const slug = project.fields.slug;
        const year = yearOf(project);

        const content = (
          <>
            <div className={`relative overflow-hidden ${layout.media} ${layout.aspect}`}>
              {cover ? (
                <Image
                  alt={cover.title}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 760px, 100vw"
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
            <div className={layout.text}>
              <div className="mb-4 font-mono text-[13px] uppercase tracking-[0.04em] text-muted">
                {String(index + 1).padStart(2, '0')}
                {year ? ` · ${year}` : ''}
              </div>
              <h3 className="mb-3 text-4xl font-bold leading-none tracking-tight decoration-vermilion decoration-2 underline-offset-[6px] group-hover:underline">
                {project.fields.title}
              </h3>
              {project.fields.summary ? (
                <p className="text-lg leading-normal text-body">{project.fields.summary}</p>
              ) : null}
            </div>
          </>
        );

        const className = `flex gap-x-12 gap-y-8 ${layout.row}`;

        return slug ? (
          <Link className={`group ${className} hover:no-underline`} href={`/projects/${slug}`} key={project.sys.id}>
            {content}
          </Link>
        ) : (
          <article className={className} key={project.sys.id}>
            {content}
          </article>
        );
      })}
    </div>
  );
};
