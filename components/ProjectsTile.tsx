import Link from "next/link";
import {
    fetchProjects,
    getAssetMap,
    resolveAssetImage,
} from "@/lib/contentful";

type ProjectsTileProps = {
    showHeading?: boolean;
    featuredOnly?: boolean;
};

export const ProjectsTile = async ({
    showHeading = true,
    featuredOnly = false,
}: ProjectsTileProps) => {
    const data = await fetchProjects({ featuredOnly });
    const assets = getAssetMap(data.includes?.Asset);

    if (data.items.length === 0) {
        return null;
    }

    return (
        <section>
            {showHeading ? (
                <h3 className="text-2xl font-bitcount uppercase">Projects</h3>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {data.items.map((project) => {
                    const cover = resolveAssetImage(
                        assets.get(project.fields.cover?.sys.id ?? "")
                    );
                    const slug = project.fields.slug;

                    const content = (
                        <div
                            className="group relative flex h-80 w-full items-center overflow-hidden rounded-4xl border border-white/20"
                            style={
                                cover
                                    ? {
                                        backgroundImage: `url(${cover.url})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }
                                    : undefined
                            }
                        >
                            <div className="absolute inset-0 bg-black/30 duration-300 group-hover:bg-black/50" />
                            <div className="relative z-10 p-4 text-left">
                                <h4 className="text-xl font-bitcount uppercase">
                                    {project.fields.title}
                                </h4>
                            </div>
                        </div>
                    );

                    return slug ? (
                        <Link
                            className="block"
                            href={`/projects/${slug}`}
                            key={project.sys.id}
                        >
                            {content}
                        </Link>
                    ) : (
                        <article
                            className="borde"
                            key={project.sys.id}
                        >
                            {content}
                        </article>
                    );
                })}
            </div>
        </section>
    );
};
