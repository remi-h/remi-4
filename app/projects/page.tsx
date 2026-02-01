import { ProjectsTile } from "@/components/ProjectsTile";

export const metadata = {
  title: "Projects",
  description: "Selected work and case studies.",
};

export default function ProjectsPage() {
  return (
    <main className="p-4">
      <h1 className="text-4xl font-bitcount">Projects</h1>
      <p className="my-3 max-w-lg text-sm">
        Selected work and case studies. Some projects require a login to view.
      </p>
      <ProjectsTile showHeading={false} />
    </main>
  );
}
