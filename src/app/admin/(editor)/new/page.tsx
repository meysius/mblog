import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getTagOptions } from "@/lib/tags";
import { createPost } from "../../actions";
import { EditorSkeleton } from "../editor-skeleton";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NewPost />
    </Suspense>
  );
}

async function NewPost() {
  // Render at request time so the tag field suggests every saved tag.
  await connection();
  return (
    <PostEditor
      kind="post"
      tagOptions={await getTagOptions()}
      action={createPost.bind(null, "post")}
    />
  );
}
