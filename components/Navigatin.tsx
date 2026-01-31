import Link from "next/link";

export const Navigation = () => {
    return (
        <nav className="fixed bottom-2 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between rounded-2xl border border-black/10 bg-black/50 px-4 py-2 shadow-lg backdrop-blur md:min-w-sm">
            <Link className="font-bitcount relative inline-flex rounded-xl px-3 py-2 text-sm uppercase tracking-[0.08em] transition hover:bg-black/50" href="/">
                Remi Higuchi
            </Link>
            <div className="flex items-center gap-1">
                <Link className="font-bitcount relative inline-flex rounded-xl px-3 py-2 text-sm uppercase tracking-[0.08em] transition hover:bg-black/50" href="/projects">
                    Projects
                </Link>
                <Link
                    className="font-bitcount relative inline-flex rounded-xl px-3 py-2 text-sm uppercase tracking-[0.08em] transition hover:bg-black/50"
                    href="/cv"
                >
                    CV
                </Link>
            </div>
        </nav>
    );
};
