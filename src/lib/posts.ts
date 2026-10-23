import { and, desc, eq, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { posts } from "@/db/schema";

// Public reads are cached until a write calls updateTag("posts").
export const POSTS_TAG = "posts";

const isPublished = lte(posts.publishedAt, sql`now()`);

export async function getPublishedPosts() {
  "use cache";
  cacheLife("max");
  cacheTag(POSTS_TAG);

  return db
    .select({ slug: posts.slug, title: posts.title, publishedAt: posts.publishedAt })
    .from(posts)
    .where(isPublished)
    .orderBy(desc(posts.publishedAt));
}

export async function getPublishedPost(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(POSTS_TAG);

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), isPublished))
    .limit(1);
  return post ?? null;
}

// Admin reads are never cached.
export async function getAllPosts() {
  return db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, publishedAt: posts.publishedAt })
    .from(posts)
    .orderBy(desc(posts.createdAt));
}
