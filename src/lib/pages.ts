import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { media, posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { featureImageColumns, isPublished, POSTS_TAG, toMediaImage } from "@/lib/posts";

// Pages are rows in the posts table (src/lib/post-kind.ts), saved by the same
// actions, so public reads share the posts' cache tag.

const isPage = eq(posts.kind, "page");

/** The published page at /<slug>, or null if there's none. */
export async function getPublishedPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const [page] = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      excerpt: posts.excerpt,
      featureImage: featureImageColumns,
      featureImageAlt: posts.featureImageAlt,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(and(isPage, eq(posts.slug, slug), isPublished))
    .limit(1);
  return page ? { ...page, featureImage: toMediaImage(page.featureImage) } : null;
}

/** Every published page, for the sitemap and for prerendering. */
export async function getPublishedPages() {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const rows = await db
    .select({
      slug: posts.slug,
      updatedAt: posts.updatedAt,
      featureImage: featureImageColumns,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(and(isPage, isPublished))
    .orderBy(posts.slug);
  return rows.map((row) => ({ ...row, featureImage: toMediaImage(row.featureImage) }));
}

/**
 * Every page, newest first, for the admin. Not cached, and checks the session.
 * A site has a handful of pages, so there's no paging or filtering.
 */
export async function getPages() {
  await requireUser();
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      featureImage: featureImageColumns,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(isPage)
    .orderBy(desc(posts.createdAt), desc(posts.id));
  return rows.map((row) => ({ ...row, featureImage: toMediaImage(row.featureImage) }));
}
