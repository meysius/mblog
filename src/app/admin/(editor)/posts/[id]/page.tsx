import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPostForEditing } from "@/lib/posts";
import { getRevisions } from "@/lib/revisions";
import { getTagOptions } from "@/lib/tags";
import { updatePost } from "../../../actions";
import { EditorFallback, PostEditor } from "../../post-editor";

export const metadata: Metadata = { title: "Edit post" };

export default function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  return (
    <Suspense fallback={<EditorFallback kind="post" />}>
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
  const [post, tagOptions, revisions] = await Promise.all([
    getPostForEditing(id),
    getTagOptions(),
    getRevisions(id),
  ]);
  // Pages have their own editor URL, /admin/pages/<id>.
  if (post?.kind !== "post") notFound();

  return (
    <PostEditor
      kind="post"
      post={post}
      tagOptions={tagOptions}
      revisions={revisions}
      action={updatePost.bind(null, "post", post.id)}
    />
  );
}
