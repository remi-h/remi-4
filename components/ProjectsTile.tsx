import Image from "next/image";
import Link from "next/link";
import {
    fetchProjects,
    getAssetMap,
    resolveAssetImage,
} from "@/lib/contentful";

type ProjectsTileProps = {
    showHeading?: boolean;
};

export const ProjectsTile = async ({ showHeading = true }: ProjectsTileProps) => {
    const data = await fetchProjects();
    const assets = getAssetMap(data.includes?.Asset);

    if (data.items.length === 0) {
        return null;
    }

    return (
        <section className="mt-10">
            {showHeading ? (
                <h3 className="text-2xl font-bitcount uppercase">Projects</h3>
            ) : null}
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((project) => {
                    const cover = resolveAssetImage(
                        assets.get(project.fields.cover?.sys.id ?? "")
                    );
                    const slug = project.fields.slug;

                    return (
                        <article
                            className="border border-black/10 p-4"
                            key={project.sys.id}
                        >
                            {cover ? (
                                <Image
                                    alt={cover.title}
                                    className="h-44 w-full object-cover"
                                    height={cover.height}
                                    src={cover.url}
                                    width={cover.width}
                                />
                            ) : null}
                            <h4 className="mt-3 text-lg font-bitcount uppercase">
                                {slug ? (
                                    <Link className="nav-link" href={`/projects/${slug}`}>
                                        {project.fields.title ?? "Untitled project"}
                                    </Link>
                                ) : (
                                    <span>{project.fields.title ?? "Untitled project"}</span>
                                )}
                            </h4>
                            {project.fields.summary ? (
                                <p className="mt-2 text-sm">{project.fields.summary}</p>
                            ) : null}
                            {project.fields.duration ? (
                                <p className="mt-2 text-xs uppercase tracking-[0.08em]">
                                    {project.fields.duration}
                                </p>
                            ) : null}
                        </article>
                    );
                })}
            </div>
        </section>
    );
};
