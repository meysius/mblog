import type { Metadata } from "next";
import Image from "next/image";
import { marginGrid, PostLink, PostList } from "@/components/post-list";
import { formatLongDate, formatMonthDay } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { getPublishedPosts, type PostSummary } from "@/lib/posts";
import { alternates, openGraphDefaults, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  alternates: alternates("/"),
  openGraph: {
    ...openGraphDefaults,
    type: "website",
    url: "/",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

// The newest post leads, this many follow with excerpts, and the archive lists the rest.
const RECENT_COUNT = 6;

export default async function Home() {
  const [lead, ...rest] = await getPublishedPosts();
  const recent = rest.slice(0, RECENT_COUNT);
  const older = rest.slice(RECENT_COUNT);

  return (
    <>
      <h1 className="sr-only">{SITE_NAME}</h1>
      {lead ? (
        <div className="flex flex-col gap-20 sm:gap-28">
          <LeadPost post={lead} />
          {recent.length > 0 && <PostList posts={recent} />}
          {older.length > 0 && <Archive posts={older} />}
        </div>
      ) : (
        <p className="font-serif text-xl text-muted-foreground">Nothing published yet.</p>
      )}
    </>
  );
}

function LeadPost({ post }: { post: PostSummary }) {
  return (
    <article className="relative">
      <time
        dateTime={post.publishedAt.toISOString()}
        className="text-sm text-muted-foreground"
      >
        {formatLongDate(post.publishedAt)}
      </time>
      <h2 className="mt-4 font-serif text-[clamp(2.75rem,9vw,4.75rem)] leading-[1.02] font-normal tracking-[-0.025em] text-balance">
        <PostLink post={post} />
      </h2>
      {post.excerpt && (
        <p className="mt-6 line-clamp-3 max-w-[40ch] font-serif text-xl leading-snug text-pretty text-muted-foreground sm:text-2xl">
          {post.excerpt}
        </p>
      )}
      {post.featureImage && (
        <Image
          src={mediaSrc(post.featureImage.url)}
          width={post.featureImage.width}
          height={post.featureImage.height}
          alt=""
          // The site column is 48rem with 1.5rem of padding each side.
          sizes="(min-width: 48rem) 45rem, calc(100vw - 3rem)"
          loading="eager"
          fetchPriority="high"
          className="mt-10 max-h-[30rem] w-full rounded-lg bg-muted object-cover"
        />
      )}
    </article>
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

function Archive({ posts }: { posts: PostSummary[] }) {
  return (
    <section aria-labelledby="archive" className="border-t pt-10">
      <h2 id="archive" className="font-serif text-3xl font-medium tracking-tight">
        Archive
      </h2>
      <div className="mt-10 flex flex-col gap-14">
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
    </section>
  );
}
