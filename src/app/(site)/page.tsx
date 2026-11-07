import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { eyebrow, PostGrid, PostLink } from "@/components/post-list";
import { TagLinks } from "@/components/tag-links";
import { formatLongDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { getHomePage, type PostSummary } from "@/lib/posts";
import { formatReadingTime } from "@/lib/reading-time";
import { alternates, getSiteSettings, openGraphDefaults } from "@/lib/site";
import { hasIntro, type Intro, isInternal } from "@/lib/site-settings";
import { getPublishedTags } from "@/lib/tags";
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
  const [{ posts, pageCount }, site, tags] = await Promise.all([
    getHomePage(1),
    getSiteSettings(),
    getPublishedTags(),
  ]);
  const [lead, ...rest] = posts;

  return (
    <div data-home className="min-w-0">
      {!site.intro.heading && <h1 className="sr-only">{site.title}</h1>}
      {hasIntro(site.intro) && <IntroSection intro={site.intro} />}
      {lead ? (
        <div className="flex flex-col gap-14 sm:gap-20">
          <section aria-labelledby="journal">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t pt-5">
              <h2 id="journal" className={eyebrow}>
                The journal
              </h2>
              {tags.length > 0 && (
                <nav aria-label="Browse by tag">
                  <TagLinks tags={tags} />
                </nav>
              )}
            </div>
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
          <p className="font-system text-3xl font-extrabold tracking-[-0.01em]">Nothing published yet.</p>
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
          <h1 className="max-w-xl font-system text-4xl leading-[1.05] font-extrabold tracking-[-0.02em] text-balance sm:text-5xl lg:text-6xl">
            {heading}
          </h1>
        )}
      </div>
      {(text || button) && (
        <div className="min-w-0 self-end lg:pb-1">
          {text && (
            // Set like a post's excerpt.
            <Markdown className="max-w-xl font-system text-[1.0625rem] leading-[1.45] text-muted-foreground md:text-xl [&>p+p]:mt-4">
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

// The feature image keeps a 16:9 frame, as Ghost's themes give card images, so a
// wide banner loses only a sliver. It never stretches to the text beside it,
// which cropped one to a tall strip. It sits beside the text only on wide screens,
// where it gets most of the width; on narrower ones it leads above the text.
function LeadPost({ post }: { post: PostSummary }) {
  return (
    <article
      className={cn(
        "group relative isolate grid overflow-hidden rounded-lg bg-muted/55",
        post.featureImage && "xl:grid-cols-[1.6fr_1fr] xl:items-center",
      )}
    >
      {post.featureImage && (
        <div className="xl:p-3">
          <div className="overflow-hidden xl:rounded-md">
            <Image
              src={mediaSrc(post.featureImage.url)}
              width={post.featureImage.width}
              height={post.featureImage.height}
              alt=""
              sizes="(min-width: 80rem) 41rem, (min-width: 72rem) 68rem, (min-width: 40rem) calc(100vw - 4rem), calc(100vw - 3rem)"
              loading="eager"
              fetchPriority="high"
              className="aspect-video w-full bg-muted object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
            />
          </div>
        </div>
      )}
      <div
        className={cn(
          "flex min-w-0 flex-col items-start p-6 sm:p-9 lg:p-12",
          post.featureImage ? "xl:py-8 xl:pr-10 xl:pl-7" : "sm:p-12 lg:p-16",
        )}
      >
        <p className={cn(eyebrow, "mb-6 flex items-center gap-2 text-link")}>
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {post.featured ? "In the spotlight" : "Latest entry"}
          {post.tags[0] && <span className="text-muted-foreground"> / {post.tags[0].name}</span>}
        </p>
        <h3
          className={cn(
            "max-w-2xl font-system text-3xl leading-[1.05] font-extrabold tracking-[-0.01em] text-balance sm:text-4xl lg:text-[2.75rem]",
            post.featureImage && "xl:text-4xl",
          )}
        >
          <PostLink post={post} />
        </h3>
        {post.excerpt && (
          <p className="mt-4 line-clamp-3 max-w-xl font-system text-lg leading-normal text-pretty text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={post.publishedAt.toISOString()}>{formatLongDate(post.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{formatReadingTime(post.wordCount)}</span>
        </p>
        <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium xl:mt-6">
          Read the story
          <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
        </span>
      </div>
    </article>
  );
}

