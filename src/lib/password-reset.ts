import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { sendMail } from "@/lib/mail";
import { absoluteUrl, getSiteSettings } from "@/lib/site";

// A reset link is /admin/reset-password?token=<token>. The database keeps only the
// token's SHA-256, like sessions, so a leaked table can't be used to reset anything.
const LINK_MINUTES = 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Emails a reset link to the account with this email, if there is one. Callers
 * answer the same way whether there is or not, and run this after responding, so
 * neither the answer nor its timing tells anyone which emails have accounts.
 */
export async function sendResetLink(email: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  await db.delete(passwordResets).where(lte(passwordResets.expiresAt, sql`now()`));
  await db.insert(passwordResets).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: sql`now() + make_interval(mins => ${LINK_MINUTES})`,
  });

  // The link's address comes from SITE_URL, never from the request, so a forged
  // Host header can't point it at someone else's site.
  const link = absoluteUrl(`/admin/reset-password?token=${token}`);
  const { title } = await getSiteSettings();
  await sendMail({ to: user.email, ...resetEmail(title, link) });
}

function resetEmail(title: string, link: string) {
  const subject = `Reset your password for ${title}`;
  const text = [
    `Someone, hopefully you, asked to reset the password for your account on ${title}.`,
    "",
    "Choose a new password here:",
    link,
    "",
    `The link works once, for the next ${LINK_MINUTES} minutes. If you didn’t ask for it, you can ignore this email: your password stays the same.`,
  ].join("\n");
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a">
    <p>Someone, hopefully you, asked to reset the password for your account on ${escapeHtml(title)}.</p>
    <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:6px;background:#1a1a1a;color:#ffffff;text-decoration:none">Choose a new password</a></p>
    <p style="color:#666666;font-size:14px">The link works once, for the next ${LINK_MINUTES} minutes. If you didn’t ask for it, you can ignore this email: your password stays the same.</p>
  </body>
</html>`;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** The email of the account a reset link is for, or null if it's unknown, used or expired. */
export async function resetLinkEmail(token: string) {
  const [row] = await db
    .select({ email: users.email })
    .from(passwordResets)
    .innerJoin(users, eq(users.id, passwordResets.userId))
    .where(and(eq(passwordResets.id, hashToken(token)), gt(passwordResets.expiresAt, sql`now()`)))
    .limit(1);
  return row?.email ?? null;
}

/**
 * Sets a new password with a reset link, if it's still good, and uses the link up.
 * Every session on the account ends, since whoever asked for the reset may not
 * trust them. Returns the account, or null if the link no longer works.
 */
export async function resetPassword(token: string, passwordHash: string) {
  return db.transaction(async (tx) => {
    const [link] = await tx
      .delete(passwordResets)
      .where(and(eq(passwordResets.id, hashToken(token)), gt(passwordResets.expiresAt, sql`now()`)))
      .returning({ userId: passwordResets.userId });
    if (!link) return null;

    const [user] = await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, link.userId))
      .returning({ id: users.id, email: users.email });
    // Other links for the account stop working too, and so does every session.
    await tx.delete(passwordResets).where(eq(passwordResets.userId, user.id));
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    return user;
  });
}
