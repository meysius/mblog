import { ArrowUpRight, FileText, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { mediaSrc, type MediaImage } from "@/lib/media";
import { editorPath, type PostKind, previewPath, readerPath } from "@/lib/post-kind";
import type { PostStatus, PostTag } from "@/lib/posts";
import { cn } from "@/lib/utils";

// Rows in the admin's lists of posts and of pages.

type PostRowProps = {
  kind: PostKind;
  post: {
    id: number;
    slug: string;
    title: string;
    status: PostStatus;
    publishedAt: Date | null;
    updatedAt: Date;
    featureImage: MediaImage | null;
    /** Posts only. */
    featured?: boolean;
    /** Posts only. */
    tags?: PostTag[];
  };
};

export function PostRow({ kind, post }: PostRowProps) {
  const { status, publishedAt } = post;
  const [readerHref, readerLabel] =
    status === "published"
      ? [readerPath(kind, post.slug), "View on the blog"]
      : [previewPath(kind, post.id), status === "draft" ? "Preview draft" : "Preview"];
  // A post's tags; a page's URL, for linking to it from the header.
  const detail =
    kind === "page" ? readerPath(kind, post.slug) : post.tags?.map((tag) => tag.name).join(", ");

  return (
    // The title link covers the whole row; the reader link sits above it.
    <li className="group relative flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
      <Thumbnail image={post.featureImage} />
      <div className="min-w-0 flex-1">
        <Link
          href={editorPath(kind, post.id)}
          className="font-medium wrap-anywhere outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {post.title}
        </Link>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {status === "published" && publishedAt ? (
            <span className="shrink-0">Published {formatShortDate(publishedAt)}</span>
          ) : status === "scheduled" && publishedAt ? (
            <>
              <Badge variant="outline">Scheduled</Badge>
              <span className="shrink-0">
                Goes live <LocalDateTime date={publishedAt} />
              </span>
            </>
          ) : (
            <>
              <Badge variant="secondary">Draft</Badge>
              <span className="shrink-0">Edited {formatShortDate(post.updatedAt)}</span>
            </>
          )}
          {post.featured && (
            <>
              <span aria-hidden>·</span>
              <span className="flex shrink-0 items-center gap-1">
                <Star className="size-3.5 fill-current" />
                Featured
              </span>
            </>
          )}
          {detail && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{detail}</span>
            </>
          )}
        </p>
      </div>
      <Link
        href={readerHref}
        target="_blank"
        aria-label={`${readerLabel}: ${post.title}`}
        title={readerLabel}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "relative text-muted-foreground hover:bg-background pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100",
        )}
      >
        <ArrowUpRight />
      </Link>
    </li>
  );
}

const thumbnailBox = "h-12 w-18 shrink-0 rounded-md bg-muted";

// The feature image, or a placeholder so titles line up either way.
function Thumbnail({ image }: { image: MediaImage | null }) {
  return image ? (
    <Image
      src={mediaSrc(image.url)}
      width={image.width}
      height={image.height}
      alt=""
      sizes="4.5rem"
      className={cn(thumbnailBox, "object-cover")}
    />
  ) : (
    <div
      aria-hidden
      className={cn(thumbnailBox, "flex items-center justify-center text-muted-foreground/50")}
    >
      <FileText className="size-5" />
    </div>
  );
}

export function PostRowsSkeleton() {
  return (
    <div aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-4 py-3">
          <Skeleton className={thumbnailBox} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
