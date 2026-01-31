import { ProjectsTile } from "@/components/ProjectsTile";

export default function Home() {
  return (
    <div className="">
      <main className="p-4">
        <h1 className="text-4xl font-bitcount">
          Hi! I'm Remi
        </h1>
        <h2 className="text-xl font-bitcount">a software engineer & designer.</h2>
        <p className="mt-4 text-sm max-w-lg">
          Welcome to my personal website! Here, you'll find a collection of my projects, a bit about my background, and ways to get in touch. Feel free to explore and reach out if you'd like to collaborate or learn more about my work.
        </p>
        <ProjectsTile />
      </main>
    </div>
  );
}
