// Applies the migrations in drizzle/ to DATABASE_URL, as `pnpm db:migrate` does,
// for production: a release has no drizzle-kit, so the deploy workflow bundles
// this file and its packages into the release's migrate.cjs. Both record what
// they've applied in the same table, so either can take over from the other.
//
//   node migrate.cjs <migrations folder>

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const UNDEFINED_TABLE = "42P01";

// No top-level await: the bundle is CommonJS, since pg is.
async function main() {
  const migrationsFolder = process.argv[2] ?? "drizzle";
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const before = await appliedCount(pool);
    await migrate(drizzle(pool), { migrationsFolder });
    const applied = (await appliedCount(pool)) - before;
    console.log(applied > 0 ? `Applied ${applied} migration(s).` : "No migrations to apply.");
  } finally {
    await pool.end();
  }
}

async function appliedCount(pool: pg.Pool) {
  try {
    const { rows } = await pool.query("select count(*)::int as n from drizzle.__drizzle_migrations");
    return rows[0].n as number;
  } catch (e) {
    // Neither the table nor its schema is there before the first migration.
    if (e instanceof pg.DatabaseError && e.code === UNDEFINED_TABLE) return 0;
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
