/**
 * Import the workbook history: refresh the old layer, then build the new layer on it.
 *
 *   DATABASE_URL=postgres://… npx tsx scripts/import-history.ts
 *
 * One transaction, in this order:
 *   1. legacy.*   the five generated CSVs, as they are. The import row's id is the data version.
 *   2. public.*   seasons, sites, areas, species and review topics, matched on their slugs;
 *                 one "workbook" planting event per area per season; one line per legacy row,
 *                 matched on legacy_code, so ids stay the same between imports.
 *   3. content    pins, species profiles and photos from data/*.json: added only when missing,
 *                 so staff edits made in Supabase are never overwritten.
 * Columns staff own (descriptions, is_public, review decisions) are never touched.
 * Sites, species and areas that drop out of the workbook are reported, not deleted.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq, getTableColumns, inArray, isNotNull, isNull, notInArray, sql, type Table } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";
import { createDb } from "../db/client";
import { contentFiles } from "../db/content";
import * as t from "../db/schema";
import { DEFAULT_DATA_DIR, loadFromDirectory } from "../lib/wrt/csv/csv-repository";
import { parseCsv } from "../lib/wrt/csv/parse";
import { REVIEW_THEMES } from "../lib/wrt/review-themes";
import { slugify } from "../lib/wrt/text";

const dataDir = process.env.WRT_DATA_DIR || DEFAULT_DATA_DIR;
const FILES = {
  planting_history: "planting_history.csv",
  species_master_proposed: "species_master_proposed.csv",
  species_crosswalk: "species_crosswalk.csv",
  site_crosswalk: "site_crosswalk.csv",
  history_reconciliation: "history_reconciliation.csv",
} as const;

// ------------------------------------------------------------ read and check everything first
const data = loadFromDirectory(dataDir);
const loadErrors = data.issues.filter((i) => i.severity === "error");
if (loadErrors.length) throw new Error(loadErrors.map((e) => e.message).join("\n"));

const content = Object.fromEntries(Object.entries(contentFiles).map(([file, schema]) => {
  const parsed = schema.safeParse(JSON.parse(readFileSync(path.join("data", file), "utf8")));
  if (!parsed.success) throw new Error(`${file}: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  return [file, parsed.data];
})) as { [K in keyof typeof contentFiles]: import("zod").infer<(typeof contentFiles)[K]> };

const fileText = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, readFileSync(path.join(dataDir, f), "utf8")])) as Record<keyof typeof FILES, string>;
const raw = (k: keyof typeof FILES) => parseCsv(fileText[k]).rows;

const fileInfo = Object.entries(FILES).map(([k, f]) => ({
  name: f, sha256: createHash("sha256").update(fileText[k as keyof typeof FILES]).digest("hex"), rows: raw(k as keyof typeof FILES).length,
}));
const importId = createHash("sha256").update(fileInfo.map((f) => `${f.name}:${f.sha256}\n`).join("")).digest("hex").slice(0, 12);

// ------------------------------------------------------------ helpers
const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
/** CSV row → legacy row: camelCase keys, blanks to null, chosen columns to integers. */
function legacyRow(r: Record<string, string>, ints: string[]) {
  const out: Record<string, string | number | null> = { importId };
  for (const [k, v] of Object.entries(r)) {
    const val = v === "" || v === undefined ? null : v;
    out[camel(k)] = val !== null && ints.includes(k) ? (/^-?\d+$/.test(val) ? Number(val) : null) : val;
  }
  return out;
}
async function inBatches<T>(rows: T[], size: number, fn: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}
/** On conflict, take these columns from the incoming row. Uses each column's real database name. */
function excluded(table: Table, keys: string[]) {
  const columns = getTableColumns(table) as Record<string, { name: string; keyAsName: boolean }>;
  return Object.fromEntries(keys.map((k) => {
    const c = columns[k];
    return [k, sql.raw(`excluded."${c.keyAsName ? toSnakeCase(c.name) : c.name}"`)];
  }));
}

// Area slug: the area name, suffixed -2, -3 when two areas of one site share a name.
// Ordered by first season seen, then WRT number, so slugs stay put across imports.
const firstSeen = new Map<string, number>();
data.records.forEach((r, i) => { const k = `${r.placeSlug}|${r.parcelId}`; if (!firstSeen.has(k)) firstSeen.set(k, i); });
const areaSlugOf = new Map<string, string>();
for (const site of data.places) {
  const used = new Set<string>();
  for (const p of [...site.parcels].sort((a, b) =>
    (firstSeen.get(`${site.slug}|${a.id}`) ?? 0) - (firstSeen.get(`${site.slug}|${b.id}`) ?? 0) || a.id.localeCompare(b.id))) {
    const base = slugify(p.name) || "area";
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    areaSlugOf.set(`${site.slug}|${p.id}`, slug);
  }
}

// Contested groups: species linked by contested_with, named by WRT's code ("C3") where the note starts with one.
const speciesById = new Map(data.species.map((s) => [s.id, s]));
const groupOf = new Map<string, string>();
for (const s of data.species) {
  if (!s.contestedWith.length || groupOf.has(s.id)) continue;
  const members = new Set([s.id]);
  for (const id of members) for (const o of speciesById.get(id)?.contestedWith ?? []) members.add(o);
  const code = [...members].map((id) => speciesById.get(id)?.note?.match(/^(C\d+):/)?.[1]).find(Boolean);
  for (const id of members) groupOf.set(id, code ?? `C-${[...members].sort()[0]}`);
}
const seasonCheck = new Map(data.reconciliation.filter((r) => r.kind === "season").map((r) => [r.label, r]));

// ------------------------------------------------------------ write
async function main() {
const { db, close } = createDb();
const report = await db.transaction(async (tx) => {
  // 1. legacy ------------------------------------------------------------------
  await tx.insert(t.imports).values({ id: importId, files: fileInfo }).onConflictDoNothing();
  await tx.delete(t.speciesCrosswalk);
  await tx.delete(t.siteCrosswalk);
  await tx.delete(t.reconciliation);
  await tx.delete(t.speciesRegister);
  await inBatches(raw("species_master_proposed").map((r) => legacyRow(r, ["alias_rows", "occurrences"])), 500,
    (b) => tx.insert(t.speciesRegister).values(b as never));
  await inBatches(raw("species_crosswalk").map((r) => legacyRow(r, ["occurrences"])), 500,
    (b) => tx.insert(t.speciesCrosswalk).values(b as never));
  await inBatches(raw("site_crosswalk").map((r) => legacyRow(r, ["columns", "records", "plants"])), 500,
    (b) => tx.insert(t.siteCrosswalk).values(b as never));
  await tx.insert(t.reconciliation).values(raw("history_reconciliation").map((r) => legacyRow(r, ["generated", "stated", "difference", "records"])) as never);
  const historyRows = raw("planting_history").map((r) => legacyRow(r, ["year", "quantity"]));
  await inBatches(historyRows, 500, (b) => tx.insert(t.plantingHistory).values(b as never)
    .onConflictDoUpdate({ target: t.plantingHistory.recordId, set: excluded(t.plantingHistory, Object.keys(b[0]).filter((k) => k !== "recordId")) }));

  // 2. the new layer, built from the same rows ------------------------------------
  await tx.insert(t.seasons).values(data.seasons.map((s) => ({
    slug: s.slug, year: s.year, name: s.name, label: s.label, sortOrder: s.order,
    workbookTotal: seasonCheck.get(s.label)?.stated ?? null, workbookCell: seasonCheck.get(s.label)?.statedCell || null,
  }))).onConflictDoUpdate({ target: t.seasons.slug, set: {
    year: sql`excluded.year`, name: sql`excluded.name`, label: sql`excluded.label`, sortOrder: sql`excluded.sort_order`,
    workbookTotal: sql`excluded.workbook_total`, workbookCell: sql`excluded.workbook_cell` } });

  await tx.insert(t.sites).values(data.places.map((p) => ({ slug: p.slug, name: p.name, isScheme: p.isScheme })))
    .onConflictDoUpdate({ target: t.sites.slug, set: { name: sql`excluded.name`, isScheme: sql`excluded.is_scheme` } });
  const siteId = new Map((await tx.select({ id: t.sites.id, slug: t.sites.slug }).from(t.sites)).map((s) => [s.slug, s.id]));

  await tx.insert(t.siteAreas).values(data.places.flatMap((site) => site.parcels.map((p) => ({
    siteId: siteId.get(site.slug)!, slug: areaSlugOf.get(`${site.slug}|${p.id}`)!, name: p.name,
    wrtNumber: p.id.startsWith("unnumbered-") ? null : p.id,
    siteClass: p.siteClass === "unknown" ? null : p.siteClass,
  })))).onConflictDoUpdate({ target: [t.siteAreas.siteId, t.siteAreas.slug], set: {
    name: sql`excluded.name`, wrtNumber: sql`excluded.wrt_number`, siteClass: sql`excluded.site_class` } });
  const areaId = new Map((await tx.select({ id: t.siteAreas.id, siteId: t.siteAreas.siteId, slug: t.siteAreas.slug }).from(t.siteAreas))
    .map((a) => [`${a.siteId}|${a.slug}`, a.id]));
  const areaOf = (placeSlug: string, parcelId: string) =>
    areaId.get(`${siteId.get(placeSlug)}|${areaSlugOf.get(`${placeSlug}|${parcelId}`)}`)!;

  await tx.insert(t.species).values(data.species.map((s) => ({
    slug: s.slug, scientificName: s.scientificName, suggestedSpelling: s.suggestedSpelling,
    commonName: s.commonName, maoriName: s.maoriName, status: s.status === "unknown" ? null : s.status,
    over5m: s.over5m, threatened: s.threatened, threatenedTeKakano: s.threatenedMarks.teKakano,
    contestedGroup: groupOf.get(s.id) ?? null, needsDecision: s.needsDecision, registerNote: s.note, registerCode: s.id,
  }))).onConflictDoUpdate({ target: t.species.slug, set: excluded(t.species, ["scientificName", "suggestedSpelling", "commonName",
    "maoriName", "status", "over5m", "threatened", "threatenedTeKakano", "contestedGroup", "needsDecision", "registerNote", "registerCode"]) });
  const speciesId = new Map((await tx.select({ id: t.species.id, slug: t.species.slug }).from(t.species)).map((s) => [s.slug, s.id]));

  await tx.insert(t.reviewTopics).values(Object.entries(REVIEW_THEMES).map(([slug, th]) => ({ slug, label: th.label, question: th.question })))
    .onConflictDoNothing({ target: t.reviewTopics.slug });
  const topicId = new Map((await tx.select({ id: t.reviewTopics.id, slug: t.reviewTopics.slug }).from(t.reviewTopics)).map((x) => [x.slug, x.id]));
  const seasonId = new Map((await tx.select({ id: t.seasons.id, slug: t.seasons.slug }).from(t.seasons)).map((x) => [x.slug, x.id]));

  // One workbook event per area per season.
  const eventKeys = new Map<string, { siteAreaId: number; seasonId: number }>();
  for (const r of data.records) {
    const a = areaOf(r.placeSlug, r.parcelId), s = seasonId.get(r.seasonSlug)!;
    eventKeys.set(`${a}|${s}`, { siteAreaId: a, seasonId: s });
  }
  await inBatches([...eventKeys.values()].map((e) => ({ ...e, source: "workbook" as const })), 500,
    (b) => tx.insert(t.plantingEvents).values(b).onConflictDoNothing({
      target: [t.plantingEvents.siteAreaId, t.plantingEvents.seasonId], where: sql`source = 'workbook'` }));
  const eventId = new Map((await tx.select({ id: t.plantingEvents.id, a: t.plantingEvents.siteAreaId, s: t.plantingEvents.seasonId })
    .from(t.plantingEvents).where(eq(t.plantingEvents.source, "workbook"))).map((e) => [`${e.a}|${e.s}`, e.id]));

  // One line per legacy row, matched on legacy_code.
  const lines = data.records.map((r) => ({
    eventId: eventId.get(`${areaOf(r.placeSlug, r.parcelId)}|${seasonId.get(r.seasonSlug)}`)!,
    speciesId: speciesId.get(speciesById.get(r.speciesId)!.slug)!,
    quantity: r.hasQuantity ? r.quantity : null,
    needsReview: r.needsReview,
    legacyCode: r.id,
  }));
  await inBatches(lines, 1000, (b) => tx.insert(t.plantingLines).values(b).onConflictDoUpdate({
    target: t.plantingLines.legacyCode,
    set: { eventId: sql`excluded.event_id`, speciesId: sql`excluded.species_id`, quantity: sql`excluded.quantity`, needsReview: sql`excluded.needs_review` } }));
  const codes = data.records.map((r) => r.id);
  const removedLines = await tx.delete(t.plantingLines)
    .where(and(isNotNull(t.plantingLines.legacyCode), notInArray(t.plantingLines.legacyCode, codes))).returning({ id: t.plantingLines.id });
  await tx.delete(t.plantingEvents).where(and(eq(t.plantingEvents.source, "workbook"),
    sql`not exists (select 1 from public.planting_lines l where l.event_id = ${t.plantingEvents.id})`));
  await tx.delete(t.plantingHistory).where(notInArray(t.plantingHistory.recordId, codes));

  // Notes written by the import are replaced; notes staff added (created_by set) are kept.
  const lineId = new Map((await tx.select({ id: t.plantingLines.id, code: t.plantingLines.legacyCode }).from(t.plantingLines)
    .where(isNotNull(t.plantingLines.legacyCode))).map((l) => [l.code!, l.id]));
  await tx.delete(t.lineNotes).where(and(isNull(t.lineNotes.createdBy), inArray(t.lineNotes.lineId, [...lineId.values()])));
  await inBatches(data.records.flatMap((r) => r.notes.map((n) => ({
    lineId: lineId.get(r.id)!, topicId: topicId.get(n.theme)!, kind: n.kind, text: n.text,
  }))), 1000, (b) => tx.insert(t.lineNotes).values(b));

  // 3. content: add what is missing --------------------------------------------------
  const parcelArea = (site: string, parcel?: string) => (parcel ? areaOf(site, parcel) ?? null : null);
  await tx.insert(t.siteLocations).values(content["site-locations.json"].map((l) => ({
    slug: l.id, siteId: siteId.get(l.siteSlug)!, siteAreaId: parcelArea(l.siteSlug, l.parcelIds?.[0]),
    label: l.label, latitude: l.latitude, longitude: l.longitude, accuracy: l.precision, description: l.description,
    sourceLabel: l.sourceLabel, sourceUrl: l.sourceUrl, coordinateSourceUrl: l.coordinateSourceUrl,
    coordinateMethod: l.coordinateMethod, checkedOn: l.checkedOn,
  }))).onConflictDoNothing({ target: t.siteLocations.slug });

  const slugByCode = new Map(data.species.map((s) => [s.id, s.slug]));
  const idByCode = (code: string) => speciesId.get(slugByCode.get(code)!)!;
  const checks = new Map(content["species-reference-reviews.json"].map((c) => [c.speciesId, c]));
  await tx.insert(t.speciesProfiles).values(content["species-profiles.json"].map((p) => {
    const c = checks.get(p.speciesId);
    return { speciesId: idByCode(p.speciesId), commonName: p.commonName, maoriNames: p.maoriNames, nameNote: p.nameNote ?? null,
      summary: p.summary, lookFor: p.lookFor, sources: p.sources, checkedOn: p.checkedAt,
      photosStatus: c?.status ?? null, photosNote: c?.reason ?? null, photosSummary: c?.summary ?? null, photosCheckedOn: c?.checkedAt ?? null };
  })).onConflictDoNothing({ target: t.speciesProfiles.speciesId });

  const position = new Map<string, number>();
  await tx.insert(t.speciesPhotos).values(content["species-photos.json"].map((p) => {
    const n = position.get(p.speciesId) ?? 0;
    position.set(p.speciesId, n + 1);
    return { speciesId: idByCode(p.speciesId), position: n, src: p.src, width: p.width, height: p.height, caption: p.caption,
      author: p.author, license: p.license, licenseUrl: p.licenseUrl, sourceName: p.sourceName, sourceUrl: p.sourceUrl,
      articleUrl: p.articleUrl, articleLabel: p.articleLabel ?? null, observationUrl: p.observationUrl ?? null,
      focalPoint: p.focalPoint, retrievedOn: p.retrievedAt };
  })).onConflictDoNothing();

  // 4. report what no longer has history -------------------------------------------
  const stale = await tx.execute(sql`
    select 'site' as kind, s.slug from public.sites s where not exists (
      select 1 from public.site_areas a join public.planting_events e on e.site_area_id = a.id where a.site_id = s.id)
    union all
    select 'area', a.slug from public.site_areas a where not exists (select 1 from public.planting_events e where e.site_area_id = a.id)`);
  return { events: eventKeys.size, lines: lines.length, removedLines: removedLines.length, stale };
});
await close();

console.log(`data version ${importId}`);
console.log(`  ${report.events} workbook events, ${report.lines} lines (${report.removedLines} removed since last import)`);
for (const row of report.stale as unknown as { kind: string; slug: string }[]) console.log(`  no history left: ${row.kind} ${row.slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
