import { ProjectsTile } from "@/components/ProjectsTile";

export default function Home() {
  return (
    <div className="">
      <main className="p-4">
        <section className="bg-linear-to-r from-slate-300 to-slate-400 rounded-4xl w-full mb-2 text-black p-8">
          <h1 className="font-bitcount sm:text-4xl md:text-8xl">Remi Higuchi</h1>
          <h2 className="text-xl font-bitcount">Experience Designer & Software Engineer</h2>
          <h3 className="text-lg font-bitcount">From Tokyo, Based in Stockholm</h3>
          <p className="my-4 text-xs max-w-2xl">
            I'm a designer and engineer focused on
            crafting meaningful digital experiences. With a background in both
            design and software development, I bridge the gap between
            aesthetics and functionality to create user-centric solutions.
          </p>
        </section>
        <section className="">
          <ProjectsTile featuredOnly showHeading={false} />
        </section>
      </main>
    </div>
  );
}
