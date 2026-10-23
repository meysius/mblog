import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const SESSION_DAYS = 30;

// The cookie holds a random token and the database only its hash.
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Signs the user in on this browser. Call from a Server Action. */
export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.delete(sessions).where(lte(sessions.expiresAt, sql`now()`));
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Signs this browser out. Call from a Server Action. */
export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  cookieStore.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Looked up once per render. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  return user ?? null;
});

/**
 * The signed-in user; anyone else is sent to the login page. Every admin read
 * and Server Action calls this, so the proxy's cookie check is only a shortcut.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** False until someone completes /admin/setup. */
export async function hasUsers() {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  return Boolean(user);
}
