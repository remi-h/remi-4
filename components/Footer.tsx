const social = [
    { href: "https://linkedin.com/in/hremi", label: "LinkedIn" },
    { href: "https://instagram.com/remihiguchi", label: "Instagram" },
    { href: "https://github.com/remi-h", label: "GitHub" },
];

export const Footer = () => {
    return (
        <footer className="mt-16 bg-ink px-4 pb-10 pt-16 text-paper sm:px-8 sm:pt-24" id="contact">
            <div className="flex flex-wrap items-end justify-between gap-12">
                <h2 className="text-6xl font-bold leading-[0.95] tracking-tighter sm:text-8xl">
                    Say hello<span className="text-vermilion">.</span>
                </h2>
                <ul className="flex flex-col gap-3 text-xl font-medium">
                    {social.map(({ href, label }) => (
                        <li key={label}>
                            <a href={href} rel="noopener noreferrer" target="_blank">
                                {label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="mt-24 flex flex-wrap justify-between gap-4 border-t border-paper/20 pt-5 font-mono text-[13px] uppercase tracking-[0.04em] text-paper/70">
                <span>&copy; 2026 Remi Higuchi</span>
                <span className="font-jp normal-case tracking-[0.2em]">東京 / Stockholm</span>
            </div>
        </footer>
    );
};
