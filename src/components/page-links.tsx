import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { pagePath } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const pageLink =
  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors outline-none hover:border-foreground/25 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

/** Links to the newer and older pages of the list at this path, and which page this is. */
export function PageLinks({
  path,
  page,
  pageCount,
  className,
}: {
  path: string;
  page: number;
  pageCount: number;
  className?: string;
}) {
  return (
    <nav
      aria-label="Pages"
      className={cn("grid grid-cols-[1fr_auto_1fr] items-center gap-3", className)}
    >
      {page > 1 && (
        <Link href={pagePath(path, page - 1)} rel="prev" className={cn(pageLink, "justify-self-start")}>
          <ArrowLeft aria-hidden className="size-4" />
          <span>
            Newer<span className="max-sm:sr-only"> posts</span>
          </span>
        </Link>
      )}
      <p className="col-start-2 text-sm text-muted-foreground tabular-nums">
        Page {page} of {pageCount}
      </p>
      {page < pageCount && (
        <Link
          href={pagePath(path, page + 1)}
          rel="next"
          className={cn(pageLink, "col-start-3 justify-self-end")}
        >
          <span>
            Older<span className="max-sm:sr-only"> posts</span>
          </span>
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </nav>
  );
}
