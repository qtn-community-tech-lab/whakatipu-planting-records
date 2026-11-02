/**
 * Import the workbook history (docs/planning/prototype/*.csv) into Supabase.
 *
 *   npx tsx scripts/import-workbook.ts           # dry run: shows what would change, writes nothing
 *   npx tsx scripts/import-workbook.ts --write   # makes the changes, then checks the totals
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. The secret key
 * passes the access rules, so keep it out of the app and out of git.
 *
 * Safe to run again: rows match on slug, or spreadsheet code for lines, and only
 * differences are written. It never touches descriptions, pins, profiles, photos or
 * rulings, keeps notes a person wrote, and retires lines that leave the CSV.
 */
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_DATA_DIR, loadFromDirectory } from "../lib/wrt/csv/csv-repository";
import { REVIEW_THEMES } from "../lib/wrt/review-themes";
import { slugify } from "../lib/wrt/text";
import type { ReviewNoteKind } from "../lib/wrt/types";

type Row = Record<string, string | number | boolean | null>;
const write = process.argv.includes("--write");

// ------------------------------------------------------------------ 1. what the CSVs say
const data = loadFromDirectory(process.env.WRT_DATA_DIR || DEFAULT_DATA_DIR);

const sites: Row[] = data.places.map((p) => ({ slug: p.slug, name: p.name, is_scheme: p.isScheme }));

// Area slugs are unique across sites: the area name, else site-area, else numbered.
const areaOf = new Map<string, string>();
const usedAreaSlugs = new Set<string>();
const areas: Row[] = [];
for (const place of data.places) {
  for (const parcel of place.parcels) {
    const base = slugify(parcel.name) || "area";
    let slug = usedAreaSlugs.has(base) ? `${place.slug}-${base}` : base;
    for (let n = 2; usedAreaSlugs.has(slug); n++) slug = `${place.slug}-${base}-${n}`;
    usedAreaSlugs.add(slug);
    areaOf.set(`${place.slug}|${parcel.id}`, slug);
    areas.push({
      slug, site: place.slug, name: parcel.name,
      // "unnumbered-…" and provisional "NEW-…" ids are not WRT numbers.
      wrt_number: /^(unnumbered-|NEW-)/.test(parcel.id) ? null : parcel.id,
      class: parcel.siteClass === "unknown" ? null : parcel.siteClass,
    });
  }
}

// Contested groups: species linked by contested_with, named by WRT's code ("C3") from the register note.
const byId = new Map(data.species.map((s) => [s.id, s]));
const groupOf = new Map<string, string>();
for (const s of data.species) {
  if (!s.contestedWith.length || groupOf.has(s.id)) continue;
  const members = new Set([s.id]);
  for (const id of members) for (const o of byId.get(id)?.contestedWith ?? []) members.add(o);
  const code = [...members].map((id) => byId.get(id)?.note?.match(/^(C\d+):/)?.[1]).find(Boolean);
  if (code) for (const id of members) groupOf.set(id, code);
}
const species: Row[] = data.species.map((s) => ({
  slug: s.slug, scientific_name: s.scientificName, suggested_spelling: s.suggestedSpelling,
  common_name: s.commonName, maori_name: s.maoriName, status: s.status === "unknown" ? null : s.status,
  over_5m: s.over5m, threatened: s.threatened, threatened_te_kakano: s.threatenedMarks.teKakano,
  contested_group: groupOf.get(s.id) ?? null, needs_decision: s.needsDecision,
  register_code: s.id, register_note: s.note,
}));

const questions: Row[] = Object.entries(REVIEW_THEMES).map(([slug, t]) => ({ slug, question: `${t.label}: ${t.question}` }));
const seasonTotals = data.reconciliation.filter((r) => r.kind === "season")
  .map((r) => ({ label: r.label, workbook_total: r.stated, workbook_cell: r.statedCell || null }));

// Lines, and one note per line per question (same-question notes merged, strongest kind kept).
const RANK: Record<ReviewNoteKind, number> = { ruling: 0, confirm: 1, fyi: 2 };
const lines = data.records.map((r) => ({
  legacy_code: r.id, area: areaOf.get(`${r.placeSlug}|${r.parcelId}`)!, season: r.seasonSlug,
  species: byId.get(r.speciesId)!.slug, quantity: r.hasQuantity ? r.quantity : null, // "TBC" is unknown, never 0
  source_cell: r.provenance.sourceCell,
}));
const notes = data.records.flatMap((r) => {
  const merged = new Map<string, { kind: ReviewNoteKind; text: string[] }>();
  for (const n of r.notes) {
    const m = merged.get(n.theme) ?? { kind: n.kind, text: [] };
    if (RANK[n.kind] < RANK[m.kind]) m.kind = n.kind;
    m.text.push(n.text);
    merged.set(n.theme, m);
  }
  return [...merged].map(([question, m]) => ({ legacy_code: r.id, question, kind: m.kind, text: m.text.join("\n") }));
});

const seen = new Map<string, string>();
for (const l of lines) {
  const key = `${l.area}|${l.season}|${l.species}`;
  if (seen.has(key)) throw new Error(`${l.legacy_code} and ${seen.get(key)} would be one line (same area, season, species)`);
  seen.set(key, l.legacy_code);
}

// ------------------------------------------------------------------ 2. what the database has
async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
    return res.data as T;
  }
  /** Every row of a table; Supabase returns at most 1,000 per request. */
  async function readAll<T = Row>(table: string, columns: string, orderBy: string): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      const page = check(await db.from(table).select(columns).order(orderBy).range(from, from + 999), `read ${table}`) as T[];
      out.push(...page);
      if (page.length < 1000) return out;
    }
  }
  async function inBatches<T>(rows: T[], fn: (batch: T[]) => PromiseLike<{ error: { message: string } | null }>, what: string) {
    for (let i = 0; i < rows.length; i += 500) check(await fn(rows.slice(i, i + 500)), what);
  }
  /** Rows that are new, or differ from the database in any column we own. */
  function diff(want: Row[], have: Row[], key = "slug") {
    const current = new Map(have.map((r) => [r[key], r]));
    const added = want.filter((r) => !current.has(r[key]));
    const changed = want.filter((r) => current.has(r[key]) && Object.keys(r).some((k) => (r[k] ?? null) !== (current.get(r[key])![k] ?? null)));
    return { added, changed, all: [...added, ...changed] };
  }

  const report: [string, number, number][] = [];
  async function sync(table: string, want: Row[]) {
    const have = await readAll(table, Object.keys(want[0]).join(", "), "slug");
    const d = diff(want, have);
    report.push([table, d.added.length, d.changed.length]);
    if (write) await inBatches(d.all, (b) => db.from(table).upsert(b, { onConflict: "slug" }), `write ${table}`);
  }

  await sync("sites", sites);
  await sync("areas", areas);
  await sync("species", species);
  await sync("questions", questions);

  const seasons = check(await db.from("seasons").select("id, slug, label, workbook_total, workbook_cell"), "read seasons") as Row[];
  const seasonId = new Map(seasons.map((s) => [s.slug as string, s.id as number]));
  const seasonChanges = seasonTotals.filter((t) => {
    const s = seasons.find((x) => x.label === t.label);
    if (!s) throw new Error(`season ${t.label} is not in the seasons table`);
    return s.workbook_total !== t.workbook_total || s.workbook_cell !== t.workbook_cell;
  });
  report.push(["seasons (totals)", 0, seasonChanges.length]);
  if (write) for (const t of seasonChanges) {
    check(await db.from("seasons").update({ workbook_total: t.workbook_total, workbook_cell: t.workbook_cell }).eq("label", t.label), "write seasons");
  }

  // Plantings: one "workbook" planting per area per season.
  const plantingKey = (area: unknown, season: unknown) => `${area}|${season}`;
  let plantings = await readAll<{ id: number; area: string; season: number; source: string }>("plantings", "id, area, season, source", "id")
    .then((rows) => rows.filter((p) => p.source === "workbook"));
  const wantPlantings = [...new Map(lines.map((l) => {
    const season = seasonId.get(l.season);
    if (season === undefined) throw new Error(`${l.legacy_code}: season ${l.season} is not in the seasons table`);
    return [plantingKey(l.area, season), { area: l.area, season, source: "workbook" }];
  })).values()];
  const havePlantings = new Set(plantings.map((p) => plantingKey(p.area, p.season)));
  const newPlantings = wantPlantings.filter((p) => !havePlantings.has(plantingKey(p.area, p.season)));
  report.push(["plantings", newPlantings.length, 0]);
  if (write && newPlantings.length) {
    await inBatches(newPlantings, (b) => db.from("plantings").insert(b), "write plantings");
    plantings = (await readAll<{ id: number; area: string; season: number; source: string }>("plantings", "id, area, season, source", "id"))
      .filter((p) => p.source === "workbook");
  }
  const plantingId = new Map(plantings.map((p) => [plantingKey(p.area, p.season), p.id]));

  // Lines, matched on their spreadsheet code. Unknown plantings only exist in a dry run.
  const haveLines = await readAll("planting_lines", "id, planting, species, quantity, legacy_code, source_cell, retired_at", "id")
    .then((rows) => rows.filter((l) => l.legacy_code !== null));
  const wantLines: Row[] = lines.map((l) => ({
    legacy_code: l.legacy_code, planting: plantingId.get(plantingKey(l.area, seasonId.get(l.season))) ?? -1,
    species: l.species, quantity: l.quantity, source_cell: l.source_cell, retired_at: null,
  }));
  const lineDiff = diff(wantLines, haveLines, "legacy_code");
  const codes = new Set(lines.map((l) => l.legacy_code));
  const toRetire = haveLines.filter((l) => l.retired_at === null && !codes.has(l.legacy_code as string));
  report.push(["planting_lines", lineDiff.added.length, lineDiff.changed.length], ["planting_lines (retired)", 0, toRetire.length]);
  if (write) {
    await inBatches(lineDiff.all, (b) => db.from("planting_lines").upsert(b, { onConflict: "legacy_code" }), "write planting_lines");
    await inBatches(toRetire.map((l) => l.id as number), (ids) =>
      db.from("planting_lines").update({ retired_at: new Date().toISOString() }).in("id", ids), "retire planting_lines");
  }

  // Notes: the import's own notes (no author, not resolved) follow the CSV; anything else is kept.
  const lineId = new Map((write
    ? await readAll("planting_lines", "id, legacy_code", "id").then((r) => r.filter((l) => l.legacy_code !== null))
    : haveLines).map((l) => [l.legacy_code as string, l.id as number]));
  const codeOf = new Map([...lineId].map(([code, id]) => [id, code]));
  const haveNotes = (await readAll("notes", "id, line, question, kind, text, created_by, resolved_at", "id"))
    .filter((n) => codeOf.has(n.line as number));
  const noteKey = (code: unknown, q: unknown) => `${code}|${q}`;
  const wantNotes = new Map(notes.map((n) => [noteKey(n.legacy_code, n.question), n]));
  const haveNoteKeys = new Set(haveNotes.map((n) => noteKey(codeOf.get(n.line as number), n.question)));
  const staleNotes = haveNotes.filter((n) => {
    const w = wantNotes.get(noteKey(codeOf.get(n.line as number), n.question));
    return n.created_by === null && n.resolved_at === null && (!w || w.kind !== n.kind || w.text !== n.text);
  });
  const isWanted = (n: Row) => wantNotes.has(noteKey(codeOf.get(n.line as number), n.question));
  const replaced = new Set(staleNotes.filter(isWanted).map((n) => noteKey(codeOf.get(n.line as number), n.question)));
  const newNotes = notes.filter((n) => !haveNoteKeys.has(noteKey(n.legacy_code, n.question)) || replaced.has(noteKey(n.legacy_code, n.question)));
  report.push(["notes", newNotes.length - replaced.size, replaced.size], ["notes (removed)", 0, staleNotes.length - replaced.size]);
  if (write) {
    await inBatches(staleNotes.map((n) => n.id as number), (ids) => db.from("notes").delete().in("id", ids), "remove old notes");
    await inBatches(newNotes.map((n) => ({ line: lineId.get(n.legacy_code)!, question: n.question, kind: n.kind, text: n.text })),
      (b) => db.from("notes").insert(b), "write notes");
  }

  // ------------------------------------------------------------------ 3. report
  console.log(write ? "Written:" : "Dry run, nothing written. Would change:");
  for (const [table, added, changed] of report) console.log(`  ${table.padEnd(26)} +${added} new, ${changed} changed`);
  console.log(`  (CSV: ${sites.length} sites, ${areas.length} areas, ${species.length} species, ${lines.length} lines, ${notes.length} notes)`);

  if (write) {
    // Read the totals back from the database and compare with the workbook's own TOTAL cells.
    const totals = check(await db.from("totals_by_season").select("season_label, plants, workbook_total").order("season_order"), "read totals") as Row[];
    let off = 0;
    console.log("\nSeason        database   workbook   difference");
    for (const t of totals.filter((x) => x.workbook_total !== null)) {
      const d = Number(t.plants) - Number(t.workbook_total);
      if (d) off++;
      console.log(`  ${String(t.season_label).padEnd(12)}${String(t.plants).padStart(9)}${String(t.workbook_total).padStart(11)}${String(d).padStart(13)}`);
    }
    console.log(off ? `\n${off} season(s) do not match the workbook.` : "\nEvery season matches the workbook.");
    if (off) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
