import Image from "next/image";
import { notFound } from "next/navigation";
import {
  fetchProjectBySlug,
  fetchProjectSlugs,
  getAssetMap,
  resolveAssetImage,
} from "@/lib/contentful";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, Document } from "@contentful/rich-text-types";

export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    return { title: "Project not found" };
  }

  return {
    title: project.project.fields.title ?? "Project",
    description: project.project.fields.summary ?? "",
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await fetchProjectBySlug(slug);

  if (!response) {
    notFound();
  }

  const project = response.project;
  const assets = getAssetMap(response.assets);
  const cover = resolveAssetImage(
    assets.get(project.fields.cover?.sys.id ?? "")
  );
  const description = project.fields.text
    ? documentToReactComponents(project.fields.text as Document, {
      renderNode: {
        [BLOCKS.EMBEDDED_ASSET]: (node) => {
          const target = node.data?.target?.sys?.id;
          if (!target) return null;
          const asset = assets.get(target);
          const image = resolveAssetImage(asset);
          if (!image) return null;
          return (
            <div className="my-6">
              <Image
                alt={image.title}
                className="w-full max-w-3xl object-cover rounded border border-white/40"
                height={image.height}
                src={image.url}
                width={image.width}
              />
            </div>
          );
        },
      },
    })
    : null;

  return (
    <main className="p-4 max-w-3xl mx-auto project-page">
      <div className="mt-6">
        <h1 className="text-4xl font-bitcount">
          {project.fields.title ?? "Project"}
        </h1>
        {project.fields.summary ? (
          <p className="mt-3 max-w-2xl text-sm">{project.fields.summary}</p>
        ) : null}
        {project.fields.duration ? (
          <p className="mt-2 text-xs uppercase tracking-[0.08em]">
            {project.fields.duration}
          </p>
        ) : null}
      </div>
      {cover ? (
        <div className="mt-6">
          <Image
            alt={cover.title}
            className="w-full max-w-3xl object-cover rounded border border-white/40"
            height={cover.height}
            src={cover.url}
            width={cover.width}
          />
        </div>
      ) : null}
      {description ? (
        <div className="mt-6 max-w-2xl text-sm">{description}</div>
      ) : null}
    </main>
  );
}
