import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchProjectBySlug,
  fetchProjectSlugs,
  getAssetMap,
  resolveAssetImage,
  richTextToPlainText,
} from "@/lib/contentful";

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
  const description = richTextToPlainText(project.fields.text);

  return (
    <main className="p-4">
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
            className="w-full max-w-3xl object-cover"
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
