import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getPostForEditing } from "@/lib/posts";
import { updatePost } from "../../../actions";
import { PostEditor } from "../../post-editor";

export const metadata: Metadata = { title: "Edit post" };

export default function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      {params.then(({ id }) => (
        <EditPost id={Number(id)} />
      ))}
    </Suspense>
  );
}

async function EditPost({ id }: { id: number }) {
  // Render at request time so the editor always opens the saved version.
  await connection();
  if (!Number.isSafeInteger(id)) notFound();
  const post = await getPostForEditing(id);
  if (!post) notFound();

  return <PostEditor post={post} action={updatePost.bind(null, post.id)} />;
}

function EditorSkeleton() {
  return (
    <div aria-hidden className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-14">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-8 w-36" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
