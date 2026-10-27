import "server-only";
import { and, eq, inArray, lt, notExists, notInArray, or, sql } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { media, postMedia, postRevisions, siteSettings } from "@/db/schema";
import { deleteMediaFile } from "@/lib/media-storage";

// Candidates only; each one is looked up in the media table.
const MEDIA_URL = /\/media\/([a-z0-9.-]+)/g;

type Version = { body: string; featureImageId: number | null };

/**
 * Records which images a post uses, from its body and feature image, and from the
 * earlier versions in its history, so restoring one finds its images. Returns the
 * ones it used before but no longer does.
 */
export async function syncPostMedia(tx: Transaction, postId: number, post: Version) {
  const versions: Version[] = [
    post,
    ...(await tx
      .select({ body: postRevisions.body, featureImageId: postRevisions.featureImageId })
      .from(postRevisions)
      .where(eq(postRevisions.postId, postId))),
  ];
  const filenames = [
    ...new Set(
      versions.flatMap(({ body }) => Array.from(body.matchAll(MEDIA_URL), (match) => match[1])),
    ),
  ];
  const inBodies = filenames.length
    ? await tx.select({ id: media.id }).from(media).where(inArray(media.filename, filenames))
    : [];
  const usedIds = new Set(inBodies.map(({ id }) => id));
  for (const { featureImageId } of versions) if (featureImageId) usedIds.add(featureImageId);
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
