import "server-only";
import { isIPv6 } from "node:net";
import { and, gt, inArray, lte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { loginLimits } from "@/db/schema";

// Failed sign-ins allowed in a window that starts with the first failure; past
// that, attempts are refused until the window ends. The email limit adds up
// failures from every address, so spreading attempts over many addresses doesn't
// get around it. That also means someone can block new sign-ins to an account for
// up to an hour, but sessions that are already signed in keep working.
const LIMITS = {
  address: { failures: 10, minutes: 15 },
  email: { failures: 100, minutes: 60 },
} as const;

type Kind = keyof typeof LIMITS;

function keysFor(address: string, email: string): Record<Kind, string> {
  return { address: `address:${address}`, email: `email:${email}` };
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

/** When this address and email may try again, or null if neither is blocked. */
export async function blockedUntil(address: string, email: string) {
  const keys = keysFor(address, email);
  const rows = await db
    .select()
    .from(loginLimits)
    .where(
      and(
        inArray(loginLimits.key, [keys.address, keys.email]),
        gt(loginLimits.resetsAt, sql`now()`),
      ),
    );
  const blocked = rows.filter(
    (row) => row.failures >= LIMITS[row.key === keys.address ? "address" : "email"].failures,
  );
  return blocked.length > 0
    ? new Date(Math.max(...blocked.map((row) => row.resetsAt.getTime())))
    : null;
}

/** Counts a failed sign-in against both the address and the email. */
export async function recordFailure(address: string, email: string) {
  const keys = keysFor(address, email);
  // Windows that have ended start over, so their rows can go.
  await db.delete(loginLimits).where(lte(loginLimits.resetsAt, sql`now()`));

  for (const kind of ["address", "email"] as const) {
    const { failures, minutes } = LIMITS[kind];
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
    if (row.failures === failures) {
      console.warn(
        `Sign-ins blocked for up to ${minutes} minutes after ${failures} failures: ${JSON.stringify(keys[kind])}`,
      );
    }
  }
}

/** Forgets the address's and the email's failures, after a successful sign-in. */
export async function clearFailures(address: string, email: string) {
  const keys = keysFor(address, email);
  await db.delete(loginLimits).where(inArray(loginLimits.key, [keys.address, keys.email]));
}
