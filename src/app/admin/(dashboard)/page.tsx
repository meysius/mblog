import { ArrowUpRight, FileText, PenLine, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { mediaSrc, type MediaImage } from "@/lib/media";
import { getAllPosts, getPostCounts, type PostStatus } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { FILTER_LABELS, parseStatus, postsHref } from "./post-filters";

export const metadata: Metadata = { title: "Posts" };

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  const status = searchParams.then(({ status }) => parseStatus(status));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-4">
        <h1 className="mr-auto text-2xl font-semibold tracking-tight">Posts</h1>
        {/* On phones the filter gets a row of its own, below the title and button. */}
        <div className="order-last w-full sm:order-none sm:w-auto">
          <Suspense fallback={<Skeleton className="h-8 w-full sm:w-64" />}>
            {status.then((status) => (
              <StatusFilter current={status} />
            ))}
          </Suspense>
        </div>
        <Link href="/admin/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          New post
        </Link>
      </div>

      <Suspense fallback={<PostListSkeleton />}>
        {status.then((status) => (
          <PostList status={status} />
        ))}
      </Suspense>
    </>
  );
}

const statuses = [undefined, "draft", "published"] as const;

async function StatusFilter({ current }: { current?: PostStatus }) {
  // Render at request time so the counts match the database.
  await connection();
  const counts = await getPostCounts();

  return (
    <nav aria-label="Filter posts" className="flex h-8 rounded-lg bg-muted p-[3px] text-sm">
      {statuses.map((status) => {
        const key = status ?? "all";
        return (
          <Link
            key={key}
            href={postsHref(status)}
            aria-current={current === status ? "page" : undefined}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 font-medium whitespace-nowrap text-foreground/60 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm dark:text-muted-foreground dark:aria-[current=page]:border-input dark:aria-[current=page]:bg-input/30"
          >
            {FILTER_LABELS[key]}
            <span className="text-xs text-muted-foreground tabular-nums">{counts[key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const emptyMessages = {
  all: ["No posts yet", "Start with New post. Drafts stay private until you publish them."],
  draft: ["No drafts", "Posts you save without publishing wait here."],
  published: ["Nothing published yet", "Publish a draft and it shows up here and on the blog."],
};

async function PostList({ status }: { status?: PostStatus }) {
  // Render at request time so the admin always sees the current database state.
  await connection();
  const posts = await getAllPosts(status);
  const [emptyTitle, emptyDescription] = emptyMessages[status ?? "all"];

  if (posts.length === 0) {
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PenLine />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="-mx-3">
      {posts.map((post) => (
        <PostRow key={post.id} post={post} />
      ))}
    </ul>
  );
}

type PostRowProps = {
  post: Awaited<ReturnType<typeof getAllPosts>>[number];
};

function PostRow({ post }: PostRowProps) {
  const { publishedAt } = post;
  const [readerHref, readerLabel] = publishedAt
    ? [`/posts/${post.slug}`, "View on the blog"]
    : [`/admin/posts/${post.id}/preview`, "Preview draft"];

  return (
    // The title link covers the whole row; the reader link sits above it.
    <li className="group relative flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
      <Thumbnail image={post.featureImage} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/posts/${post.id}`}
          className="font-medium wrap-anywhere outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {post.title}
        </Link>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {publishedAt ? (
            <span className="shrink-0">Published {formatShortDate(publishedAt)}</span>
          ) : (
            <>
              <Badge variant="secondary">Draft</Badge>
              <span className="shrink-0">Edited {formatShortDate(post.updatedAt)}</span>
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

function PostListSkeleton() {
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
