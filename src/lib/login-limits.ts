import "server-only";
import { isIPv6 } from "node:net";
import { and, gt, inArray, lte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { loginLimits } from "@/db/schema";

// Attempts allowed in a window that starts with the first one; past that,
// attempts are refused until the window ends. Sign-ins count failures. Requests
// for a password reset link count every request, since each one sends an email.
// The email limits add up attempts from every address, so spreading them over
// many addresses doesn't get around them. That also means someone can block new
// sign-ins to an account for up to an hour, but sessions that are already signed
// in keep working.
const LIMITS = {
  signIn: { address: { attempts: 10, minutes: 15 }, email: { attempts: 100, minutes: 60 } },
  passwordReset: { address: { attempts: 10, minutes: 60 }, email: { attempts: 3, minutes: 60 } },
} as const;

export type LimitedAction = keyof typeof LIMITS;
type Kind = "address" | "email";

// Sign-ins keep the keys they had before resets were limited too.
const PREFIX: Record<LimitedAction, string> = { signIn: "", passwordReset: "reset-" };

function keysFor(action: LimitedAction, address: string, email: string): Record<Kind, string> {
  return { address: `${PREFIX[action]}address:${address}`, email: `${PREFIX[action]}email:${email}` };
}

/**
 * The visitor's address, from the X-Forwarded-For header set by the reverse proxy
 * in front of the app. Its last entry is the address the proxy saw. Next.js fills
 * the header in when there's no proxy, but keeps one that a client sends itself.
 */
export async function clientAddress() {
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  return addressGroup(forwarded.split(",").at(-1)?.trim() ?? "");
}

// Someone with one IPv6 address can usually pick any address in its /64, so all
// of those count as one.
function addressGroup(address: string) {
  const plain = address.replace(/%.*$/, "").replace(/^::ffff:(?=\d+\.)/i, "");
  if (!isIPv6(plain)) return plain || "unknown";

  const groups = (part: string) => (part ? part.split(":") : []);
  const [head, tail] = plain.split("::");
  const full =
    tail === undefined
      ? groups(head)
      : [
          ...groups(head),
          ...Array<string>(8 - groups(head).length - groups(tail).length).fill("0"),
          ...groups(tail),
        ];
  return `${full
    .slice(0, 4)
    .map((group) => parseInt(group, 16).toString(16))
    .join(":")}::/64`;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs sign-in attempts one at a time. Each password check takes 128 MB for
 * scrypt, so a burst of attempts can't use gigabytes, and every attempt sees the
 * failures recorded by the ones before it.
 */
export function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

/** When the address and the email may each try again, for whichever is blocked. */
export async function blocked(address: string, email: string, action: LimitedAction = "signIn") {
  const keys = keysFor(action, address, email);
  const rows = await db
    .select()
    .from(loginLimits)
    .where(
      and(
        inArray(loginLimits.key, [keys.address, keys.email]),
        gt(loginLimits.resetsAt, sql`now()`),
      ),
    );
  const result: Partial<Record<Kind, Date>> = {};
  for (const row of rows) {
    const kind = row.key === keys.address ? "address" : "email";
    if (row.failures >= LIMITS[action][kind].attempts) result[kind] = row.resetsAt;
  }
  return result;
}

/** When this address and email may try to sign in again, or null if neither is blocked. */
export async function blockedUntil(address: string, email: string) {
  const dates = Object.values(await blocked(address, email));
  return dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}

async function record(action: LimitedAction, address: string, email: string) {
  const keys = keysFor(action, address, email);
  // Windows that have ended start over, so their rows can go.
  await db.delete(loginLimits).where(lte(loginLimits.resetsAt, sql`now()`));

  for (const kind of ["address", "email"] as const) {
    const { attempts, minutes } = LIMITS[action][kind];
    const [row] = await db
      .insert(loginLimits)
      .values({
        key: keys[kind],
        failures: 1,
        resetsAt: sql`now() + make_interval(mins => ${minutes})`,
      })
      .onConflictDoUpdate({
        target: loginLimits.key,
        set: { failures: sql`${loginLimits.failures} + 1` },
      })
      .returning({ failures: loginLimits.failures });
    if (row.failures === attempts) {
      const what = action === "signIn" ? "Sign-ins" : "Password reset requests";
      console.warn(
        `${what} blocked for up to ${minutes} minutes after ${attempts} attempts: ${JSON.stringify(keys[kind])}`,
      );
    }
  }
}

/** Counts a failed sign-in against both the address and the email. */
export function recordFailure(address: string, email: string) {
  return record("signIn", address, email);
}

/** Counts a request for a password reset link against both the address and the email. */
export function recordResetRequest(address: string, email: string) {
  return record("passwordReset", address, email);
}

/** Forgets the address's and the email's failed sign-ins, after a successful one. */
export async function clearFailures(address: string, email: string) {
  const keys = keysFor("signIn", address, email);
  await db.delete(loginLimits).where(inArray(loginLimits.key, [keys.address, keys.email]));
}
