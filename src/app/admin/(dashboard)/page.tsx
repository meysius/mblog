import { ArrowUpRight, PenLine } from "lucide-react";
import type { Metadata } from "next";
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
import { getAllPosts, type PostStatus } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { FILTER_LABELS, parseStatus } from "./post-filters";

export const metadata: Metadata = { title: "Posts" };

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<PostListSkeleton />}>
      {searchParams.then(({ status }) => (
        <PostList status={parseStatus(status)} />
      ))}
    </Suspense>
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

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {FILTER_LABELS[status ?? "all"]}
      </h1>
      {posts.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PenLine />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="-mx-3">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </ul>
      )}
    </>
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
    <li className="group relative flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
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
          <span aria-hidden className="max-sm:hidden">
            ·
          </span>
          <span className="truncate max-sm:hidden">/posts/{post.slug}</span>
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

function PostListSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="mb-6 h-8 w-36" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-2 py-3.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}
