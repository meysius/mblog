"use server";

import { DrizzleQueryError } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { DatabaseError } from "pg";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { POSTS_TAG } from "@/lib/posts";

export type PostFormState = {
  errors?: { title?: string; slug?: string };
  values?: { title: string; slug: string; body: string };
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNIQUE_VIOLATION = "23505";

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const values = {
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    body: String(formData.get("body") ?? ""),
  };
  const publish = formData.get("publish") === "on";

  if (!values.title) return { errors: { title: "Add a title." }, values };
  if (!SLUG_PATTERN.test(values.slug)) {
    return {
      errors: { slug: "Use lowercase letters, numbers and single dashes." },
      values,
    };
  }

  try {
    await db.insert(posts).values({ ...values, publishedAt: publish ? new Date() : null });
  } catch (e) {
    if (
      e instanceof DrizzleQueryError &&
      e.cause instanceof DatabaseError &&
      e.cause.code === UNIQUE_VIOLATION
    ) {
      return {
        errors: { slug: `Another post already uses /posts/${values.slug}. Pick a different URL.` },
        values,
      };
    }
    throw e;
  }

  updateTag(POSTS_TAG);
  redirect("/admin");
}
