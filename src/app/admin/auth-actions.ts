"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession, hasUsers } from "@/lib/auth";
import {
  blockedUntil,
  clearFailures,
  clientAddress,
  oneAtATime,
  recordFailure,
} from "@/lib/login-limits";
import { hashPassword, verifyPassword } from "@/lib/password";

export type SignInState = {
  error?: string;
  values?: { email: string };
};

export type SetupState = {
  errors?: { name?: string; email?: string; password?: string };
  values?: { name: string; email: string };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;

// Unknown emails are checked against this throwaway hash, so they take as long
// as wrong passwords and don't reveal which emails have accounts.
let unknownUserHash: Promise<string> | undefined;

function tooManyFailures(retryAt: Date) {
  const minutes = Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 60_000));
  return `Too many failed sign-ins. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const address = await clientAddress();

  const attempt = await oneAtATime(async (): Promise<{ userId: number } | { error: string }> => {
    // Refused before the password is checked, so a blocked attempt costs nothing.
    const retryAt = await blockedUntil(address, email);
    if (retryAt) return { error: tooManyFailures(retryAt) };

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    unknownUserHash ??= hashPassword("");
    const valid = await verifyPassword(password, user?.passwordHash ?? (await unknownUserHash));

    if (!user || !valid) {
      await recordFailure(address, email);
      return { error: "That email and password don’t match." };
    }
    await clearFailures(address, email);
    return { userId: user.id };
  });
  if ("error" in attempt) return { error: attempt.error, values: { email } };

  await createSession(attempt.userId);
  redirect("/admin");
}

export async function setUp(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  };
  const password = String(formData.get("password") ?? "");

  const errors: NonNullable<SetupState["errors"]> = {};
  if (!values.name) errors.name = "Add your name.";
  if (!EMAIL_PATTERN.test(values.email)) errors.email = "Enter an email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (Object.keys(errors).length > 0) return { errors, values };
  // Once there's an owner, stop before spending time and memory on hashing.
  if (await hasUsers()) redirect("/admin/login");

  const passwordHash = await hashPassword(password);
  // The lock stops two setup submissions from both creating an owner.
  const userId = await db.transaction(async (tx) => {
    await tx.execute(sql`lock table ${users} in exclusive mode`);
    const [existing] = await tx.select({ id: users.id }).from(users).limit(1);
    if (existing) return null;
    const [user] = await tx
      .insert(users)
      .values({ ...values, passwordHash })
      .returning({ id: users.id });
    return user.id;
  });
  if (userId === null) redirect("/admin/login");

  await createSession(userId);
  redirect("/admin");
}

export async function signOut() {
  await deleteSession();
  redirect("/admin/login");
}
