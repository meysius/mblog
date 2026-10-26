"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { uniqueViolation } from "@/lib/db-errors";
import { EXCERPT_MAX_LENGTH, joinLines } from "@/lib/excerpt";
import { deleteUnusedMedia, syncPostMedia } from "@/lib/media-usage";
import { editorPath, listPath, type PostKind, readerPath, RESERVED_PAGE_SLUGS } from "@/lib/post-kind";
import { POSTS_TAG } from "@/lib/posts";
import { SLUG_PATTERN } from "@/lib/slug";
import { uniqueTagNames } from "@/lib/tag-name";
import { setPostTags } from "@/lib/tags";

export type PostFormState = {
  errors?: { title?: string; slug?: string };
  // Set when an edit is saved, so the editor can confirm it.
  savedAt?: number;
};

// Posts and pages share these actions (src/lib/post-kind.ts).

function readPostForm(kind: PostKind, formData: FormData) {
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
  // One field per tag, in order. Pages have none.
  const tags = kind === "post" ? uniqueTagNames(formData.getAll("tags").map(String)) : [];
  // Set by the Publish and Unpublish buttons. Any other save leaves the post as it was.
  const intent = formData.get("intent");
  const publish = intent === "publish";
  const unpublish = intent === "unpublish";

  let errors: PostFormState["errors"];
  if (!values.title) errors = { title: "Add a title." };
  else if (!SLUG_PATTERN.test(values.slug)) {
    errors = { slug: "Use lowercase letters, numbers and single dashes." };
  } else if (kind === "page" && RESERVED_PAGE_SLUGS.includes(values.slug)) {
    errors = { slug: `The site already uses /${values.slug}. Pick a different URL.` };
  }
  return { values, tags, publish, unpublish, errors };
}

function slugTakenErrors(e: unknown, kind: PostKind, slug: string) {
  if (uniqueViolation(e) === "posts_kind_slug_unique") {
    return {
      slug: `Another ${kind} already uses ${readerPath(kind, slug)}. Pick a different URL.`,
    };
  }
  throw e;
}

export async function createPost(
  kind: PostKind,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireUser();
  const { values, tags, publish, errors } = readPostForm(kind, formData);
  if (errors) return { errors };

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(posts)
        .values({ ...values, kind, publishedAt: publish ? sql`now()` : null })
        .returning({ id: posts.id });
      await setPostTags(tx, id, tags);
      await syncPostMedia(tx, id, values);
      return id;
    });
  } catch (e) {
    return { errors: slugTakenErrors(e, kind, values.slug) };
  }

  updateTag(POSTS_TAG);
  after(() => deleteUnusedMedia([]));
  redirect(editorPath(kind, id));
}

export async function updatePost(
  kind: PostKind,
  id: number,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireUser();
  const { values, tags, publish, unpublish, errors } = readPostForm(kind, formData);
  if (errors) return { errors };

  // The images this save stopped using, or undefined if there's no such post or page.
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
        .where(and(eq(posts.id, id), eq(posts.kind, kind)))
        .returning({ id: posts.id });
      if (!updated) return undefined;
      await setPostTags(tx, id, tags);
      return syncPostMedia(tx, id, values);
    });
  } catch (e) {
    return { errors: slugTakenErrors(e, kind, values.slug) };
  }
  if (!dropped) notFound();

  updateTag(POSTS_TAG);
  after(() => deleteUnusedMedia(dropped));
  // Re-render the editor page so it shows the saved post.
  refresh();
  return { savedAt: Date.now() };
}

/** Deletes a post or a page, then goes back to its list. */
export async function deletePost(id: number) {
  await requireUser();
  const { dropped, kind } = await db.transaction(async (tx) => {
    // A deleted post uses no images.
    const dropped = await syncPostMedia(tx, id, { body: "", featureImageId: null });
    const [deleted] = await tx
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ kind: posts.kind });
    return { dropped, kind: deleted?.kind ?? "post" };
  });
  updateTag(POSTS_TAG);
  after(() => deleteUnusedMedia(dropped));
  redirect(listPath(kind));
}
