import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { marginGrid, PostLink } from "@/components/post-list";
import { formatLongDate, formatMonthDay, formatShortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { getPublishedPosts, type PostSummary } from "@/lib/posts";
import { alternates, getSiteSettings, openGraphDefaults } from "@/lib/site";
import { hasIntro, type Intro, isInternal } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    alternates: alternates(site, "/"),
    openGraph: {
      ...openGraphDefaults(site),
      type: "website",
      url: "/",
      title: site.title,
      description: site.description,
    },
  };
}

// The newest post is featured, this many follow in a grid, and the archive lists the rest.
const RECENT_COUNT = 6;

// The small label over each list of posts.
const sectionLabel = "text-sm font-medium text-muted-foreground";

export default async function Home() {
  const [[featured, ...rest], site] = await Promise.all([getPublishedPosts(), getSiteSettings()]);
  const recent = rest.slice(0, RECENT_COUNT);
  const older = rest.slice(RECENT_COUNT);

  return (
    <>
      {/* The intro's heading names the page when it has one. */}
      {!site.intro.heading && <h1 className="sr-only">{site.title}</h1>}
      <div className="flex flex-col gap-20 sm:gap-24">
        {hasIntro(site.intro) && <IntroSection intro={site.intro} />}
        {featured ? (
          <>
            <FeaturedPost post={featured} />
            {recent.length > 0 && <RecentPosts posts={recent} />}
            {older.length > 0 && <Archive posts={older} />}
          </>
        ) : (
          <p className="font-serif text-xl text-muted-foreground">Nothing published yet.</p>
        )}
      </div>
    </>
  );
}

const introButtonClass =
  "mt-5 inline-flex items-center rounded-xl border px-4 py-2 font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

// Set in Admin → Settings. Each part shows only when it's filled in.
function IntroSection({ intro: { photo, heading, text, button } }: { intro: Intro }) {
  return (
    <header className="flex flex-col items-start gap-3">
      {photo && (
        <Image
          src={mediaSrc(photo.url)}
          width={photo.width}
          height={photo.height}
          alt=""
          sizes="6rem"
          loading="eager"
          className="mb-5 size-24 rounded-full bg-muted object-cover"
        />
      )}
      {heading && (
        <h1 className="font-serif text-[1.75rem] leading-tight font-medium tracking-tight text-balance">
          {heading}
        </h1>
      )}
      {text && <Markdown className="max-w-[38rem] text-lg leading-relaxed">{text}</Markdown>}
      {button &&
        (isInternal(button.url) ? (
          <Link href={button.url} className={introButtonClass}>
            {button.label}
          </Link>
        ) : (
          <a href={button.url} className={introButtonClass}>
            {button.label}
          </a>
        ))}
    </header>
  );
}

function FeaturedPost({ post }: { post: PostSummary }) {
  return (
    <article className="relative">
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
          className="mb-7 aspect-[16/10] w-full rounded-2xl bg-muted object-cover"
        />
      )}
      <time
        dateTime={post.publishedAt.toISOString()}
        className="text-sm text-muted-foreground"
      >
        {formatLongDate(post.publishedAt)}
      </time>
      <h2 className="mt-2 font-serif text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl">
        <PostLink post={post} className="after:rounded-2xl" />
      </h2>
      {post.excerpt && (
        <p className="mt-3 line-clamp-3 max-w-[38rem] font-serif text-lg leading-relaxed text-pretty text-muted-foreground">
          {post.excerpt}
        </p>
      )}
    </article>
  );
}

function RecentPosts({ posts }: { posts: PostSummary[] }) {
  return (
    <section aria-labelledby="recent">
      <h2 id="recent" className={sectionLabel}>
        Recent
      </h2>
      <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {posts.map((post) => (
          <li key={post.slug} className="relative flex items-center gap-4">
            <Thumbnail post={post} />
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-serif text-lg leading-snug font-medium text-pretty">
                <PostLink post={post} className="after:-inset-2" />
              </h3>
              <p className="mt-1 flex flex-wrap gap-x-3 text-[0.8125rem] font-medium text-muted-foreground">
                {post.tags[0] && <span className="text-foreground">{post.tags[0].name}</span>}
                <time dateTime={post.publishedAt.toISOString()}>
                  {formatShortDate(post.publishedAt)}
                </time>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Thumbnail({ post }: { post: PostSummary }) {
  const className = "size-20 shrink-0 rounded-2xl bg-muted sm:size-24";
  return post.featureImage ? (
    <Image
      src={mediaSrc(post.featureImage.url)}
      width={post.featureImage.width}
      height={post.featureImage.height}
      alt=""
      sizes="(min-width: 40rem) 6rem, 5rem"
      className={cn(className, "object-cover")}
    />
  ) : (
    // Without a feature image, the title's first letter stands in.
    <div
      aria-hidden
      className={cn(
        className,
        "flex items-center justify-center font-serif text-3xl text-muted-foreground",
      )}
    >
      {Array.from(post.title)[0]}
    </div>
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
    </section>
  );
}
