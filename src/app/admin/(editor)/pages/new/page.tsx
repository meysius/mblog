import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createPost } from "../../../actions";
import { EditorSkeleton } from "../../editor-skeleton";
import { PostEditor } from "../../post-editor";

export const metadata: Metadata = { title: "New page" };

export default function NewPagePage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NewPage />
    </Suspense>
  );
}

async function NewPage() {
  // An expired session signs in again now, not after the page is written.
  await requireUser();
  return <PostEditor kind="page" action={createPost.bind(null, "page")} />;
}
