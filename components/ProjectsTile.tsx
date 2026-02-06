import Link from "next/link";
import {
    fetchProjects,
    getAssetMap,
    resolveAssetImage,
} from "@/lib/contentful";
import { LockClosedIcon } from "@radix-ui/react-icons";

type ProjectsTileProps = {
    showHeading?: boolean;
    featuredOnly?: boolean;
};

export const ProjectsTile = async ({
    showHeading = true,
    featuredOnly = false,
}: ProjectsTileProps) => {
    const data = await fetchProjects({ featuredOnly, featuredFirst: true });
    const assets = getAssetMap(data.includes?.Asset);

    if (data.items.length === 0) {
        return null;
    }

    return (
        <section>
            {showHeading ? (
                <h3 className="text-2xl font-bitcount uppercase">Projects</h3>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {data.items.map((project) => {
                    const cover = resolveAssetImage(
                        assets.get(project.fields.cover?.sys.id ?? "")
                    );
                    const slug = project.fields.slug;

                    const backgroundUrl = cover?.url ?? "/lock.png";

                    const content = (
                        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#0b052d]/80">
                            <div
                                className="relative h-64 w-full"
                                style={{
                                    backgroundImage: `url(${backgroundUrl})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }}
                            >
                                {project.fields.lock ? (
                                    <div className="absolute left-2 bottom-2 rounded-full bg-black/70 p-2 transition">
                                        <LockClosedIcon className="h-4 w-4 text-white" />
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-1 flex-col p-4">
                                <h4 className="flex items-center gap-2 text-lg font-bitcount uppercase">
                                    <span>{project.fields.title}</span>
                                    <span className="opacity-0 transition group-hover:opacity-100">
                                        &gt;
                                    </span>
                                </h4>

                                {project.fields.summary ? (
                                    <p className="text-sm text-white/80">
                                        {project.fields.summary}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    );

                    return slug ? (
                        <Link
                            className="group block h-full"
                            href={`/projects/${slug}`}
                            key={project.sys.id}
                        >
                            {content}
                        </Link>
                    ) : (
                        <article className="h-full" key={project.sys.id}>
                            {content}
                        </article>
                    );
                })}
            </div>
        </section>
    );
};
