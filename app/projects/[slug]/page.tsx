import Image from 'next/image';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { TerminalSession } from '@/components/TerminalSession';
import { Window } from '@/components/Window';
import { commands, folderName, schedule } from '@/lib/terminal';
import { notFound } from 'next/navigation';
import { fetchProjectBySlug, fetchProjectSlugs, getAssetMap, resolveAssetImage } from '@/lib/contentful';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { BLOCKS, Document } from '@contentful/rich-text-types';

export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    return { title: 'Project not found' };
  }

  return {
    title: project.project.fields.title ?? 'Project',
    description: project.project.fields.summary ?? '',
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const response = await fetchProjectBySlug(slug);

  if (!response) {
    notFound();
  }

  const project = response.project;
  const assets = getAssetMap(response.assets);
  const cover = resolveAssetImage(assets.get(project.fields.cover?.sys.id ?? ''));
  const folder = folderName({ slug, title: project.fields.title }, 0);

  const description = project.fields.text
    ? documentToReactComponents(project.fields.text as Document, {
        renderNode: {
          [BLOCKS.EMBEDDED_ASSET]: (node) => {
            const target = node.data?.target?.sys?.id;
            if (!target) return null;
            const image = resolveAssetImage(assets.get(target));
            if (!image) return null;
            return (
              <Window className="my-8" title="figure" meta={image.title}>
                <Image
                  alt={image.title}
                  className="h-auto w-full"
                  height={image.height}
                  src={image.url}
                  width={image.width}
                />
              </Window>
            );
          },
        },
      })
    : null;

  const date = project.fields.date ? new Date(project.fields.date) : null;
  const facts = [
    { key: 'date', value: date && !Number.isNaN(date.valueOf()) ? date.toISOString().slice(0, 10) : undefined },
    { key: 'duration', value: project.fields.duration },
    { key: 'link', value: project.fields.link },
  ].filter((fact): fact is { key: string; value: string } => Boolean(fact.value));

  const content = (
    <div>
      <h1 className="mt-6 text-[clamp(34px,6vw,76px)] font-extrabold leading-[1.02] tracking-[-0.045em]">
        {project.fields.title ?? 'Project'}
      </h1>
      {project.fields.summary ? (
        <p className="font-grotesk mt-6 text-[27px] font-medium leading-[1.45] tracking-tight">
          {project.fields.summary}
        </p>
      ) : null}

      {facts.length > 0 ? (
        // A label, not a file: it shows the project's facts without claiming a file format.
        <Window className="mt-8 max-w-md" title="metadata">
          <dl
            className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 px-4 py-[18px] text-sm leading-[1.9]"
            data-testid="project-metadata"
          >
            {facts.map(({ key, value }) => (
              <div className="contents" key={key}>
                <dt className="text-cyan">{key}</dt>
                <dd className="break-all">
                  {key === 'link' ? (
                    <a className="text-hot" href={value} rel="noopener noreferrer" target="_blank">
                      {value.replace(/^https?:\/\//, '')} ↗
                    </a>
                  ) : (
                    <span className="text-yellow">{value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Window>
      ) : null}

      {cover ? (
        <Window className="mt-8" meta="cover" title="cover.png">
          <Image
            alt={cover.title}
            className="h-auto w-full"
            height={cover.height}
            priority
            src={cover.url}
            width={cover.width}
          />
        </Window>
      ) : null}

      {description ? (
        <div className="project-page font-grotesk mt-12 text-xl leading-[1.7] text-body">{description}</div>
      ) : null}
    </div>
  );

  const steps = [
    { cwd: '~', command: commands.toProject(folder) },
    { cwd: `~/projects/${folder}`, command: commands.readme, output: content },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-8">
      <p className="pt-8 text-[15px]">
        <Link className="text-muted" href="/projects">
          ← {commands.back}
        </Link>
      </p>
      <TerminalSession className="pt-6 text-[15px] leading-7" steps={steps} />
      <p className="mt-16 border-t border-line pt-6 text-[15px]">
        <Link className="text-muted" href="/projects">
          ← {commands.back}
        </Link>
      </p>
      <Shell
        className="mt-8 text-base leading-7"
        cwd={['projects', folder]}
        delayMs={schedule(steps.map((s) => ({ command: s.command, hasOutput: s.output != null }))).endAt}
      />
    </main>
  );
}
