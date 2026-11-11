/**
 * Public database boundary, checked with the signed-out public key.
 * Skipped without a Supabase project (tests/live-env.ts).
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { key, live, url } from "./live-env";

const db = () => createClient(url!, key!, { auth: { persistSession: false } });
const local = !!url && /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url);

/** Rows matching a filter, counted by the database. */
const countQuery = (table: string) => db().from(table).select("*", { count: "exact", head: true });
async function count(table: string, filter: (query: ReturnType<typeof countQuery>) => ReturnType<typeof countQuery> = (q) => q) {
  const { count: n, error } = await filter(countQuery(table));
  expect(error).toBeNull();
  return n;
}

describe.skipIf(!live)("live planting lines keep their provenance", { timeout: 60_000 }, () => {
  it("has all 5,449 workbook lines", async () => {
    expect(await count("planting_lines", (q) => q.not("legacy_code", "is", null))).toBe(5449);
  });

  it.each(["legacy_code", "source_file", "source_sheet", "source_cell"])("no line is missing %s", async (column) => {
    expect(await count("planting_lines", (q) => q.is(column, null))).toBe(0);
  });
});

const TABLES: [table: string, column: string, value: string | number, update: Record<string, unknown>][] = [
  ["species", "slug", "no-such-row", { deactivated_at: null }],
  ["sites", "slug", "no-such-row", { deactivated_at: null }],
  ["areas", "slug", "no-such-row", { deactivated_at: null }],
  ["planting_events", "id", -1, { deactivated_at: null }],
  ["planting_lines", "id", -1, { deactivated_at: null }],
  ["seasons", "id", -1, { label: "permission check" }],
  ["questions", "slug", "no-such-row", { deactivated_at: null }],
  ["notes", "id", -1, { deactivated_at: null }],
];

describe.skipIf(!live)("public database access", { timeout: 60_000 }, () => {
  it.each(TABLES)("can read, but cannot write, %s", async (table, column, value, update) => {
    const client = db();
    expect((await client.from(table).select(column).limit(1)).error, "select").toBeNull();
    expect((await client.from(table).insert({})).error?.code, "insert").toBe("42501");
    expect((await client.from(table).update(update).eq(column, value)).error?.code, "update").toBe("42501");
    expect((await client.from(table).delete().eq(column, value)).error?.code, "delete").toBe("42501");
  });

  it("does not expose approved staff profiles", async () => {
    const { error } = await db().from("users").select("id").limit(1);
    expect(error?.code).toBe("42501");
  });

  it.skipIf(!local)("rejects direct Auth signup for an unapproved address", async () => {
    const { error } = await db().auth.signInWithOtp({
      email: "not-approved@example.invalid",
      options: { shouldCreateUser: true },
    });
    expect(error?.status).toBe(403);
  });
});
