import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { InfinitePosts, type ListPages } from "@/components/infinite-posts";
import { formatShortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import type { PostSummary } from "@/lib/posts";
import { formatReadingTime } from "@/lib/reading-time";
import { cn } from "@/lib/utils";

// Dates sit in this left margin; titles and excerpts in the column beside it.
const marginGrid = "grid gap-x-10 md:grid-cols-[8rem_1fr]";

// The small label over each part of the home page.
export const eyebrow = "text-[0.6875rem] font-medium tracking-[0.16em] uppercase";

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

/** Posts with their dates, excerpts and feature images, as tag pages list them. */
export function PostList({ posts, ...pages }: { posts: PostSummary[] } & ListPages) {
  return (
    <InfinitePosts className="flex flex-col gap-12" {...pages}>
      {posts.map((post) => (
        <PostListItem key={post.slug} post={post} />
      ))}
    </InfinitePosts>
  );
}

export function PostListItem({ post }: { post: PostSummary }) {
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

/** Posts as cards with thumbnails, under a label. The home page and its later pages show these. */
export function PostGrid({
  label,
  note,
  posts,
  ...pages
}: { label: string; note: string; posts: PostSummary[] } & ListPages) {
  return (
    <section aria-labelledby="posts">
      <div className="mb-7 flex items-baseline justify-between gap-4 border-b pb-4">
        <h2 id="posts" className={eyebrow}>
          {label}
        </h2>
        <span className="font-serif text-sm italic text-muted-foreground">{note}</span>
      </div>
      <InfinitePosts
        className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12"
        {...pages}
      >
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </InfinitePosts>
    </section>
  );
}

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <li className="group relative isolate min-w-0">
      <Thumbnail post={post} />
      <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {post.tags[0] && (
          <>
            <span className="font-medium text-link">{post.tags[0].name}</span>
            <span aria-hidden>·</span>
          </>
        )}
        <time dateTime={post.publishedAt.toISOString()}>{formatShortDate(post.publishedAt)}</time>
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
