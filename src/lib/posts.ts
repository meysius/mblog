import { and, count, desc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { db } from "@/db";
import { media, posts, postTags, tags } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { excerpt } from "@/lib/markdown";
import { mediaUrl, type MediaImage } from "@/lib/media";

// Public reads are cached until a write calls updateTag("posts"), and for an hour
// at most ("hours" profile). Next forgets updateTag calls when the server restarts,
// so the hour limits how long a restarted server can show content from before a save.
export const POSTS_TAG = "posts";

export const isPublished = lte(posts.publishedAt, sql`now()`);

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

/** A tag as posts show it: a link to the tag's page. */
export type PostTag = { name: string; slug: string };

// A post's tags, in the order the author gave them.
const tagList = sql<PostTag[]>`(
  select coalesce(
    json_agg(json_build_object('name', ${tags.name}, 'slug', ${tags.slug}) order by ${postTags.position}),
    '[]'
  )
  from ${postTags}
  join ${tags} on ${tags.id} = ${postTags.tagId}
  where ${postTags.postId} = ${posts.id}
)`;

// Only the posts with this tag; every post without one.
function tagged(tagId: number | undefined) {
  return tagId === undefined
    ? undefined
    : inArray(
        posts.id,
        db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tagId, tagId)),
      );
}

function toMediaImage(
  image: { id: number; filename: string; width: number; height: number } | null,
): MediaImage | null {
  if (!image) return null;
  const { filename, ...rest } = image;
  return { ...rest, url: mediaUrl(filename) };
}

export async function getPublishedPosts() {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);
  return getPostSummaries();
}

/** The published posts with this tag, newest first, for its page on the blog. */
export async function getPublishedPostsTagged(tagId: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);
  return getPostSummaries(tagId);
}

// Published posts as post lists show them, newest first: every one, or those with a tag.
async function getPostSummaries(tagId?: number) {
  const rows = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      writtenExcerpt: posts.excerpt,
      // Without a written excerpt, the start of the body is plenty to build one from.
      opening: sql<string>`left(${posts.body}, 2000)`,
      featureImage: featureImageColumns,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(and(isPublished, tagged(tagId)))
    .orderBy(desc(posts.publishedAt));
  return rows.map(({ writtenExcerpt, opening, featureImage, ...row }) => ({
    ...asPublished(row),
    excerpt: writtenExcerpt || excerpt(opening, 240),
    featureImage: toMediaImage(featureImage),
  }));
}

export type PostSummary = Awaited<ReturnType<typeof getPostSummaries>>[number];

export async function getPublishedPost(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const [post] = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      featureImage: featureImageColumns,
      featureImageAlt: posts.featureImageAlt,
      tags: tagList,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(and(eq(posts.slug, slug), isPublished))
    .limit(1);
  return post ? { ...asPublished(post), featureImage: toMediaImage(post.featureImage) } : null;
}

/** The newest published posts with their full bodies, for the RSS feed. */
export async function getFeedPosts(limit: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      featureImage: featureImageColumns,
      featureImageAlt: posts.featureImageAlt,
      tags: tagList,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(isPublished)
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
  return rows.map((row) => ({ ...asPublished(row), featureImage: toMediaImage(row.featureImage) }));
}

/** How the admin groups posts: a draft has no publish date, a published post has one. */
export type PostStatus = "draft" | "published";

const hasStatus = {
  draft: isNull(posts.publishedAt),
  published: isNotNull(posts.publishedAt),
};

// Admin reads are never cached, and check the session themselves.

/** One page of posts, newest first, optionally only those with a tag. */
export async function getPosts(
  status: PostStatus | undefined,
  tagId: number | undefined,
  { limit, offset }: { limit: number; offset: number },
) {
  await requireUser();
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      featureImage: featureImageColumns,
      tags: tagList,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(and(status && hasStatus[status], tagged(tagId)))
    // The id breaks ties, so no post shows up on two pages or none.
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit)
    .offset(offset);
  return rows.map((row) => ({ ...row, featureImage: toMediaImage(row.featureImage) }));
}

// Cached per request, since the filter and the pagination both need it.
export const getPostCounts = cache(async (tagId?: number) => {
  await requireUser();
  const [{ all, published }] = await db
    .select({ all: count(), published: count(posts.publishedAt) })
    .from(posts)
    .where(tagged(tagId));
  return { all, draft: all - published, published };
});

export async function getPostForEditing(id: number) {
  await requireUser();
  const [post] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      featureImage: featureImageColumns,
      featureImageAlt: posts.featureImageAlt,
      tags: tagList,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(eq(posts.id, id))
    .limit(1);
  return post ? { ...post, featureImage: toMediaImage(post.featureImage) } : null;
}

export type EditablePost = NonNullable<Awaited<ReturnType<typeof getPostForEditing>>>;
