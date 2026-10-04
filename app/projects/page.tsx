import { ProjectsTile } from "@/components/ProjectsTile";

export const metadata = {
  title: "Projects",
  description: "Selected work and case studies.",
};

export default function ProjectsPage() {
  return (
    <div className="relative">
      <main className="relative z-10 px-4 py-8 sm:px-8">
        <h1 className="text-4xl font-bitcount">Projects</h1>
        <p className="my-3 max-w-lg text-sm">
          Selected work and case studies. Some projects require a login to view.
        </p>
        <ProjectsTile titleAs="h2" />
      </main>
    </div>
  );
}
