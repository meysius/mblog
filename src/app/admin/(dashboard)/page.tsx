import { PenLine, Plus, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { getPostCounts, getPosts } from "@/lib/posts";
import { getTagBySlug } from "@/lib/tags";
import { Pagination } from "./pagination";
import {
  FILTER_LABELS,
  parsePage,
  parseStatus,
  parseTag,
  POSTS_PER_PAGE,
  postsHref,
  type PostFilter,
} from "./post-filters";
import { PostRow, PostRowsSkeleton } from "./post-rows";

export const metadata: Metadata = { title: "Posts" };

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = searchParams.then(({ status, tag, page }) => ({
    filter: { status: parseStatus(status), tag: parseTag(tag) },
    page: parsePage(page),
  }));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-4">
        <h1 className="mr-auto text-2xl font-semibold tracking-tight">Posts</h1>
        {/* On phones the filter gets a row of its own, below the title and button. */}
        <div className="order-last w-full sm:order-none sm:w-auto">
          <Suspense fallback={<Skeleton className="h-8 w-full sm:w-64" />}>
            {params.then(({ filter }) => (
              <StatusFilter filter={filter} />
            ))}
          </Suspense>
        </div>
        <Link href="/admin/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          New post
        </Link>
      </div>

      <Suspense>
        {params.then(({ filter }) => filter.tag && <TagNotice filter={filter} />)}
      </Suspense>

      <Suspense fallback={<PostRowsSkeleton />}>
        {params.then(({ filter, page }) => (
          <PostList filter={filter} page={page} />
        ))}
      </Suspense>
    </>
  );
}

const statuses = [undefined, "draft", "published"] as const;

// The tag the list is filtered by, or undefined for every post. Null when the
// URL names a tag that doesn't exist.
async function filterTag(slug: string | undefined) {
  return slug === undefined ? undefined : getTagBySlug(slug);
}

async function StatusFilter({ filter }: { filter: PostFilter }) {
  // Render at request time so the counts match the database.
  await connection();
  const tag = await filterTag(filter.tag);
  const counts = await getPostCounts(tag?.id);

  return (
    <nav aria-label="Filter posts" className="flex h-8 rounded-lg bg-muted p-[3px] text-sm">
      {statuses.map((status) => {
        const key = status ?? "all";
        return (
          <Link
            key={key}
            href={postsHref({ ...filter, status })}
            aria-current={filter.status === status ? "page" : undefined}
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

// Which posts are filtered by tag, and how to show them all again.
async function TagNotice({ filter }: { filter: PostFilter }) {
  await connection();
  const tag = await filterTag(filter.tag);
  if (!tag) return null;

  return (
    <p className="-mt-2 mb-4 flex items-center gap-2 text-sm text-muted-foreground">
      Tagged
      <Link
        href={postsHref({ status: filter.status })}
        title="Show posts with any tag"
        className="flex h-6 items-center gap-1 rounded-full bg-muted pr-1.5 pl-2.5 font-medium text-foreground transition-colors outline-none hover:bg-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {tag.name}
        <X className="size-3.5 text-muted-foreground" />
        <span className="sr-only">(show posts with any tag)</span>
      </Link>
    </p>
  );
}

const emptyMessages = {
  all: ["No posts yet", "Start with New post. Drafts stay private until you publish them."],
  draft: ["No drafts", "Posts you save without publishing wait here."],
  published: ["Nothing published yet", "Publish a draft and it shows up here and on the blog."],
};

const taggedEmptyMessages = {
  all: ["No posts with this tag", "Add tags to a post in its settings."],
  draft: ["No drafts with this tag", "Drafts you give this tag wait here."],
  published: ["Nothing published with this tag", "Publish a post with this tag and it shows up here."],
};

async function PostList({ filter, page }: { filter: PostFilter; page: number }) {
  // Render at request time so the admin always sees the current database state.
  await connection();
  const tag = await filterTag(filter.tag);
  // A tag that's gone, for example after deleting it.
  if (tag === null) redirect(postsHref({ status: filter.status }));

  const { status } = filter;
  const total = (await getPostCounts(tag?.id))[status ?? "all"];
  const pageCount = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  // Past the last page, for example after deleting the only post on it.
  if (page > pageCount) redirect(postsHref(filter, pageCount));

  const posts = await getPosts(status, tag?.id, {
    limit: POSTS_PER_PAGE,
    offset: (page - 1) * POSTS_PER_PAGE,
  });
  const [emptyTitle, emptyDescription] = (tag ? taggedEmptyMessages : emptyMessages)[
    status ?? "all"
  ];

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

  const first = (page - 1) * POSTS_PER_PAGE + 1;
  return (
    <>
      <ul className="-mx-3">
        {posts.map((post) => (
          <PostRow key={post.id} kind="post" post={post} />
        ))}
      </ul>
      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4 border-t pt-4">
          <p className="text-sm text-muted-foreground tabular-nums">
            {first}–{first + posts.length - 1} of {total}
          </p>
          <Pagination
            page={page}
            pageCount={pageCount}
            href={(page) => postsHref(filter, page)}
          />
        </div>
      )}
    </>
  );
}
