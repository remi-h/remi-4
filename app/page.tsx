import Link from "next/link";
import { FeaturedProjects } from "@/components/FeaturedProjects";

export default function Home() {
  return (
    <main className="px-4 sm:px-8">
      <section className="py-16 sm:py-28">
        <div className="flex flex-wrap items-start justify-between gap-12">
          <div className="min-w-0 flex-[1_1_640px]">
            <p className="mb-8 font-mono text-[13px] uppercase tracking-[0.04em] text-muted">
              Experience Designer &amp; Software Engineer
            </p>
            <h1 className="text-[clamp(52px,10.4vw,150px)] font-bold leading-[0.94] tracking-tighter">
              Remi Higuchi
            </h1>
          </div>
          <div aria-hidden="true" className="flex items-start gap-8">
            <div className="size-32 rounded-full bg-vermilion" />
            <div className="font-jp whitespace-nowrap text-[22px] leading-none tracking-[0.35em] [writing-mode:vertical-rl]">
              東京　→　ストックホルム
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-end justify-between gap-10 sm:mt-24">
          <p className="max-w-[560px] text-2xl leading-snug">
            I enjoy shaping experiences at the intersection of design and technology, and collaborating across
            disciplines to turn complexity into something intuitive and human.
          </p>
          <div className="font-mono text-[13px] uppercase leading-8 tracking-[0.04em] text-muted sm:text-right">
            <p>From Tokyo, Based in Stockholm</p>
            <p>35.68°N 139.69°E → 59.33°N 18.07°E</p>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mb-14 flex items-baseline justify-between border-t border-ink pt-5">
          <h2 className="text-3xl font-bold tracking-tight">Featured Projects</h2>
          <Link className="text-lg font-medium" href="/projects">
            View all →
          </Link>
        </div>
        <FeaturedProjects />
      </section>
    </main>
  );
}
