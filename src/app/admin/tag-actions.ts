"use server";

import { eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { uniqueViolation } from "@/lib/db-errors";
import { joinLines } from "@/lib/excerpt";
import { POSTS_TAG } from "@/lib/posts";
import { SLUG_PATTERN } from "@/lib/slug";
import { cleanTagName, TAG_DESCRIPTION_MAX_LENGTH } from "@/lib/tag-name";

export type TagFormState = {
  errors?: { name?: string; slug?: string };
  // Set when an edit is saved, so the form can confirm it.
  savedAt?: number;
};

function readTagForm(formData: FormData) {
  const values = {
    name: cleanTagName(String(formData.get("name") ?? "")),
    slug: String(formData.get("slug") ?? "").trim(),
    description: joinLines(String(formData.get("description") ?? ""))
      .trim()
      .slice(0, TAG_DESCRIPTION_MAX_LENGTH),
  };

  let errors: TagFormState["errors"];
  if (!values.name) errors = { name: "Add a name." };
  else if (!SLUG_PATTERN.test(values.slug)) {
    errors = { slug: "Use lowercase letters, numbers and single dashes." };
  }
  return { values, errors };
}

function takenErrors(e: unknown, { name, slug }: { name: string; slug: string }) {
  switch (uniqueViolation(e)) {
    case "tags_name_unique":
      return { name: `There’s already a tag called “${name}”.` };
    case "tags_slug_unique":
      return { slug: `Another tag already uses /tags/${slug}. Pick a different URL.` };
  }
  throw e;
}

export async function createTag(
  _prev: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  await requireUser();
  const { values, errors } = readTagForm(formData);
  if (errors) return { errors };

  let id: number;
  try {
    [{ id }] = await db.insert(tags).values(values).returning({ id: tags.id });
  } catch (e) {
    return { errors: takenErrors(e, values) };
  }
  // No post has it yet, so the blog stays as it is.
  redirect(`/admin/tags/${id}`);
}

export async function saveTag(
  id: number,
  _prev: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  await requireUser();
  const { values, errors } = readTagForm(formData);
  if (errors) return { errors };

  let updated: { id: number } | undefined;
  try {
    [updated] = await db
      .update(tags)
      .set(values)
      .where(eq(tags.id, id))
      .returning({ id: tags.id });
  } catch (e) {
    return { errors: takenErrors(e, values) };
  }
  if (!updated) notFound();

  updateTag(POSTS_TAG);
  // Re-render the page so it shows the saved tag.
  refresh();
  return { savedAt: Date.now() };
}

/** Deletes the tag and takes it off its posts. The posts themselves stay. */
export async function deleteTag(id: number) {
  await requireUser();
  await db.delete(tags).where(eq(tags.id, id));
  updateTag(POSTS_TAG);
  redirect("/admin/tags");
}
