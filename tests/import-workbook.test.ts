import { afterEach, expect, it, vi } from "vitest";
import { isDeepStrictEqual } from "node:util";
import profiles from "@/data/species-profiles.json";
import photos from "@/data/species-photos.json";
import { DEFAULT_DATA_DIR, loadFromDirectory } from "@/lib/wrt/csv/csv-repository";

// Run the real CLI against an in-memory Supabase client; never use a database key.
const workbook = loadFromDirectory(DEFAULT_DATA_DIR);
type Row = Record<string, unknown>;
const totals = workbook.reconciliation.filter((row) => row.kind === "season");
const tables = new Map<string, Row[]>([
  ["seasons", workbook.seasons.map((season, id) => ({ id, slug: season.slug, label: season.label }))],
  ["totals_by_season", totals.map((row) => ({ season_label: row.label, plants: row.stated }))],
]);
const writes: string[] = [];

const client = {
  from(table: string) {
    let action = "select", values: Row[] = [], conflict = "slug";
    let start = 0, end = Infinity;
    const filters: ((row: Row) => boolean)[] = [];
    const query = {
      select: () => query,
      order: () => query,
      range: (from: number, to: number) => { start = from; end = to; return query; },
      eq: (key: string, value: unknown) => { filters.push((row) => row[key] === value); return query; },
      in: (key: string, items: unknown[]) => { filters.push((row) => items.includes(row[key])); return query; },
      insert: (rows: Row[]) => { action = "insert"; values = rows; return query; },
      upsert: (rows: Row[], options: { onConflict: string }) => { action = "upsert"; values = rows; conflict = options.onConflict; return query; },
      update: (row: Row) => { action = "update"; values = [row]; return query; },
      delete: () => { action = "delete"; return query; },
      then(resolve: (result: { data: Row[]; error: null }) => unknown) {
        let rows = tables.get(table) ?? [];
        if (action !== "select") {
          writes.push(table);
          if (action === "insert" || action === "upsert") for (const value of values) {
            const existing = action === "upsert" ? rows.find((row) => row[conflict] === value[conflict]) : undefined;
            if (existing) Object.assign(existing, structuredClone(value));
            else rows.push({ id: rows.length + 1, created_by: null, resolved_at: null, ...structuredClone(value) });
          }
          if (action === "update") for (const row of rows.filter((row) => filters.every((filter) => filter(row)))) Object.assign(row, values[0]);
          if (action === "delete") rows = rows.filter((row) => !filters.every((filter) => filter(row)));
          tables.set(table, rows);
        }
        return Promise.resolve(resolve({ data: rows.filter((row) => filters.every((filter) => filter(row))).slice(start, end + 1), error: null }));
      },
    };
    return query;
  },
};

async function run(write: boolean) {
  vi.resetModules();
  vi.doMock("@supabase/supabase-js", () => ({ createClient: () => client }));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only");
  const argv = process.argv;
  process.argv = write ? [...argv, "--write"] : argv.filter((arg) => arg !== "--write");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  try {
    await import("../scripts/import-workbook");
    await vi.waitFor(() => expect(log.mock.calls.some(([message]) => String(message).includes(write ? "seasons match the workbook" : "(CSV:")) || error.mock.calls.length > 0).toBe(true));
    expect(error.mock.calls).toEqual([]);
    return log.mock.calls.map(([message]) => String(message));
  } finally {
    process.argv = argv;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  }
}

afterEach(() => vi.doUnmock("@supabase/supabase-js"));

it("imports profiles and ordered photos, reports changes without writing, and is idempotent for JSONB key ordering", async () => {
  await run(false);
  expect(writes).toEqual([]);
  await run(true);
  const species = tables.get("species")!;
  expect(species).toHaveLength(workbook.species.length);
  for (const row of species) {
    expect(row.profile).toEqual(profiles.find((profile) => profile.speciesId === row.register_code) ?? {});
    expect(row.photos).toEqual(photos.filter((photo) => photo.speciesId === row.register_code).map((photo) => ({ src: photo.src, attribution: `${photo.author} · ${photo.license}` })));
  }
  // JSONB does not retain object key order. Equal content must not trigger writes.
  for (const row of species) row.profile = Object.fromEntries(Object.entries(row.profile as Row).reverse());
  writes.length = 0;
  await run(true);
  expect(writes).toEqual([]);

  const researched = species.find((row) => !isDeepStrictEqual(row.profile, {}))!;
  researched.profile = {};
  researched.photos = [];
  const report = await run(false);
  expect(report.some((line) => /species\s+\+0 new, 1 changed/.test(line))).toBe(true);
  expect(writes).toEqual([]);
  await run(true);
  expect(writes).toEqual(["species"]);
});
