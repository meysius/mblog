import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPostCount } from "@/lib/format";
import { getTagForEditing } from "@/lib/tags";
import { saveTag } from "../../../tag-actions";
import { postsHref } from "../../post-filters";
import { BackToTags } from "../back-link";
import { DeleteTagButton, TagForm } from "../tag-form";

export const metadata: Metadata = { title: "Edit tag" };

export default function EditTagPage({ params }: PageProps<"/admin/tags/[id]">) {
  return (
    <>
      <BackToTags />
      <Suspense fallback={<EditTagSkeleton />}>
        {params.then(({ id }) => (
          <EditTag id={Number(id)} />
        ))}
      </Suspense>
    </>
  );
}

const textLink = "font-medium text-foreground underline-offset-4 hover:underline";

async function EditTag({ id }: { id: number }) {
  // Render at request time so the form always opens the saved version.
  await connection();
  if (!Number.isSafeInteger(id)) notFound();
  const tag = await getTagForEditing(id);
  if (!tag) notFound();

  return (
    <>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight wrap-anywhere">{tag.name}</h1>
      <p className="mt-2 mb-8 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {tag.postCount > 0 ? (
          <Link href={postsHref({ tag: tag.slug })} className={textLink}>
            {formatPostCount(tag.postCount)}
          </Link>
        ) : (
          <span>No posts yet</span>
        )}
        {/* Its page is on the blog once one of its posts is. */}
        {tag.publishedCount > 0 && (
          <Link href={`/tags/${tag.slug}`} target="_blank" className={textLink}>
            View on the blog
            <ArrowUpRight className="ml-0.5 inline size-3.5 align-[-0.125em]" />
          </Link>
        )}
      </p>
      <TagForm tag={tag} action={saveTag.bind(null, tag.id)} />
      <div className="mt-12 max-w-lg border-t pt-4">
        <DeleteTagButton tag={tag} />
      </div>
    </>
  );
}

function EditTagSkeleton() {
  return (
    <div aria-hidden className="flex max-w-lg flex-col">
      <Skeleton className="mt-4 h-7 w-48" />
      <Skeleton className="mt-3 mb-8 h-4 w-32" />
      <div className="flex flex-col gap-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
