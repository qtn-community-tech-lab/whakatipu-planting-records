/**
 * What the live database promises, checked as a signed-out visitor with the committed public key:
 * every planting line says which workbook cell it came from, and the public key can read but never write.
 * Skipped without a project (tests/live-env.ts).
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { key, live, url } from "./live-env";

const db = () => createClient(url!, key!, { auth: { persistSession: false } });

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

// Each table's key, and a value no real row has, so a write that was wrongly allowed would still touch nothing.
// The update sets a plain column: setting an identity id is refused for a different reason (428C9).
const TABLES: [table: string, column: string, none: string | number][] = [
  ["sites", "slug", "no-such-row"], ["areas", "slug", "no-such-row"], ["species", "slug", "no-such-row"],
  ["questions", "slug", "no-such-row"], ["seasons", "id", -1], ["planting_events", "id", -1],
  ["planting_lines", "id", -1], ["notes", "id", -1],
];

describe.skipIf(!live)("the public key is read-only", { timeout: 60_000 }, () => {
  it.each(TABLES)("cannot add to, change or delete from %s", async (table, column, none) => {
    const c = db();
    expect((await c.from(table).insert({})).error?.code, "insert").toBe("42501");
    const change = table === "seasons" ? { label: "x" } : { deactivated_at: null };
    expect((await c.from(table).update(change).eq(column, none)).error?.code, "update").toBe("42501");
    expect((await c.from(table).delete().eq(column, none)).error?.code, "delete").toBe("42501");
  });

  it("cannot read the users table", async () => {
    const { data, error } = await db().from("users").select("id").limit(1);
    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });
});
