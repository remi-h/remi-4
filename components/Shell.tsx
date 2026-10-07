import { ShellPrompt } from '@/components/ShellPrompt';
import { fetchLogs, fetchProjects } from '@/lib/contentful';
import { buildTree } from '@/lib/shell';

/** The working prompt that ends a page, over a copy of the site's content. */
export const Shell = async ({ cwd, delayMs, className }: { cwd: string[]; delayMs: number; className?: string }) => {
  const [projects, logs] = await Promise.all([fetchProjects({ featuredFirst: true }), fetchLogs()]);
  const tree = buildTree(
    // Only what the tree needs, so the rich text never reaches the browser.
    projects.items.map(({ fields: { title, slug, summary, date, featured, lock } }) => ({
      title,
      slug,
      summary,
      date,
      featured,
      lock,
    })),
    logs.items.map(({ fields: { title, org, link, date } }) => ({ title, org, link, date })),
  );
  return <ShellPrompt className={className} cwd={cwd} delayMs={delayMs} tree={tree} />;
};
