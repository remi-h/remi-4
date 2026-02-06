import { ProjectsTile } from "@/components/ProjectsTile";
import Galaxy from '@/components/Galaxy';

export const metadata = {
  title: "Projects",
  description: "Selected work and case studies.",
};

export default function ProjectsPage() {
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
          transparent />
      </div>

      <main className="p-4 relative z-10">
        <h1 className="text-4xl font-bitcount">Projects</h1>
        <p className="my-3 max-w-lg text-sm">
          Selected work and case studies. Some projects require a login to view.
        </p>
        <ProjectsTile showHeading={false} />
      </main>
    </div>
  );
}
