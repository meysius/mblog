import { Plus, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { formatPostCount } from "@/lib/format";
import { getTags } from "@/lib/tags";
import { postsHref } from "../post-filters";

export const metadata: Metadata = { title: "Tags" };

export default function TagsPage() {
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold tracking-tight">Tags</h1>
        <Link href="/admin/tags/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          New tag
        </Link>
      </div>

      <Suspense fallback={<TagListSkeleton />}>
        <TagList />
      </Suspense>
    </>
  );
}

async function TagList() {
  // Render at request time so the admin always sees the current database state.
  await connection();
  const tags = await getTags();

  if (tags.length === 0) {
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Tag />
          </EmptyMedia>
          <EmptyTitle>No tags yet</EmptyTitle>
          <EmptyDescription>
            Add tags to a post in its settings, or start one here with New tag.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="-mx-3">
      {tags.map((tag) => (
        // The name link covers the whole row; the post count link sits above it.
        <li
          key={tag.id}
          className="relative flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/tags/${tag.id}`}
              className="font-medium wrap-anywhere outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {tag.name}
            </Link>
            {/* No room for the description on phones. */}
            <p className="mt-1 flex gap-2 text-sm text-muted-foreground">
              <span className="max-w-full shrink-0 truncate">/tags/{tag.slug}</span>
              {tag.description && (
                <>
                  <span aria-hidden className="max-sm:hidden">
                    ·
                  </span>
                  <span className="truncate max-sm:hidden">{tag.description}</span>
                </>
              )}
            </p>
          </div>
          {tag.postCount > 0 ? (
            <Link
              href={postsHref({ tag: tag.slug })}
              aria-label={`${formatPostCount(tag.postCount)} tagged ${tag.name}`}
              className="relative shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground tabular-nums transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {formatPostCount(tag.postCount)}
            </Link>
          ) : (
            <span className="shrink-0 px-2 text-sm text-muted-foreground">No posts</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function TagListSkeleton() {
  return (
    <div aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-4 py-3">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}
