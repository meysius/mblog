import { and, desc, eq, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { excerpt } from "@/lib/markdown";

// Public reads are cached until a write calls updateTag("posts").
export const POSTS_TAG = "posts";

const isPublished = lte(posts.publishedAt, sql`now()`);

// isPublished guarantees publishedAt is set; narrow the type to match.
function asPublished<T extends { publishedAt: Date | null }>(row: T) {
  return { ...row, publishedAt: row.publishedAt! };
}

export async function getPublishedPosts() {
  "use cache";
  cacheLife("max");
  cacheTag(POSTS_TAG);

  const rows = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      publishedAt: posts.publishedAt,
      // The start of the body is plenty to build an excerpt from.
      opening: sql<string>`left(${posts.body}, 2000)`,
    })
    .from(posts)
    .where(isPublished)
    .orderBy(desc(posts.publishedAt));
  return rows.map(({ opening, ...row }) => ({
    ...asPublished(row),
    excerpt: excerpt(opening, 240),
  }));
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
  return post ? asPublished(post) : null;
}

// Admin reads are never cached, and check the session themselves.
export async function getAllPosts() {
  await requireUser();
  return db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, publishedAt: posts.publishedAt })
    .from(posts)
    .orderBy(desc(posts.createdAt));
}

export async function getPostForEditing(id: number) {
  await requireUser();
  const [post] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return post ?? null;
}

export type EditablePost = NonNullable<Awaited<ReturnType<typeof getPostForEditing>>>;
