import "server-only";
import { and, eq, inArray, lt, notExists, notInArray, or, sql } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { media, postMedia, siteSettings } from "@/db/schema";
import { deleteMediaFile } from "@/lib/media-storage";

// Candidates only; each one is looked up in the media table.
const MEDIA_URL = /\/media\/([a-z0-9.-]+)/g;

/**
 * Records which images a post uses, from its body and feature image.
 * Returns the ones it used before but no longer does.
 */
export async function syncPostMedia(
  tx: Transaction,
  postId: number,
  post: { body: string; featureImageId: number | null },
) {
  const filenames = [...new Set(Array.from(post.body.matchAll(MEDIA_URL), (match) => match[1]))];
  const inBody = filenames.length
    ? await tx.select({ id: media.id }).from(media).where(inArray(media.filename, filenames))
    : [];
  const usedIds = new Set(inBody.map(({ id }) => id));
  if (post.featureImageId) usedIds.add(post.featureImageId);
  const used = [...usedIds];

  const dropped = await tx
    .delete(postMedia)
    .where(
      and(
        eq(postMedia.postId, postId),
        used.length ? notInArray(postMedia.mediaId, used) : undefined,
      ),
    )
    .returning({ id: postMedia.mediaId });
  if (used.length) {
    await tx
      .insert(postMedia)
      .values(used.map((mediaId) => ({ postId, mediaId })))
      .onConflictDoNothing();
  }
  return dropped.map(({ id }) => id);
}

/**
 * Deletes images that no post uses and that aren't the intro photo: `dropped`
 * ones right away, and any other unused upload once it's a day old. Until then
 * it may be in an editor or the settings form, not saved yet.
 */
export async function deleteUnusedMedia(dropped: number[]) {
  const deleted = await db
    .delete(media)
    .where(
      and(
        notExists(db.select().from(postMedia).where(eq(postMedia.mediaId, media.id))),
        notExists(
          db.select().from(siteSettings).where(eq(siteSettings.introPhotoId, media.id)),
        ),
        or(
          dropped.length ? inArray(media.id, dropped) : undefined,
          lt(media.createdAt, sql`now() - interval '1 day'`),
        ),
      ),
    )
    .returning({ filename: media.filename });
  await Promise.all(deleted.map(({ filename }) => deleteMediaFile(filename)));
}
