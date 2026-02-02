import Link from "next/link";

export const Navigation = () => {
    return (
        <nav className="fixed bottom-2 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between rounded-2xl bg-black/50 px-4 py-2 backdrop-blur shadow-[0_0_20px_rgba(255,255,255,0.1)] md:min-w-sm">
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
