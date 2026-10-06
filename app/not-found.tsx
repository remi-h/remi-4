import { NotFoundSession } from '@/components/NotFoundSession';
import { Shell } from '@/components/Shell';

export const metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <main className="px-4 pb-24 sm:px-8">
      <NotFoundSession />
      {/* cd failed, so the prompt is still in ~. */}
      <Shell className="text-base leading-7" cwd={[]} delayMs={350} />
    </main>
  );
}
