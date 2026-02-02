
import Link from "next/link";
import { fetchLogs } from "@/lib/contentful";

export const metadata = {
    title: "Log",
    description: "Updates",
};

export default async function ProjectsPage() {
    const { items } = await fetchLogs();
    return (
        <main className="p-4">
            <h1 className="text-4xl font-bitcount">Log</h1>
            <p className="my-3 max-w-lg text-sm">
                Media Coverage / Conference + Things I have done and am proud of :)
            </p>
            <section className="mt-6 space-y-4">
                {items.map((entry) => {
                    const dateValue = entry.fields.date ? new Date(entry.fields.date) : null;
                    const date =
                        dateValue && !Number.isNaN(dateValue.valueOf())
                            ? dateValue.toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })
                            : "";

                    const content = (
                        <div className="">
                            <div className="text-xs font-bitcount uppercase tracking-[0.08em] text-white/70">
                                {date} {entry.fields.org ? (
                                    <p className="inline"> | {entry.fields.org}</p>
                                ) : null}
                            </div>
                            <p className="mt-2 flex items-center gap-2">
                                <span>{entry.fields.title ?? "Untitled"}</span>
                                <span className="font-bitcount opacity-0 transition group-hover:opacity-100">
                                    &gt;
                                </span>
                            </p>

                        </div>
                    );

                    return entry.fields.link ? (
                        <Link
                            className="group block"
                            href={entry.fields.link}
                            key={entry.sys.id}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {content}
                        </Link>
                    ) : (
                        <div key={entry.sys.id}>{content}</div>
                    );
                })}
            </section>
        </main>
    );
}
