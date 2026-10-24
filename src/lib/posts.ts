import { and, desc, eq, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { media, posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { excerpt } from "@/lib/markdown";
import { mediaUrl, type MediaImage } from "@/lib/media";

// Public reads are cached until a write calls updateTag("posts").
export const POSTS_TAG = "posts";

const isPublished = lte(posts.publishedAt, sql`now()`);

// isPublished guarantees publishedAt is set; narrow the type to match.
function asPublished<T extends { publishedAt: Date | null }>(row: T) {
  return { ...row, publishedAt: row.publishedAt! };
}

// Selected from a left join of media on posts.featureImageId; all null when there's no image.
const featureImageColumns = {
  id: media.id,
  filename: media.filename,
  width: media.width,
  height: media.height,
};

function toMediaImage(
  image: { id: number; filename: string; width: number; height: number } | null,
): MediaImage | null {
  if (!image) return null;
  const { filename, ...rest } = image;
  return { ...rest, url: mediaUrl(filename) };
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
    .select({
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      publishedAt: posts.publishedAt,
      featureImage: featureImageColumns,
      featureImageAlt: posts.featureImageAlt,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(and(eq(posts.slug, slug), isPublished))
    .limit(1);
  return post ? { ...asPublished(post), featureImage: toMediaImage(post.featureImage) } : null;
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
      featureImage: featureImageColumns,
      featureImageAlt: posts.featureImageAlt,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(eq(posts.id, id))
    .limit(1);
  return post ? { ...post, featureImage: toMediaImage(post.featureImage) } : null;
}

export type EditablePost = NonNullable<Awaited<ReturnType<typeof getPostForEditing>>>;
