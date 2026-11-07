import Image from "next/image";
import { Markdown } from "@/components/markdown";
import { TagLinks } from "@/components/tag-links";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLongDate } from "@/lib/format";
import { mediaSrc, type MediaImage } from "@/lib/media";
import type { PostKind } from "@/lib/post-kind";
import type { PostTag } from "@/lib/posts";
import { countWords, formatReadingTime } from "@/lib/reading-time";
import { cn } from "@/lib/utils";

type PostArticleProps = {
  /** A page shows no date. */
  kind?: PostKind;
  post: {
    title: string;
    body: string;
    /** Shown under the title when the author wrote one. */
    excerpt: string;
    /** Null for a draft, which only the preview shows. Posts only. */
    publishedAt?: Date | null;
    featureImage: MediaImage | null;
    featureImageAlt: string;
    /** Posts only. */
    tags?: PostTag[];
  };
};

/**
 * A post or page as readers see it. Shared by the post and page routes, the
 * editor's Preview and the admin preview.
 */
export function PostArticle({ kind = "post", post }: PostArticleProps) {
  const tags = post.tags ?? [];

  return (
    <article>
      <header className="mb-10">
        {kind === "post" && (
          <p className="text-sm text-muted-foreground">
            {post.publishedAt ? (
              <time dateTime={post.publishedAt.toISOString()}>
                {formatLongDate(post.publishedAt)}
              </time>
            ) : (
              "Not published yet"
            )}
            {" · "}
            {formatReadingTime(countWords(post.body))}
          </p>
        )}
        <h1 className={cn("article-title", kind === "post" && "mt-3")}>
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="article-excerpt mt-3.5 md:mt-5">
            {post.excerpt}
          </p>
        )}
      </header>
      {post.featureImage && (
        <Image
          src={mediaSrc(post.featureImage.url)}
          width={post.featureImage.width}
          height={post.featureImage.height}
          alt={post.featureImageAlt}
          // The site column is 48rem with 1.5rem of padding each side.
          sizes="(min-width: 48rem) 45rem, calc(100vw - 3rem)"
          loading="eager"
          fetchPriority="high"
          className="mb-10 w-full rounded-lg bg-muted"
        />
      )}
      <Markdown>{post.body}</Markdown>
      {/* Where a reader finishes, ways to find more like it. */}
      {tags.length > 0 && (
        <footer className="mt-16">
          <h2 className="sr-only">Tags</h2>
          <TagLinks tags={tags} />
        </footer>
      )}
    </article>
  );
}

export function PostArticleSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-4 h-11 w-3/4" />
      <div className="mt-12 flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
