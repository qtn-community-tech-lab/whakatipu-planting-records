/**
 * Export the WRT planting history as CSVs for supabase/import.sql.
 *
 *   npx tsx scripts/export-supabase.ts                       → supabase/export/*.csv
 *   psql "$SUPABASE_DB_URL" -f supabase/import.sql           (run from the repo root)
 *
 * Rows refer to each other by readable keys (site slug, species slug, record code).
 * import.sql turns those into database ids. The script reuses loadFromDirectory(),
 * so sites, areas, slugs, macrons and review topics come out exactly as the app
 * builds them today.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_DATA_DIR, loadFromDirectory } from "../lib/wrt/csv/csv-repository";
import { parseCsv } from "../lib/wrt/csv/parse";
import { REVIEW_THEMES } from "../lib/wrt/review-themes";
import { cleanLabel, slugify } from "../lib/wrt/text";

const dataDir = process.env.WRT_DATA_DIR || DEFAULT_DATA_DIR;
const outDir = process.argv[2] || path.join("supabase", "export");
mkdirSync(outDir, { recursive: true });

const SOURCE_FILES = ["planting_history.csv", "species_master_proposed.csv", "species_crosswalk.csv",
  "site_crosswalk.csv", "history_reconciliation.csv"];
const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.join("data", file), "utf8"));
const readSource = (file: string) => parseCsv(readFileSync(path.join(dataDir, file), "utf8")).rows;

const data = loadFromDirectory(dataDir);
const errors = data.issues.filter((i) => i.severity === "error");
if (errors.length) throw new Error(errors.map((e) => e.message).join("\n"));

// ------------------------------------------------------------ CSV writing
// Unquoted empty = NULL. Quoted "" = empty string.
type Cell = string | number | boolean | null | undefined | string[];
const pgArray = (a: string[]) => `{${a.map((s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
const cell = (v: Cell) =>
  v === null || v === undefined ? "" :
  typeof v === "boolean" ? (v ? "t" : "f") :
  typeof v === "number" ? String(v) :
  `"${(Array.isArray(v) ? pgArray(v) : v).replace(/"/g, '""')}"`;
const counts: [string, number][] = [];
function write(name: string, columns: string[], rows: Cell[][]) {
  writeFileSync(path.join(outDir, `${name}.csv`), [columns.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n") + "\n");
  counts.push([name, rows.length]);
}
const yn = (v?: string) => (v === "Y" ? true : v === "N" ? false : null);
const confidence = (v?: string) => (v === "high" || v === "medium" || v === "low" ? v : null);
const int = (v?: string) => (v && /^-?\d+$/.test(v) ? Number(v) : null);
const classOf = (c: string) => (c === "unknown" ? null : c);

// ------------------------------------------------------------ import (data version)
const hash = createHash("sha256");
for (const f of SOURCE_FILES) hash.update(`${f}:${createHash("sha256").update(readFileSync(path.join(dataDir, f))).digest("hex")}\n`);
const importId = hash.digest("hex").slice(0, 12);
write("import", ["id", "files", "workbook_checks"], [[
  importId,
  JSON.stringify(data.info.files),
  JSON.stringify(data.reconciliation.filter((r) => r.kind !== "season")),
]]);

// ------------------------------------------------------------ seasons
const seasonCheck = new Map(data.reconciliation.filter((r) => r.kind === "season").map((r) => [r.label, r]));
write("seasons", ["slug", "year", "name", "label", "sort_order", "workbook_total", "workbook_cell"],
  data.seasons.map((s) => [s.slug, s.year, s.name, s.label, s.order,
    seasonCheck.get(s.label)?.stated ?? null, seasonCheck.get(s.label)?.statedCell || null]));

// ------------------------------------------------------------ sites and areas
// Area slug: the area name, suffixed -2, -3 when two areas of one site share a name.
// Order = first season seen, then WRT number, so slugs stay put across imports.
const firstSeen = new Map<string, number>();
data.records.forEach((r, i) => { const k = `${r.placeSlug}|${r.parcelId}`; if (!firstSeen.has(k)) firstSeen.set(k, i); });
const areaSlug = new Map<string, string>();                    // "<site>|<parcel.id>" → area slug
const areaRows: Cell[][] = [];
for (const site of data.places) {
  const used = new Set<string>();
  const parcels = [...site.parcels].sort((a, b) =>
    (firstSeen.get(`${site.slug}|${a.id}`) ?? 0) - (firstSeen.get(`${site.slug}|${b.id}`) ?? 0) || a.id.localeCompare(b.id));
  for (const p of parcels) {
    const base = slugify(p.name) || "area";
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    areaSlug.set(`${site.slug}|${p.id}`, slug);
    areaRows.push([site.slug, slug, p.name, p.id.startsWith("unnumbered-") ? null : p.id, classOf(p.siteClass)]);
  }
}
write("sites", ["slug", "name", "is_scheme"], data.places.map((p) => [p.slug, p.name, p.isScheme]));
write("site_areas", ["site_slug", "slug", "name", "wrt_number", "site_class"], areaRows);

// ------------------------------------------------------------ species
// Contested groups: species linked by contested_with, named by WRT's own code ("C3")
// where the register note starts with one.
const slugById = new Map(data.species.map((s) => [s.id, s.slug]));
const group = new Map<string, string>();
for (const s of data.species) {
  if (!s.contestedWith.length || group.has(s.id)) continue;
  const members = new Set([s.id]);
  for (const id of members) for (const o of data.species.find((x) => x.id === id)?.contestedWith ?? []) members.add(o);
  const code = [...members].map((id) => data.species.find((x) => x.id === id)?.note?.match(/^(C\d+):/)?.[1]).find(Boolean);
  for (const id of members) group.set(id, code ?? `C-${[...members].sort()[0]}`);
}
write("species",
  ["slug", "scientific_name", "suggested_spelling", "common_name", "maori_name", "status", "over_5m",
    "threatened", "threatened_te_kakano", "contested_group", "needs_decision", "register_note"],
  data.species.map((s) => [s.slug, s.scientificName, s.suggestedSpelling, s.commonName, s.maoriName,
    s.status === "unknown" ? null : s.status, s.over5m, s.threatened, s.threatenedMarks.teKakano,
    group.get(s.id) ?? null, s.needsDecision, s.note]));

// ------------------------------------------------------------ review topics (seeded once)
write("review_topics", ["slug", "label", "question"],
  Object.entries(REVIEW_THEMES).map(([slug, t]) => [slug, t.label, t.question]));

// ------------------------------------------------------------ planting records, notes, sources
const reasons = new Map(readSource("planting_history.csv").map((r) => [r.record_id, r.review_reason || null]));
write("planting_records",
  ["code", "season_slug", "site_slug", "area_slug", "species_slug", "quantity", "needs_review",
    "workbook_file", "sheet", "cell", "season_as_typed", "site_as_typed", "species_as_typed",
    "review_reason", "confidence", "precision"],
  data.records.map((r) => [r.id, r.seasonSlug, r.placeSlug, areaSlug.get(`${r.placeSlug}|${r.parcelId}`)!,
    slugById.get(r.speciesId)!, r.hasQuantity ? r.quantity : null, r.needsReview,
    r.provenance.sourceFile, r.provenance.sourceSheet, r.provenance.sourceCell, r.provenance.seasonLabelOriginal,
    r.provenance.siteOriginal, r.provenance.speciesOriginal, reasons.get(r.id) ?? null, r.confidence, r.precision]));
write("record_notes", ["record_code", "position", "topic_slug", "kind", "text"],
  data.records.flatMap((r) => r.notes.map((n, i) => [r.id, i, n.theme, n.kind, n.text])));

// ------------------------------------------------------------ spellings (audit)
const areaOfHeader = new Map<string, [string, string]>();
for (const r of data.records) {
  areaOfHeader.set(r.provenance.siteOriginal.toLowerCase(), [r.placeSlug, areaSlug.get(`${r.placeSlug}|${r.parcelId}`)!]);
}
write("site_spellings",
  ["site_slug", "area_slug", "as_typed", "cleaned", "number_as_typed", "mapping_rule", "confidence",
    "needs_review", "records", "plants", "note"],
  readSource("site_crosswalk.csv").map((x) => {
    const cleaned = cleanLabel(x.site_original);
    const [site, area] = areaOfHeader.get(cleaned.toLowerCase()) ?? [null, null];
    return [site, area, x.site_original, cleaned, x.site_id_as_typed || null, x.mapping_rule || null,
      confidence(x.confidence), x.needs_review === "Y", int(x.records), int(x.plants), x.note || null];
  }));
write("species_spellings",
  ["species_slug", "as_typed", "match_key", "kind", "confidence", "needs_wrt_decision", "occurrences", "found_in", "note"],
  readSource("species_crosswalk.csv").map((a) => [slugById.get(a.species_id) ?? null, a.raw_name, a.match_key || null,
    a.alias_type || null, confidence(a.confidence), a.needs_wrt_decision === "Y", int(a.occurrences),
    a.sources || null, a.note || null]));

// ------------------------------------------------------------ staff content (seeded once)
type Pin = { id: string; siteSlug: string; label: string; latitude: number; longitude: number; precision: string;
  description: string; sourceUrl: string; sourceLabel: string; coordinateSourceUrl: string;
  coordinateMethod?: string; checkedOn: string; parcelIds?: string[] };
write("site_locations",
  ["slug", "site_slug", "area_slug", "label", "latitude", "longitude", "accuracy", "description",
    "source_label", "source_url", "coordinate_source_url", "coordinate_method", "checked_on"],
  readJson<Pin[]>("site-locations.json").map((l) => {
    if ((l.parcelIds?.length ?? 0) > 1) throw new Error(`${l.id}: a pin can cover one area or the whole site`);
    const area = l.parcelIds?.[0] ? areaSlug.get(`${l.siteSlug}|${l.parcelIds[0]}`) : null;
    if (l.parcelIds?.[0] && !area) throw new Error(`${l.id}: area ${l.parcelIds[0]} not found in ${l.siteSlug}`);
    return [l.id, l.siteSlug, area, l.label, l.latitude, l.longitude, l.precision, l.description,
      l.sourceLabel, l.sourceUrl, l.coordinateSourceUrl, l.coordinateMethod ?? null, l.checkedOn];
  }));

type Profile = { speciesId: string; commonName?: string; maoriNames?: string[]; nameNote?: string; summary?: string;
  lookFor?: string; sources?: object[]; checkedAt?: string };
type PhotoCheck = { speciesId: string; status: string; reason?: string; checkedAt?: string };
const photoChecks = new Map(readJson<PhotoCheck[]>("species-reference-reviews.json").map((c) => [c.speciesId, c]));
write("species_profiles",
  ["species_slug", "common_name", "maori_names", "name_note", "summary", "look_for", "sources", "checked_on",
    "photos_status", "photos_note", "photos_checked_on"],
  readJson<Profile[]>("species-profiles.json").map((p) => {
    const c = photoChecks.get(p.speciesId);
    return [slugById.get(p.speciesId)!, p.commonName ?? null, p.maoriNames ?? [], p.nameNote ?? null,
      p.summary ?? null, p.lookFor ?? null, JSON.stringify(p.sources ?? []), p.checkedAt ?? null,
      c?.status ?? null, c?.reason ?? null, c?.checkedAt ?? null];
  }));

type Photo = { speciesId: string; src: string; width?: number; height?: number; caption?: string; author?: string;
  license?: string; licenseUrl?: string; sourceName?: string; sourceUrl?: string; articleUrl?: string;
  focalPoint?: string; retrievedAt?: string };
const position = new Map<string, number>();
write("species_photos",
  ["species_slug", "position", "src", "width", "height", "caption", "author", "license", "license_url",
    "source_name", "source_url", "article_url", "focal_point", "retrieved_on"],
  readJson<Photo[]>("species-photos.json").map((p) => {
    const n = position.get(p.speciesId) ?? 0;
    position.set(p.speciesId, n + 1);
    return [slugById.get(p.speciesId)!, n, p.src, p.width ?? null, p.height ?? null, p.caption ?? null,
      p.author ?? null, p.license ?? null, p.licenseUrl ?? null, p.sourceName ?? null, p.sourceUrl ?? null,
      p.articleUrl ?? null, p.focalPoint ?? null, p.retrievedAt ?? null];
  }));

console.log(`data version ${importId} → ${outDir}`);
for (const [name, rows] of counts) console.log(`  ${name.padEnd(18)} ${rows}`);
