"use server";

import { DrizzleQueryError, eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { DatabaseError } from "pg";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteUnusedMedia, syncPostMedia } from "@/lib/media-usage";
import { POSTS_TAG } from "@/lib/posts";

export type PostFormState = {
  errors?: { title?: string; slug?: string };
  // Set when an edit is saved, so the editor can confirm it.
  savedAt?: number;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNIQUE_VIOLATION = "23505";

function readPostForm(formData: FormData) {
  // Submitted empty when the post has no feature image.
  const featureImageId = Number(formData.get("featureImageId")) || null;
  const values = {
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    // Browsers submit textarea line breaks as CRLF; store plain LF like the editor uses.
    body: String(formData.get("body") ?? "").replace(/\r\n?/g, "\n"),
    featureImageId,
    featureImageAlt: featureImageId ? String(formData.get("featureImageAlt") ?? "").trim() : "",
  };
  const publish = formData.get("publish") === "on";

  let errors: PostFormState["errors"];
  if (!values.title) errors = { title: "Add a title." };
  else if (!SLUG_PATTERN.test(values.slug)) {
    errors = { slug: "Use lowercase letters, numbers and single dashes." };
  }
  return { values, publish, errors };
}

function slugTakenErrors(e: unknown, slug: string) {
  if (
    e instanceof DrizzleQueryError &&
    e.cause instanceof DatabaseError &&
    e.cause.code === UNIQUE_VIOLATION
  ) {
    return { slug: `Another post already uses /posts/${slug}. Pick a different URL.` };
  }
  throw e;
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireUser();
  const { values, publish, errors } = readPostForm(formData);
  if (errors) return { errors };

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(posts)
        .values({ ...values, publishedAt: publish ? sql`now()` : null })
        .returning({ id: posts.id });
      await syncPostMedia(tx, id, values);
      return id;
    });
  } catch (e) {
    return { errors: slugTakenErrors(e, values.slug) };
  }

  updateTag(POSTS_TAG);
  after(() => deleteUnusedMedia([]));
  redirect(`/admin/posts/${id}`);
}

export async function updatePost(
  id: number,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireUser();
  const { values, publish, errors } = readPostForm(formData);
  if (errors) return { errors };
  // Saving to preview never changes whether the post is published.
  const forPreview = formData.get("intent") === "preview";

  // The images this save stopped using, or undefined if there's no such post.
  let dropped: number[] | undefined;
  try {
    dropped = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(posts)
        .set({
          ...values,
          // Editing a published post keeps its original date; unpublishing clears it.
          ...(!forPreview && {
            publishedAt: publish ? sql`coalesce(${posts.publishedAt}, now())` : null,
          }),
        })
        .where(eq(posts.id, id))
        .returning({ id: posts.id });
      return updated && syncPostMedia(tx, id, values);
    });
  } catch (e) {
    return { errors: slugTakenErrors(e, values.slug) };
  }
  if (!dropped) notFound();

  updateTag(POSTS_TAG);
  after(() => deleteUnusedMedia(dropped));
  // Re-render the editor page so it shows the saved post.
  refresh();
  return { savedAt: Date.now() };
}

export async function deletePost(id: number) {
  await requireUser();
  const dropped = await db.transaction(async (tx) => {
    // A deleted post uses no images.
    const dropped = await syncPostMedia(tx, id, { body: "", featureImageId: null });
    await tx.delete(posts).where(eq(posts.id, id));
    return dropped;
  });
  updateTag(POSTS_TAG);
  after(() => deleteUnusedMedia(dropped));
  redirect("/admin");
}
