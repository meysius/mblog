"use client";

import { Fragment, type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { useHydrated } from "@/components/local-date-time";
import { PageLinks } from "@/components/page-links";
import { cn } from "@/lib/utils";

export type ListPages = {
  /** The list's first page. */
  path: string;
  page: number;
  pageCount: number;
  loadPageAction: (page: number) => Promise<ReactNode>;
};

/**
 * A list that adds its next page as the reader nears the end, like Ghost's Casper
 * theme. Every page has its own URL too, and PageLinks lead there. They show when a
 * page can't be added: without JavaScript, or after one fails to load. Otherwise
 * they stay in the page, hidden, for search engines, which follow links but don't scroll.
 */
export function InfinitePosts({
  className,
  children,
  path,
  page,
  pageCount,
  loadPageAction,
}: ListPages & { className?: string; children: ReactNode }) {
  const [addedPages, setAddedPages] = useState<ReactNode[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, startLoading] = useTransition();
  const hydrated = useHydrated();
  const end = useRef<HTMLDivElement>(null);
  const lastPage = page + addedPages.length;
  const hasMore = lastPage < pageCount && !failed;

  // Observing reports straight away, so this runs again after each page in case
  // the end of the list is still in reach, as it can be on a tall screen.
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([{ isIntersecting }]) => {
        if (!isIntersecting) return;
        startLoading(async () => {
          try {
            const posts = await loadPageAction(lastPage + 1);
            startLoading(() => setAddedPages((pages) => [...pages, posts]));
          } catch {
            startLoading(() => setFailed(true));
          }
        });
      },
      { rootMargin: "300px" },
    );
    observer.observe(end.current!);
    return () => observer.disconnect();
  }, [hasMore, loading, lastPage, loadPageAction]);

  return (
    <>
      <ul className={className}>
        {children}
        {addedPages.map((posts, i) => (
          <Fragment key={i}>{posts}</Fragment>
        ))}
      </ul>
      <div ref={end} />
      {loading && (
        <p role="status" className="mt-16 text-center text-sm text-muted-foreground">
          Loading more posts…
        </p>
      )}
      {pageCount > 1 && (
        <PageLinks
          path={path}
          page={lastPage}
          pageCount={pageCount}
          className={cn("mt-16", hydrated && !failed && "hidden")}
        />
      )}
    </>
  );
}
