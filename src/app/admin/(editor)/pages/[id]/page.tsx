import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPostForEditing } from "@/lib/posts";
import { updatePost } from "../../../actions";
import { EditorSkeleton } from "../../editor-skeleton";
import { PostEditor } from "../../post-editor";

export const metadata: Metadata = { title: "Edit page" };

export default function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
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
  const page = await getPostForEditing(id);
  // Posts have their own editor URL, /admin/posts/<id>.
  if (page?.kind !== "page") notFound();

  return <PostEditor kind="page" post={page} action={updatePost.bind(null, "page", page.id)} />;
}
