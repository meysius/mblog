import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Whether a secret someone sent matches the real one. Compares hashes so it takes
 * the same time whatever the two have in common, or their lengths.
 */
export function sameSecret(given: string, expected: string) {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(given), hash(expected));
}
