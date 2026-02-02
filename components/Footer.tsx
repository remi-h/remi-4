import { LinkedInLogoIcon, InstagramLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import Link from "next/link";

export const Footer = () => {
    return (
        <div className="p-4">
            <footer className="font-bitcount w-full bg-linear-to-r from-slate-800 to-slate-800 p-8 text-white pb-20 rounded-4xl">
                <div className="max-w-4xl mx-auto">
                    <div className="grid sm:grid-cols-3">
                        <div className="mb-2">
                            <h4 className="uppercase text-lg">Contents</h4>
                            <p className="text-sm"><Link href="/">Home</Link></p>
                            <p className="text-sm"><Link href="/projects">Projects</Link></p>
                            <p className="text-sm"><Link href="/log">LOG</Link></p>
                        </div>
                        <div className="mb-2">
                            <h4 className="uppercase text-lg">Contact</h4>
                            <p className="text-sm">
                                Text me on <Link href="https://linkedin.com/in/hremi" target="_blank">Linkedin</Link>
                            </p>
                        </div>
                        <div className="mb-2">
                            <h4 className="uppercase text-lg">Social Media</h4>
                            <Link href="https://linkedin.com/in/hremi" target="_blank" rel="noopener noreferrer"><LinkedInLogoIcon className="w-6 h-6 inline" /></Link>
                            <Link href="https://instagram.com/remihiguchi" target="_blank" rel="noopener noreferrer" className="ml-2"><InstagramLogoIcon className="w-6 h-6 inline" /></Link>
                            <Link href="https://github.com/remi-h" target="_blank" rel="noopener noreferrer" className="ml-2"><GitHubLogoIcon className="w-6 h-6 inline" /></Link>
                        </div>

                    </div>
                    <p className="mt-12 font-bitcount text-xs text-center">2026 Remi Higuchi. All rights reserved.</p>
                </div>

            </footer>
        </div>
    );
}