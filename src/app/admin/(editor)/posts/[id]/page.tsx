import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPostForEditing } from "@/lib/posts";
import { getTagOptions } from "@/lib/tags";
import { updatePost } from "../../../actions";
import { EditorSkeleton } from "../../editor-skeleton";
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
  const [post, tagOptions] = await Promise.all([getPostForEditing(id), getTagOptions()]);
  if (!post) notFound();

  return (
    <PostEditor post={post} tagOptions={tagOptions} action={updatePost.bind(null, post.id)} />
  );
}
