import Link from "next/link";

export const Navigation = () => {
    return (
        <header className="flex uppercase justify-between p-4 text-xl">
            <Link className="nav-link" href="/">
                Remi Higuchi
            </Link>
            <div className="space-x-4">
                <Link className="nav-link" href="/projects">
                    Projects
                </Link>
                <Link
                    className="nav-link"
                    href="/cv"
                >
                    CV
                </Link>
            </div>
        </header>
    );
};
