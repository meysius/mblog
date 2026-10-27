import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPostForEditing } from "@/lib/posts";
import { getRevisions } from "@/lib/revisions";
import { updatePost } from "../../../actions";
import { EditorFallback, PostEditor } from "../../post-editor";

export const metadata: Metadata = { title: "Edit page" };

export default function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  return (
    <Suspense fallback={<EditorFallback kind="page" />}>
      {params.then(({ id }) => (
        <EditPage id={Number(id)} />
      ))}
    </Suspense>
  );
}

async function EditPage({ id }: { id: number }) {
  // Render at request time so the editor always opens the saved version.
  await connection();
  if (!Number.isSafeInteger(id)) notFound();
  const [page, revisions] = await Promise.all([getPostForEditing(id), getRevisions(id)]);
  // Posts have their own editor URL, /admin/posts/<id>.
  if (page?.kind !== "page") notFound();

  return (
    <PostEditor
      kind="page"
      post={page}
      revisions={revisions}
      action={updatePost.bind(null, "page", page.id)}
    />
  );
}
