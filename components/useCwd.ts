'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { cwdFor } from '@/lib/terminal';

// The 404 page tells the header and footer that the path does not exist: `cd` failed, so
// their prompts stay in ~ instead of showing a directory that is not there.
let missing: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setMissing = (path: string | null) => {
  missing = path;
  listeners.forEach((listener) => listener());
};

/** Marks the current path as missing while the calling component (the 404 page) is shown. */
export const useMarkMissing = (pathname: string) => {
  useEffect(() => {
    setMissing(pathname);
    return () => setMissing(null);
  }, [pathname]);
};

/** The route and the prompt's working directory, which is ~ on a 404. */
export const useCwd = () => {
  const pathname = usePathname() ?? '/';
  const missingPath = useSyncExternalStore(
    subscribe,
    () => missing,
    () => null,
  );
  // The prerendered 404 is rendered as /_not-found before the browser knows the real path.
  const notFound = missingPath === pathname || pathname === '/_not-found';
  return { pathname, notFound, cwd: notFound ? '~' : cwdFor(pathname) };
};

/** The pathname as the browser sees it, or null while prerendering (the static 404 has no URL). */
export const useBrowserPathname = () =>
  useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => null,
  );
