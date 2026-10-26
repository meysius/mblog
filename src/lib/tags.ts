import { count, eq, like, max, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { db, type Transaction } from "@/db";
import { posts, postTags, tags } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isPublished, POSTS_TAG } from "@/lib/posts";
import { slugify } from "@/lib/slug";

// Public reads share the posts' cache tag: a tag's page changes with its posts,
// and post pages show their tags' names.

/** The tag at /tags/<slug>, or null if there's none. */
export async function getPublishedTag(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const [tag] = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug, description: tags.description })
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);
  return tag ?? null;
}

/** Tags that published posts have, with when the latest of those posts changed. */
export async function getPublishedTags() {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const rows = await db
    .select({ slug: tags.slug, updatedAt: max(posts.updatedAt) })
    .from(tags)
    .innerJoin(postTags, eq(postTags.tagId, tags.id))
    .innerJoin(posts, eq(posts.id, postTags.postId))
    .where(isPublished)
    .groupBy(tags.id)
    .orderBy(tags.slug);
  // The inner joins guarantee each tag has a post.
  return rows.map((row) => ({ ...row, updatedAt: row.updatedAt! }));
}

// Admin reads are never cached, and check the session themselves.

const byName = sql`lower(${tags.name})`;

/** Every tag, by name, with how many posts have it, drafts included. */
export async function getTags() {
  await requireUser();
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      postCount: count(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(byName);
}

/** Every tag's name and slug, for the post editor to suggest. */
export async function getTagOptions() {
  await requireUser();
  return db.select({ name: tags.name, slug: tags.slug }).from(tags).orderBy(byName);
}

export async function getTagForEditing(id: number) {
  await requireUser();
  const [tag] = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      postCount: count(postTags.postId),
      // Its page is on the blog once one of these is.
      publishedCount: sql<number>`count(*) filter (where ${isPublished})`.mapWith(Number),
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .leftJoin(posts, eq(posts.id, postTags.postId))
    .where(eq(tags.id, id))
    .groupBy(tags.id);
  return tag ?? null;
}

export type EditableTag = NonNullable<Awaited<ReturnType<typeof getTagForEditing>>>;

/**
 * The tag with this slug, for filtering the admin's post list. Cached per request,
 * since the filter, the list and the notice above it all need it.
 */
export const getTagBySlug = cache(async (slug: string) => {
  await requireUser();
  const [tag] = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);
  return tag ?? null;
});

/**
 * Gives a post these tags, in this order, replacing the ones it had. Names match
 * existing tags ignoring case; any other name becomes a new tag.
 */
export async function setPostTags(tx: Transaction, postId: number, names: string[]) {
  const tagIds: number[] = [];
  for (const name of names) {
    const [existing] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(eq(byName, sql`lower(${name})`))
      .limit(1);
    tagIds.push(existing?.id ?? (await createTag(tx, name)));
  }

  await tx.delete(postTags).where(eq(postTags.postId, postId));
  if (tagIds.length > 0) {
    await tx
      .insert(postTags)
      .values(tagIds.map((tagId, position) => ({ postId, tagId, position })));
  }
}

// A tag made from the post editor gets a URL from its name. Names with no letters
// or digits to use, such as ones in other scripts, get /tags/tag, /tags/tag-2…
async function createTag(tx: Transaction, name: string) {
  const base = slugify(name) || "tag";
  const taken = new Set(
    (
      await tx
        .select({ slug: tags.slug })
        .from(tags)
        .where(or(eq(tags.slug, base), like(tags.slug, `${base}-%`)))
    ).map(({ slug }) => slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const [tag] = await tx.insert(tags).values({ name, slug }).returning({ id: tags.id });
  return tag.id;
}
