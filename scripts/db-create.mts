// Creates the database DATABASE_URL names: `pnpm db:create`. Runs again safely: a
// database that's already there is left as it is.

import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const DUPLICATE_DATABASE = "42P04";

const url = new URL(process.env.DATABASE_URL!);
const name = decodeURIComponent(url.pathname.slice(1));
// The server's default database, since the one to create isn't there yet.
url.pathname = "/postgres";

const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  await client.query(`create database ${client.escapeIdentifier(name)}`);
  console.log(`Created the database "${name}".`);
} catch (e) {
  if (!(e instanceof pg.DatabaseError && e.code === DUPLICATE_DATABASE)) throw e;
  console.log(`The database "${name}" is already there.`);
} finally {
  await client.end();
}
