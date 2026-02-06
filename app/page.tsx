import Link from "next/link";
import { ProjectsTile } from "@/components/ProjectsTile";
import Galaxy from "@/components/Galaxy";

export default function Home() {
  return (
    <div className="relative">
      <div className="fixed inset-0 -z-10">
        <Galaxy
          starSpeed={0.1}
          density={0.3}
          hueShift={30}
          speed={0.1}
          glowIntensity={0.2}
          saturation={1}
          mouseRepulsion={false}
          repulsionStrength={2}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          transparent
        />
      </div>

      <main className="p-4 relative z-10">
        <section className="bg-linear-to-r from-slate-200 to-stone-300 rounded-4xl w-full mb-2 text-black p-8">
          <h1 className="font-bitcount text-4xl md:text-6xl">Remi Higuchi</h1>
          <h2 className="text-xl font-bitcount">Experience Designer & Software Engineer</h2>
          <h3 className="text-lg font-bitcount">From Tokyo, Based in Stockholm</h3>
          <p className="my-4 text-xs max-w-2xl">
            I design and code :) <br />
            With a background in both
            design and software development, I bridge the gap between
            aesthetics and functionality to create user-centric solutions.
          </p>
        </section>
        <section className="">
          <div className="flex justify-between items-center">
            <h2 className="font-bitcount text-2xl uppercase m-4">Featured Projects</h2>
            <Link
              href="/projects"
              className="group font-bitcount text-md uppercase underline"
            >
              <span>View all</span>
              <span className="ml-2 opacity-0 transition group-hover:opacity-100">
                &gt;
              </span>
            </Link>
          </div>
          <ProjectsTile featuredOnly showHeading={false} />
        </section>
      </main>
    </div>
  );
}
