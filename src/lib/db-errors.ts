import { DrizzleQueryError } from "drizzle-orm";
import { DatabaseError } from "pg";

const UNIQUE_VIOLATION = "23505";

/** The unique constraint or index a failed query broke, or undefined for any other error. */
export function uniqueViolation(e: unknown) {
  return e instanceof DrizzleQueryError &&
    e.cause instanceof DatabaseError &&
    e.cause.code === UNIQUE_VIOLATION
    ? e.cause.constraint
    : undefined;
}
