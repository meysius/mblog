"use server";

import { eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { uniqueViolation } from "@/lib/db-errors";
import { EXCERPT_MAX_LENGTH, joinLines } from "@/lib/excerpt";
import { deleteUnusedMedia, syncPostMedia } from "@/lib/media-usage";
import { POSTS_TAG } from "@/lib/posts";
import { SLUG_PATTERN } from "@/lib/slug";
import { uniqueTagNames } from "@/lib/tag-name";
import { setPostTags } from "@/lib/tags";

export type PostFormState = {
  errors?: { title?: string; slug?: string };
  // Set when an edit is saved, so the editor can confirm it.
  savedAt?: number;
};

function readPostForm(formData: FormData) {
  // Submitted empty when the post has no feature image.
  const featureImageId = Number(formData.get("featureImageId")) || null;
  const values = {
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    // Browsers submit textarea line breaks as CRLF; store plain LF like the editor uses.
    body: String(formData.get("body") ?? "").replace(/\r\n?/g, "\n"),
    excerpt: joinLines(String(formData.get("excerpt") ?? ""))
      .trim()
      .slice(0, EXCERPT_MAX_LENGTH),
    featureImageId,
    featureImageAlt: featureImageId ? String(formData.get("featureImageAlt") ?? "").trim() : "",
  };
  // One field per tag, in order.
  const tags = uniqueTagNames(formData.getAll("tags").map(String));
  // Set by the Publish and Unpublish buttons. Any other save leaves the post as it was.
  const intent = formData.get("intent");
  const publish = intent === "publish";
  const unpublish = intent === "unpublish";

  let errors: PostFormState["errors"];
  if (!values.title) errors = { title: "Add a title." };
  else if (!SLUG_PATTERN.test(values.slug)) {
    errors = { slug: "Use lowercase letters, numbers and single dashes." };
  }
  return { values, tags, publish, unpublish, errors };
}

function slugTakenErrors(e: unknown, slug: string) {
  if (uniqueViolation(e) === "posts_slug_unique") {
    return { slug: `Another post already uses /posts/${slug}. Pick a different URL.` };
  }
  throw e;
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireUser();
  const { values, tags, publish, errors } = readPostForm(formData);
  if (errors) return { errors };

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(posts)
        .values({ ...values, publishedAt: publish ? sql`now()` : null })
        .returning({ id: posts.id });
      await setPostTags(tx, id, tags);
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
  const { values, tags, publish, unpublish, errors } = readPostForm(formData);
  if (errors) return { errors };

  // The images this save stopped using, or undefined if there's no such post.
  let dropped: number[] | undefined;
  try {
    dropped = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(posts)
        .set({
          ...values,
          // Publishing an already published post keeps its original date.
          ...(publish && { publishedAt: sql`coalesce(${posts.publishedAt}, now())` }),
          ...(unpublish && { publishedAt: null }),
        })
        .where(eq(posts.id, id))
        .returning({ id: posts.id });
      if (!updated) return undefined;
      await setPostTags(tx, id, tags);
      return syncPostMedia(tx, id, values);
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
