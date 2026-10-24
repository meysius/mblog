import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  href: (page: number) => string;
};

/** Previous and Next, with page numbers between them on wider screens. */
export function Pagination({ page, pageCount, href }: PaginationProps) {
  return (
    <nav aria-label="Pages">
      <ul className="flex items-center gap-1">
        <li>
          <PageLink href={page > 1 ? href(page - 1) : null} label="Previous page">
            <ChevronLeft data-icon="inline-start" />
            <span className="max-sm:sr-only">Previous</span>
          </PageLink>
        </li>
        {pageNumbers(page, pageCount).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden className="w-6 text-center text-muted-foreground max-sm:hidden">
              …
            </li>
          ) : (
            <li key={n} className="max-sm:hidden">
              <Link
                href={href(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: n === page ? "outline" : "ghost", size: "icon" }),
                  "tabular-nums",
                )}
              >
                {n}
              </Link>
            </li>
          ),
        )}
        <li>
          <PageLink href={page < pageCount ? href(page + 1) : null} label="Next page">
            <span className="max-sm:sr-only">Next</span>
            <ChevronRight data-icon="inline-end" />
          </PageLink>
        </li>
      </ul>
    </nav>
  );
}

// Previous or Next, shown but disabled when there's no page that way.
function PageLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const className = buttonVariants({ variant: "ghost" });
  return href ? (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  ) : (
    <span aria-disabled className={cn(className, "pointer-events-none opacity-50")}>
      {children}
    </span>
  );
}

/**
 * The first and last pages, and the current one with its neighbors. null marks
 * skipped pages; a gap of just one page shows that page instead.
 */
function pageNumbers(page: number, pageCount: number) {
  const shown = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);

  const numbers: (number | null)[] = [];
  let previous = 0;
  for (const n of shown) {
    if (n - previous === 2) numbers.push(n - 1);
    else if (n - previous > 2) numbers.push(null);
    numbers.push(n);
    previous = n;
  }
  return numbers;
}
