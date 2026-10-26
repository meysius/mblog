import Image from "next/image";
import Link from "next/link";
import { formatShortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import type { PostSummary } from "@/lib/posts";
import { cn } from "@/lib/utils";

// Dates and years sit in this left margin; titles and excerpts in the column beside it.
export const marginGrid = "grid gap-x-10 md:grid-cols-[8rem_1fr]";

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
