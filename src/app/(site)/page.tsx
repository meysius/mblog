import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { Archive, PostLink, sectionLabel } from "@/components/post-list";
import { formatLongDate, formatShortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { getHomePage, type PostSummary } from "@/lib/posts";
import { formatReadingTime } from "@/lib/reading-time";
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

// One post leads, this many follow in a grid, and the archive lists the rest of the
// first page. Later pages, /page/2 and on, are archive only.
const RECENT_COUNT = 6;

export default async function Home() {
  const [{ posts, pageCount }, site] = await Promise.all([getHomePage(1), getSiteSettings()]);
  // The lead post comes first (see getHomePage).
  const [lead, ...rest] = posts;
  const recent = rest.slice(0, RECENT_COUNT);
  const older = rest.slice(RECENT_COUNT);

  return (
    <>
      {/* The intro's heading names the page when it has one. */}
      {!site.intro.heading && <h1 className="sr-only">{site.title}</h1>}
      <div className="flex flex-col gap-20 sm:gap-24">
        {hasIntro(site.intro) && <IntroSection intro={site.intro} />}
        {lead ? (
          <>
            <LeadPost post={lead} />
            {recent.length > 0 && <RecentPosts posts={recent} />}
            {older.length > 0 && <Archive posts={older} page={1} pageCount={pageCount} />}
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

function LeadPost({ post }: { post: PostSummary }) {
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
      <p className="text-sm text-muted-foreground">
        {post.featured && <span className="font-medium text-foreground">Featured · </span>}
        <time dateTime={post.publishedAt.toISOString()}>{formatLongDate(post.publishedAt)}</time>
        {" · "}
        {formatReadingTime(post.wordCount)}
      </p>
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
                <span>{formatReadingTime(post.wordCount)}</span>
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
