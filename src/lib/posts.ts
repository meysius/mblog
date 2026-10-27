import {
  and,
  type Column,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  min,
  type SQL,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { db } from "@/db";
import { media, posts, postTags, tags } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { excerpt } from "@/lib/markdown";
import { mediaUrl, type MediaImage } from "@/lib/media";
import { pageCount, POSTS_PER_PAGE } from "@/lib/pagination";

// Public reads are cached until a write calls updateTag("posts"), and for an hour
// at most (see publishedCacheLife). Next forgets updateTag calls when the server
// restarts, so the hour limits how long a restarted server can show content from
// before a save.
export const POSTS_TAG = "posts";

export const isPublished = lte(posts.publishedAt, sql`now()`);
const isScheduled = gt(posts.publishedAt, sql`now()`);

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

/**
 * The cache life for public reads of posts and pages. It's the "hours" profile,
 * except while a post is scheduled: no save marks the cache out of date when the
 * post goes live, so reads expire then instead.
 */
export async function publishedCacheLife() {
  const [{ next }] = await db
    .select({ next: min(posts.publishedAt) })
    .from(posts)
    .where(isScheduled);
  // In seconds, and at least one in case the server's clock runs ahead of the database's.
  const due = next && Math.max(1, Math.ceil((next.getTime() - Date.now()) / 1000));
  if (!due || due > DAY) return { revalidate: HOUR, expire: DAY };

  // Static pages (ensureStatic) can't use data that expires in under five minutes. So a
  // post due sooner than that can be missing for the first visit after it's due,
  // which refreshes the cache in the background for the next one.
  const expire = Math.max(due, 5 * 60);
  return { revalidate: Math.min(due, HOUR, expire - 1), expire };
}

// Pages are rows in the posts table too (src/lib/post-kind.ts). Lists, the feed
// and post pages show posts only; pages have their own reads in src/lib/pages.ts.
export const isPost = eq(posts.kind, "post");

// isPublished guarantees publishedAt is set; narrow the type to match.
function asPublished<T extends { publishedAt: Date | null }>(row: T) {
  return { ...row, publishedAt: row.publishedAt! };
}

// Selected from a left join of media on posts.featureImageId; all null when there's no image.
export const featureImageColumns = {
  id: media.id,
  filename: media.filename,
  width: media.width,
  height: media.height,
};

/** A tag as posts show it: a link to the tag's page. */
export type PostTag = { name: string; slug: string };

// Runs of characters other than spaces, like countWords in src/lib/reading-time.ts.
export const countWordsIn = (body: Column) =>
  sql<number>`regexp_count(${body}, '\\S+')`.mapWith(Number);
const wordCount = countWordsIn(posts.body);

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

export function toMediaImage(
  image: { id: number; filename: string; width: number; height: number } | null,
): MediaImage | null {
  if (!image) return null;
  const { filename, ...rest } = image;
  return { ...rest, url: mediaUrl(filename) };
}

export async function getPublishedPosts() {
  "use cache";
  cacheLife(await publishedCacheLife());
  cacheTag(POSTS_TAG);
  return getPostSummaries();
}

/**
 * A page of the home page's posts, with how many pages there are. The lead post
 * comes first: the newest featured post, or the newest post when none is
 * featured. The rest follow, newest first.
 */
export async function getHomePage(page: number) {
  "use cache";
  cacheLife(await publishedCacheLife());
  cacheTag(POSTS_TAG);
  return getPostPage(page, { leadFirst: true });
}

/** A page of the published posts with this tag, newest first, for its page on the blog. */
export async function getPublishedPostsTagged(tagId: number, page: number) {
  "use cache";
  cacheLife(await publishedCacheLife());
  cacheTag(POSTS_TAG);
  return getPostPage(page, { tagId });
}

type ListOptions = { tagId?: number; leadFirst?: boolean };

async function getPostPage(page: number, options: ListOptions) {
  const [summaries, total] = await Promise.all([
    getPostSummaries({ ...options, page }),
    countPublished(options.tagId),
  ]);
  return { posts: summaries, total, pageCount: pageCount(total) };
}

// How many published posts there are: every one, or those with a tag.
async function countPublished(tagId?: number) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(posts)
    .where(and(isPost, isPublished, tagged(tagId)));
  return total;
}

// The post the home page leads with (see getHomePage).
const leadPostId = db
  .select({ id: posts.id })
  .from(posts)
  .where(and(isPost, isPublished))
  .orderBy(desc(posts.featured), desc(posts.publishedAt), desc(posts.id))
  .limit(1);
const isLeadPost = sql`${posts.id} = (${leadPostId})`;

// Published posts as post lists show them, newest first: every one, or those with
// a tag. With a page, only that page's posts.
async function getPostSummaries({ tagId, leadFirst, page }: ListOptions & { page?: number } = {}) {
  const query = db
    .select({
      slug: posts.slug,
      title: posts.title,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      writtenExcerpt: posts.excerpt,
      // Without a written excerpt, the start of the body is plenty to build one from.
      opening: sql<string>`left(${posts.body}, 2000)`,
      wordCount,
      featured: posts.featured,
      featureImage: featureImageColumns,
      tags: tagList,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(and(isPost, isPublished, tagged(tagId)))
    // The id breaks ties, so no post shows up on two pages or none.
    .orderBy(...(leadFirst ? [desc(isLeadPost)] : []), desc(posts.publishedAt), desc(posts.id))
    .$dynamic();
  const rows = await (page
    ? query.limit(POSTS_PER_PAGE).offset((page - 1) * POSTS_PER_PAGE)
    : query);
  return rows.map(({ writtenExcerpt, opening, featureImage, ...row }) => ({
    ...asPublished(row),
    excerpt: writtenExcerpt || excerpt(opening, 240),
    featureImage: toMediaImage(featureImage),
  }));
}

export type PostSummary = Awaited<ReturnType<typeof getPostSummaries>>[number];

export async function getPublishedPost(slug: string) {
  "use cache";
  cacheLife(await publishedCacheLife());
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
    .where(and(isPost, eq(posts.slug, slug), isPublished))
    .limit(1);
  return post ? { ...asPublished(post), featureImage: toMediaImage(post.featureImage) } : null;
}

/** The newest published posts with their full bodies, for the RSS feed. */
export async function getFeedPosts(limit: number) {
  "use cache";
  cacheLife(await publishedCacheLife());
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
    .where(and(isPost, isPublished))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
  return rows.map((row) => ({ ...asPublished(row), featureImage: toMediaImage(row.featureImage) }));
}

/**
 * How the admin groups posts: a draft has no publish date, a scheduled post has
 * one that's still to come, and a published post one that's past.
 */
export type PostStatus = "draft" | "scheduled" | "published";

const hasStatus = {
  draft: isNull(posts.publishedAt),
  scheduled: isScheduled,
  published: isPublished,
};

export const postStatus = sql<PostStatus>`case
  when ${hasStatus.draft} then 'draft'
  when ${hasStatus.scheduled} then 'scheduled'
  else 'published'
end`;

// Admin reads are never cached, and check the session themselves.

/** One page of posts, newest first, optionally only those with a tag. Pages aren't included. */
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
      status: postStatus,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      featured: posts.featured,
      featureImage: featureImageColumns,
      tags: tagList,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.featureImageId))
    .where(and(isPost, status && hasStatus[status], tagged(tagId)))
    // The id breaks ties, so no post shows up on two pages or none.
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit)
    .offset(offset);
  return rows.map((row) => ({ ...row, featureImage: toMediaImage(row.featureImage) }));
}

const countWhere = (condition: SQL) =>
  sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

// Cached per request, since the filter and the pagination both need it.
export const getPostCounts = cache(async (tagId?: number) => {
  await requireUser();
  const [counts] = await db
    .select({
      all: count(),
      draft: countWhere(hasStatus.draft),
      scheduled: countWhere(hasStatus.scheduled),
      published: countWhere(hasStatus.published),
    })
    .from(posts)
    .where(and(isPost, tagged(tagId)));
  return counts;
});

/** A post or a page, for its editor and preview. */
export async function getPostForEditing(id: number) {
  await requireUser();
  const [post] = await db
    .select({
      id: posts.id,
      kind: posts.kind,
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      excerpt: posts.excerpt,
      status: postStatus,
      publishedAt: posts.publishedAt,
      featured: posts.featured,
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
