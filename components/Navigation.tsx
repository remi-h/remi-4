"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
    { href: "/projects", label: "Projects" },
    { href: "/log", label: "Log" },
];

const linkClass =
    "flex items-center gap-2 py-3 text-lg font-medium hover:underline decoration-vermilion decoration-2 underline-offset-[6px]";

export const Navigation = () => {
    const pathname = usePathname();

    return (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-current/40 px-4 py-4 sm:px-8">
            <Link className="flex items-center gap-3.5 text-xl font-bold" href="/">
                <span
                    aria-hidden="true"
                    className="font-jp inline-flex size-9 items-center justify-center rounded-sharp bg-vermilion-text text-[15px] font-semibold text-paper"
                >
                    樋口
                </span>
                Remi Higuchi
            </Link>
            <nav aria-label="Main" className="flex gap-6 sm:gap-10">
                {links.map(({ href, label }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                        <Link
                            aria-current={active ? "page" : undefined}
                            className={linkClass}
                            href={href}
                            key={href}
                        >
                            {active ? (
                                <span aria-hidden="true" className="size-2 rounded-full bg-vermilion" />
                            ) : null}
                            {label}
                        </Link>
                    );
                })}
                <a className={linkClass} href="#contact">
                    Contact
                </a>
            </nav>
        </header>
    );
};
