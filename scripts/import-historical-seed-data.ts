/**
 * Import historical JSON seeds and review question definitions using the Supabase client.
 * npm run import-historical-seed-data            # read-only preview
 * npm run import-historical-seed-data -- --write  # insert missing rows
 * Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../db/database.types";
import { readPlaceSeeds } from "./workbook/places";
import { readSeasonSeeds } from "./workbook/seasons";
import { readSpeciesSeed } from "./species/seed";
import { readHistorySeeds } from "./workbook/history";
import { REVIEW_THEMES } from "../lib/wrt/review-themes";

type Row = Record<string, Json>;
const write = process.argv.includes("--write");
const { sites, areas } = readPlaceSeeds();
const seasons = readSeasonSeeds([]);
const species = readSpeciesSeed();
const questions = Object.entries(REVIEW_THEMES).map(([slug, theme]) => ({ slug, question: `${theme.label}: ${theme.question}` }));
const plantings = readHistorySeeds({ areas, seasons, species, questions });

async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });
  function check<T>(result: { data: T; error: { message: string } | null }, context: string) {
    if (result.error) throw new Error(`${context}: ${result.error.message}. Earlier batches may have completed; rerunning is safe.`);
    return result.data;
  }
  const report: [string, number][] = [];
  /** Match stable identities, let PostgreSQL assign IDs, and return IDs for child rows. */
  async function sync(table: keyof Database["public"]["Tables"], rows: Row[], identity: (row: Row) => string, primaryKey = "slug") {
    if (!rows.length) return [];
    const columns = [...new Set([...Object.keys(rows[0]!), primaryKey])].join(", ");
    const current: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const page = check(await db.from(table).select(columns).order(primaryKey).range(from, from + 999), `read ${table}`) as unknown as Row[];
      current.push(...page);
      if (page.length < 1000) break;
    }
    const have = new Map(current.map((row) => [identity(row), row]));
    const added = rows.filter((row) => !have.has(identity(row)));
    report.push([table, added.length]);
    for (let i = 0; i < added.length; i += 500) {
      const batch = added.slice(i, i + 500);
      const inserted = write
        ? check(await db.from(table).insert(batch).select(columns), `insert ${table}`) as unknown as Row[]
        : batch.map((row, index) => ({ ...row, ...(primaryKey === "id" ? { id: -(i + index + 1) } : {}) }));
      for (const row of inserted) have.set(identity(row), row);
    }
    return rows.map((row) => {
      const saved = have.get(identity(row));
      if (!saved) throw new Error(`No saved ${table} identity for ${identity(row)}`);
      return saved;
    });
  }
  const slugKey = (row: Row) => String(row.slug);
  await sync("sites", sites, slugKey);
  await sync("areas", areas, slugKey);
  await sync("species", species, slugKey);
  await sync("questions", questions, slugKey);
  const savedSeasons = await sync("seasons", seasons, slugKey);
  const seasonIds = new Map(savedSeasons.map((row) => [row.slug, row.id]));
  const eventKey = (row: Row) => `${row.source}|${row.area}|${row.season}`;
  const eventRows = plantings.map(({ lines, season, ...event }) => {
    void lines;
    return { ...event, season: seasonIds.get(season)! };
  });
  const savedEvents = await sync("planting_events", eventRows, eventKey, "id");
  const eventIds = new Map(savedEvents.map((row) => [eventKey(row), row.id]));
  const lineRows = plantings.flatMap((planting, index) => planting.lines.map(({ notes, ...line }) => {
    void notes;
    return { ...line, planting_event: eventIds.get(eventKey(eventRows[index]!))! };
  }));
  const savedLines = await sync("planting_lines", lineRows, (row) => String(row.legacy_code), "id");
  const lineIds = new Map(savedLines.map((row) => [row.legacy_code, row.id]));
  const noteRows = plantings.flatMap((planting) => planting.lines.flatMap((line) => line.notes.map((note) => ({
    ...note, line: lineIds.get(line.legacy_code)!,
  }))));
  await sync("notes", noteRows, (row) => `${row.line}|${row.question}`, "id");

  console.log(write ? "Written:" : "Dry run, nothing written. Would change:");
  for (const [table, added] of report) console.log(`  ${table.padEnd(30)} +${added} new`);
  console.log(`  JSON: ${plantings.length} events, ${lineRows.length} lines, ${noteRows.length} notes`);
  if (write) {
    const totals = check(await db.from("totals_by_season").select("season_label, plants"), "read season totals") ?? [];
    const plantsOf = new Map(totals.map((row) => [row.season_label, Number(row.plants)]));
    const mismatches = seasons.filter((season) => season.workbook_total !== null && plantsOf.get(season.label) !== season.workbook_total);
    if (mismatches.length) throw new Error(`Season totals differ from the seed: ${mismatches.map((season) => season.label).join(", ")}. Earlier writes remain; check the seed and existing database records.`);
    console.log("All saved season totals match. PostgreSQL generated the event, line and note IDs.");
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
