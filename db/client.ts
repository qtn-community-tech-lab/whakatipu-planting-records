/**
 * Server-side database connection. Connects as the database owner, so access
 * rules (RLS) do not apply here: check the signed-in user before writing.
 * The browser uses supabase-js instead, where access rules do apply.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { prepare: false }); // prepare: false for Supabase's pooled connections
  return { db: drizzle(client, { schema, casing: "snake_case" }), close: () => client.end() };
}

export type Db = ReturnType<typeof createDb>["db"];
