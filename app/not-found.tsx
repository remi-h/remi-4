import { NotFoundSession } from '@/components/NotFoundSession';

export const metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <main className="px-4 sm:px-8">
      <NotFoundSession />
    </main>
  );
}
