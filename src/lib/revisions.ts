import "server-only";
import { and, desc, eq, gt, notInArray, sql } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { media, postRevisions, posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { PostKind } from "@/lib/post-kind";
import { countWordsIn, featureImageColumns, toMediaImage } from "@/lib/posts";

// A post's history: each save keeps the version it replaces. Autosaves keep one at
// most every ten minutes, so writing for an hour leaves six or so rather than
// hundreds, and each post keeps its latest fifty.

const AUTOSAVE_INTERVAL = sql`interval '10 minutes'`;
const KEPT_PER_POST = 50;

/** What a version holds: the content the editor writes, not the post's settings. */
export type RevisionContent = {
  title: string;
  excerpt: string;
  body: string;
  featureImageId: number | null;
  featureImageAlt: string;
};

const sameContent = (a: RevisionContent, b: RevisionContent) =>
  a.title === b.title &&
  a.excerpt === b.excerpt &&
  a.body === b.body &&
  a.featureImageId === b.featureImageId &&
  a.featureImageAlt === b.featureImageAlt;

/**
 * Before a save, keeps the content it's about to replace, unless that content
 * isn't changing, or this is an autosave and one was kept recently. Returns false
 * when there's no such post or page.
 */
export async function keepRevision(
  tx: Transaction,
  kind: PostKind,
  postId: number,
  next: RevisionContent,
  { autosave }: { autosave: boolean },
) {
  const [current] = await tx
    .select({
      title: posts.title,
      excerpt: posts.excerpt,
      body: posts.body,
      featureImageId: posts.featureImageId,
      featureImageAlt: posts.featureImageAlt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.kind, kind)))
    // Saves of one post queue here, so each sees the version the last one left.
    .for("update");
  if (!current) return false;
  if (sameContent(current, next)) return true;

  if (autosave) {
    const [recent] = await tx
      .select({ id: postRevisions.id })
      .from(postRevisions)
      .where(
        and(
          eq(postRevisions.postId, postId),
          gt(postRevisions.createdAt, sql`now() - ${AUTOSAVE_INTERVAL}`),
        ),
      )
      .limit(1);
    if (recent) return true;
  }

  const { updatedAt, ...content } = current;
  await tx.insert(postRevisions).values({ postId, ...content, savedAt: updatedAt });
  await tx
    .delete(postRevisions)
    .where(
      and(
        eq(postRevisions.postId, postId),
        notInArray(
          postRevisions.id,
          tx
            .select({ id: postRevisions.id })
            .from(postRevisions)
            .where(eq(postRevisions.postId, postId))
            .orderBy(desc(postRevisions.createdAt), desc(postRevisions.id))
            .limit(KEPT_PER_POST),
        ),
      ),
    );
  return true;
}

// Admin reads are never cached, and check the session themselves.

/** A post's earlier versions, newest first, for its history. */
export async function getRevisions(postId: number) {
  await requireUser();
  return db
    .select({
      id: postRevisions.id,
      title: postRevisions.title,
      savedAt: postRevisions.savedAt,
      wordCount: countWordsIn(postRevisions.body),
    })
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.createdAt), desc(postRevisions.id));
}

export type RevisionSummary = Awaited<ReturnType<typeof getRevisions>>[number];

/** One earlier version's content, for previewing and restoring it. */
export async function getRevision(id: number) {
  await requireUser();
  const [revision] = await db
    .select({
      title: postRevisions.title,
      excerpt: postRevisions.excerpt,
      body: postRevisions.body,
      featureImage: featureImageColumns,
      featureImageAlt: postRevisions.featureImageAlt,
    })
    .from(postRevisions)
    .leftJoin(media, eq(media.id, postRevisions.featureImageId))
    .where(eq(postRevisions.id, id))
    .limit(1);
  return revision ? { ...revision, featureImage: toMediaImage(revision.featureImage) } : null;
}
