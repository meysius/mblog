import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatMonthDay, formatShortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { pagePath } from "@/lib/pagination";
import type { PostSummary } from "@/lib/posts";
import { cn } from "@/lib/utils";

// Dates and years sit in this left margin; titles and excerpts in the column beside it.
export const marginGrid = "grid gap-x-10 md:grid-cols-[8rem_1fr]";

// The small label over each list of posts on the home page.
export const sectionLabel = "text-sm font-medium text-muted-foreground";

// The title link stretches over its whole post, so the date, excerpt and image open it too.
export function PostLink({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={cn(
        "marker outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50",
        className,
      )}
    >
      {post.title}
    </Link>
  );
}

/** Posts with their dates, excerpts and feature images. Shared by the home and tag pages. */
export function PostList({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="flex flex-col gap-12">
      {posts.map((post) => (
        <PostListItem key={post.slug} post={post} />
      ))}
    </ul>
  );
}

function PostListItem({ post }: { post: PostSummary }) {
  return (
    <li className={cn(marginGrid, "relative gap-y-2 md:items-baseline")}>
      <time
        dateTime={post.publishedAt.toISOString()}
        className="text-sm text-muted-foreground"
      >
        {formatShortDate(post.publishedAt)}
      </time>
      <div className="flex gap-5 sm:gap-8">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl leading-snug font-medium text-balance">
            <PostLink post={post} className="after:-inset-x-3 after:-inset-y-3" />
          </h2>
          {post.excerpt && (
            <p className="mt-2 line-clamp-2 font-serif text-lg leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}
        </div>
        {post.featureImage && (
          <Image
            src={mediaSrc(post.featureImage.url)}
            width={post.featureImage.width}
            height={post.featureImage.height}
            alt=""
            sizes="(min-width: 40rem) 8rem, 5rem"
            className="mt-1.5 aspect-[3/2] w-20 shrink-0 self-start rounded-md bg-muted object-cover sm:w-32"
          />
        )}
      </div>
    </li>
  );
}

function groupByYear(posts: PostSummary[]) {
  const years = new Map<number, PostSummary[]>();
  for (const post of posts) {
    const year = post.publishedAt.getFullYear();
    years.set(year, [...(years.get(year) ?? []), post]);
  }
  return [...years];
}

// Leader dots run along each row's last line, right-aligned so every row's dots line up
// under each other. The title and date cover them with the page background, so they
// show only in between, even after a title that wraps.
const leader = " .".repeat(80);

/**
 * Titles and dates by year, and links to the other pages. The home page's first
 * page ends with it, and its later pages are nothing else.
 */
export function Archive({
  posts,
  page,
  pageCount,
}: {
  posts: PostSummary[];
  page: number;
  pageCount: number;
}) {
  return (
    <section aria-labelledby="archive">
      <h2 id="archive" className={sectionLabel}>
        Archive
      </h2>
      <div className="mt-8 flex flex-col gap-14">
        {groupByYear(posts).map(([year, yearPosts]) => (
          <section key={year} aria-labelledby={`year-${year}`} className={cn(marginGrid, "gap-y-5")}>
            {/* The year stays pinned in the margin while its posts scroll past. */}
            <h3
              id={`year-${year}`}
              className="font-serif text-4xl leading-none font-light text-muted-foreground tabular-nums md:sticky md:top-10 md:self-start md:text-5xl"
            >
              {year}
            </h3>
            <ul className="flex flex-col gap-3">
              {yearPosts.map((post) => (
                <li
                  key={post.slug}
                  className="relative isolate flex items-baseline-last font-serif text-lg leading-snug"
                >
                  <span className="min-w-0 flex-1 text-pretty">
                    <span className="bg-background pr-2">
                      <PostLink post={post} className="after:-inset-x-2 after:-inset-y-1" />
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 -z-10 overflow-clip whitespace-nowrap text-muted-foreground/50 select-none [direction:rtl]"
                  >
                    {leader}
                  </span>
                  <time
                    dateTime={post.publishedAt.toISOString()}
                    className="ml-6 shrink-0 bg-background pl-2 font-sans text-sm whitespace-nowrap text-muted-foreground tabular-nums"
                  >
                    {formatMonthDay(post.publishedAt)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {pageCount > 1 && <PageLinks path="/" page={page} pageCount={pageCount} className="mt-16" />}
    </section>
  );
}

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
