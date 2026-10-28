import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { Archive, PageLinks, PostLink } from "@/components/post-list";
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

// One post leads, six follow in the recent grid, and the archive lists the rest.
// Later pages, /page/2 and on, remain archive only.
const RECENT_COUNT = 6;
const eyebrow = "text-[0.6875rem] font-medium tracking-[0.16em] uppercase";
const textLink =
  "inline-flex items-center gap-2 rounded-sm text-sm font-medium transition-colors outline-none hover:text-link focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function Home() {
  const [{ posts, pageCount }, site] = await Promise.all([getHomePage(1), getSiteSettings()]);
  const [lead, ...rest] = posts;
  const recent = rest.slice(0, RECENT_COUNT);
  const older = rest.slice(RECENT_COUNT);

  return (
    <div data-home className="min-w-0">
      {!site.intro.heading && <h1 className="sr-only">{site.title}</h1>}
      {hasIntro(site.intro) && <IntroSection intro={site.intro} />}
      {lead ? (
        <div className="flex flex-col gap-14 sm:gap-20">
          <section aria-labelledby="journal">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
              <h2 id="journal" className={eyebrow}>
                The journal
              </h2>
              {older.length > 0 && (
                <a href="#archive" className={cn(textLink, "text-muted-foreground")}>
                  Browse archive <ArrowDown aria-hidden className="size-3.5" />
                </a>
              )}
            </div>
            <LeadPost post={lead} />
          </section>
          {recent.length > 0 && <RecentPosts posts={recent} />}
          {older.length > 0 ? (
            <div className="border-t pt-8 sm:pt-10">
              <Archive posts={older} page={1} pageCount={pageCount} />
            </div>
          ) : (
            pageCount > 1 && <PageLinks path="/" page={1} pageCount={pageCount} />
          )}
        </div>
      ) : (
        <div className="border-y py-16">
          <p className={cn(eyebrow, "mb-4 text-muted-foreground")}>The journal</p>
          <p className="font-serif text-3xl tracking-tight">Nothing published yet.</p>
        </div>
      )}
    </div>
  );
}

// Set in Admin → Settings. Each part shows only when it's filled in.
function IntroSection({ intro: { photo, heading, text, button } }: { intro: Intro }) {
  const buttonContent = button && (
    <>
      {button.label} <ArrowUpRight aria-hidden className="size-4" />
    </>
  );

  return (
    <header className="grid gap-8 pb-12 sm:gap-10 sm:pb-16 lg:grid-cols-2 lg:gap-16 lg:pt-4 lg:pb-20">
      <div className="min-w-0">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          {photo && (
            <Image
              src={mediaSrc(photo.url)}
              width={photo.width}
              height={photo.height}
              alt=""
              sizes="3rem"
              loading="eager"
              className="size-12 shrink-0 rounded-full bg-muted object-cover"
            />
          )}
          <p className={cn(eyebrow, "flex items-center gap-2 text-muted-foreground")}>
            {!photo && <span aria-hidden className="size-2 rounded-full bg-link" />}
            A personal journal
          </p>
        </div>
        {heading && (
          <h1 className="max-w-xl font-serif text-5xl leading-[1.05] font-normal tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
            {heading}
          </h1>
        )}
      </div>
      {(text || button) && (
        <div className="min-w-0 self-end lg:pb-1">
          {text && (
            <Markdown className="max-w-xl text-lg leading-relaxed text-muted-foreground [&>p+p]:mt-4">
              {text}
            </Markdown>
          )}
          {button &&
            (isInternal(button.url) ? (
              <Link href={button.url} className={cn(textLink, "mt-6 border-b border-foreground/30 pb-1")}>
                {buttonContent}
              </Link>
            ) : (
              <a href={button.url} className={cn(textLink, "mt-6 border-b border-foreground/30 pb-1")}>
                {buttonContent}
              </a>
            ))}
        </div>
      )}
    </header>
  );
}

function LeadPost({ post }: { post: PostSummary }) {
  return (
    <article
      className={cn(
        "group relative isolate grid overflow-hidden rounded-lg bg-muted/55",
        post.featureImage && "md:grid-cols-[1.1fr_1fr]",
      )}
    >
      {post.featureImage && (
        <div className="overflow-hidden">
          <Image
            src={mediaSrc(post.featureImage.url)}
            width={post.featureImage.width}
            height={post.featureImage.height}
            alt=""
            sizes="(min-width: 72rem) 36rem, (min-width: 48rem) 52vw, calc(100vw - 3rem)"
            loading="eager"
            fetchPriority="high"
            className="aspect-[4/3] h-full w-full bg-muted object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none md:aspect-auto md:min-h-96"
          />
        </div>
      )}
      <div className={cn("flex min-w-0 flex-col items-start p-6 sm:p-9 lg:p-12", !post.featureImage && "sm:p-12 lg:p-16")}>
        <p className={cn(eyebrow, "mb-6 flex items-center gap-2 text-link")}>
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {post.featured ? "In the spotlight" : "Latest entry"}
          {post.tags[0] && <span className="text-muted-foreground"> / {post.tags[0].name}</span>}
        </p>
        <h3 className="max-w-2xl font-serif text-3xl leading-[1.1] font-medium tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">
          <PostLink post={post} />
        </h3>
        {post.excerpt && (
          <p className="mt-4 line-clamp-3 max-w-xl font-serif text-lg leading-relaxed text-pretty text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={post.publishedAt.toISOString()}>{formatLongDate(post.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{formatReadingTime(post.wordCount)}</span>
        </p>
        <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium md:mt-auto md:pt-8">
          Read the story
          <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
        </span>
      </div>
    </article>
  );
}

function RecentPosts({ posts }: { posts: PostSummary[] }) {
  return (
    <section aria-labelledby="recent">
      <div className="mb-7 flex items-baseline justify-between gap-4 border-b pb-4">
        <h2 id="recent" className={eyebrow}>
          Recent entries
        </h2>
        <span className="font-serif text-sm italic text-muted-foreground">Notes, ideas & observations</span>
      </div>
      <ul className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
        {posts.map((post) => (
          <li key={post.slug} className="group relative isolate min-w-0">
            <Thumbnail post={post} />
            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {post.tags[0] && (
                <>
                  <span className="font-medium text-link">{post.tags[0].name}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <time dateTime={post.publishedAt.toISOString()}>
                {formatShortDate(post.publishedAt)}
              </time>
            </p>
            <h3 className="mt-2 font-serif text-2xl leading-tight font-medium tracking-tight text-pretty">
              <PostLink post={post} />
            </h3>
            {post.excerpt && (
              <p className="mt-3 line-clamp-2 font-serif text-base leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatReadingTime(post.wordCount)}</span>
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Thumbnail({ post }: { post: PostSummary }) {
  return (
    <div className="aspect-[16/10] overflow-hidden rounded-md bg-muted">
      {post.featureImage ? (
        <Image
          src={mediaSrc(post.featureImage.url)}
          width={post.featureImage.width}
          height={post.featureImage.height}
          alt=""
          sizes="(min-width: 72rem) 22rem, (min-width: 64rem) 30vw, (min-width: 40rem) 46vw, calc(100vw - 3rem)"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transition-none"
        />
      ) : (
        <div aria-hidden className="flex h-full items-center justify-center bg-linear-to-br from-muted to-background font-serif text-7xl italic text-foreground/20">
          {Array.from(post.title)[0]}
        </div>
      )}
    </div>
  );
}
