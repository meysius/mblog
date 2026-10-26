import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(process.env.DATABASE_URL!);

/** The `tx` a transaction callback receives, for helpers that run inside one. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
