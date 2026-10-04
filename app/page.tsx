import Link from 'next/link';
import { ProjectsTile } from '@/components/ProjectsTile';

export default function Home() {
  return (
    <main className="px-4 sm:px-8">
      <section className="py-16 sm:py-28">
        <div className="flex flex-wrap items-start justify-between gap-12">
          <div className="min-w-0 flex-[1_1_640px]">
            <p className="mb-8 font-mono text-[13px] uppercase tracking-[0.04em] text-muted">
              Experience Designer &amp; Software Engineer
            </p>
            <h1 className="text-[clamp(52px,10.4vw,150px)] font-bold leading-[0.94] tracking-tighter">Remi Higuchi</h1>
          </div>
          <div aria-hidden="true" className="flex items-start gap-8">
            <div className="size-32 rounded-full bg-vermilion" />
            <div className="font-jp whitespace-nowrap text-[22px] leading-none tracking-[0.35em] [writing-mode:vertical-rl]">
              東京　→　ストックホルム
            </div>
          </div>
        </div>
        <p className="mt-16 max-w-[560px] text-2xl leading-snug sm:mt-24">
          I enjoy shaping experiences at the intersection of design and technology, and collaborating across disciplines
          to turn complexity into something intuitive and human.
        </p>
      </section>

      <section className="pb-24">
        <div className="mb-14 flex items-baseline justify-between border-t border-ink pt-5">
          <h2 className="text-3xl font-bold tracking-tight">Featured Projects</h2>
          <Link className="text-lg font-medium" href="/projects">
            View all →
          </Link>
        </div>
        <ProjectsTile featuredOnly />
      </section>
    </main>
  );
}
