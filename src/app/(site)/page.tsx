import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { eyebrow, PostGrid, PostLink } from "@/components/post-list";
import { formatLongDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { getHomePage, type PostSummary } from "@/lib/posts";
import { formatReadingTime } from "@/lib/reading-time";
import { alternates, getSiteSettings, openGraphDefaults } from "@/lib/site";
import { hasIntro, type Intro, isInternal } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { loadHomePage } from "./actions";

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

const textLink =
  "inline-flex items-center gap-2 rounded-sm text-sm font-medium transition-colors outline-none hover:text-link focus-visible:ring-3 focus-visible:ring-ring/50";

// One post leads and the rest of the page follow in a grid, which carries on into
// the later pages, /page/2 and on, as the reader scrolls.
export default async function Home() {
  const [{ posts, pageCount }, site] = await Promise.all([getHomePage(1), getSiteSettings()]);
  const [lead, ...rest] = posts;

  return (
    <div data-home className="min-w-0">
      {!site.intro.heading && <h1 className="sr-only">{site.title}</h1>}
      {hasIntro(site.intro) && <IntroSection intro={site.intro} />}
      {lead ? (
        <div className="flex flex-col gap-14 sm:gap-20">
          <section aria-labelledby="journal">
            <h2 id="journal" className={cn(eyebrow, "mb-6 border-t pt-5")}>
              The journal
            </h2>
            <LeadPost post={lead} />
          </section>
          {rest.length > 0 && (
            <PostGrid
              label="Recent entries"
              note="Notes, ideas & observations"
              posts={rest}
              path="/"
              page={1}
              pageCount={pageCount}
              loadPageAction={loadHomePage}
            />
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

