/**
 * Export the WRT history to per-table CSVs for Supabase, plus a load.sql that
 * refreshes the ledger tables in one transaction.
 *
 *   npx tsx scripts/export-supabase.ts [outDir]          (default: supabase/export)
 *   psql "$SUPABASE_DB_URL" -f supabase/export/load.sql   (run from the repo root)
 *
 * It reuses loadFromDirectory(), so places, parcels, slugs, macrons and review
 * themes come out exactly as the app builds them today. Content tables (pins,
 * profiles, photos) are seeded with ON CONFLICT DO NOTHING, so staff edits survive
 * re-imports.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_DATA_DIR, loadFromDirectory } from "../lib/wrt/csv/csv-repository";
import { parseCsv } from "../lib/wrt/csv/parse";
import { cleanLabel, slugify } from "../lib/wrt/text";

const dataDir = process.env.WRT_DATA_DIR || DEFAULT_DATA_DIR;
const outDir = process.argv[2] || path.join("supabase", "export");
mkdirSync(outDir, { recursive: true });

const FILES = ["planting_history.csv", "species_master_proposed.csv", "species_crosswalk.csv",
  "site_crosswalk.csv", "history_reconciliation.csv"];
const readJson = <T>(f: string): T => JSON.parse(readFileSync(path.join("data", f), "utf8"));
const raw = (f: string) => parseCsv(readFileSync(path.join(dataDir, f), "utf8")).rows;

const data = loadFromDirectory(dataDir);
const errors = data.issues.filter((i) => i.severity === "error");
if (errors.length) throw new Error(errors.map((e) => e.message).join("\n"));

// ---------------------------------------------------------------- writers
type Cell = string | number | boolean | null | undefined | string[] | object;
const pgArray = (a: string[]) => `{${a.map((s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
function cell(v: Cell): string {
  if (v === null || v === undefined) return "";                    // unquoted empty = NULL
  if (typeof v === "boolean") return v ? "t" : "f";
  if (typeof v === "number") return String(v);
  const s = Array.isArray(v) ? pgArray(v) : typeof v === "object" ? JSON.stringify(v) : v;
  return `"${s.replace(/"/g, '""')}"`;                              // quoted "" = empty string
}
type Kind = "dimension" | "fact" | "content";
const tables: { name: string; columns: string[]; rows: number; kind: Kind }[] = [];
function writeTable(name: string, kind: Kind, columns: string[], rows: Cell[][]) {
  writeFileSync(path.join(outDir, `${name}.csv`),
    [columns.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n") + "\n");
  tables.push({ name, columns, rows: rows.length, kind });
}
const yn = (v?: string) => (v === "Y" ? true : v === "N" ? false : null);
const conf = (v?: string) => (v === "high" || v === "medium" || v === "low" ? v : null);
const int = (v?: string) => (v && /^-?\d+$/.test(v) ? Number(v) : null);

// ---------------------------------------------------------------- imports (data version)
const hash = createHash("sha256");
for (const f of FILES) hash.update(`${f}:${createHash("sha256").update(readFileSync(path.join(dataDir, f))).digest("hex")}\n`);
const importId = hash.digest("hex").slice(0, 12);
writeTable("imports", "dimension", ["id", "row_counts", "note"], [[
  importId, Object.fromEntries(data.info.files.map((f) => [f.name.replace(/\.csv$/, ""), f.rows])),
  "Generated CSVs from Plants Out Master › MASTER",
]]);

// ---------------------------------------------------------------- seasons
writeTable("seasons", "dimension", ["slug", "year", "name", "label", "sort_order"],
  data.seasons.map((s) => [s.slug, s.year, s.name, s.label, s.order]));

// ---------------------------------------------------------------- species
const slugById = new Map(data.species.map((s) => [s.id, s.slug]));
const master = new Map(raw("species_master_proposed.csv").map((r) => [r.species_id, r]));
const names = (v?: string) => (v ?? "").split(/,\s*or\s+|\s+or\s+|,\s*/i).map((s) => s.trim()).filter(Boolean);
writeTable("species", "dimension",
  ["slug", "register_code", "scientific_name", "suggested_spelling", "common_name", "maori_name",
    "common_names_all", "maori_names_all", "status", "in_core_98", "over_5m", "threatened",
    "threatened_te_kakano", "needs_decision", "note"],
  data.species.map((s) => {
    const m = master.get(s.id);
    return [s.slug, s.id, s.scientificName, s.suggestedSpelling, s.commonName, s.maoriName,
      names(m?.common_name), names(m?.maori_name), s.status, yn(m?.in_core_98), s.over5m, s.threatened,
      s.threatenedMarks.teKakano, s.needsDecision, s.note];
  }));
writeTable("species_contested", "fact", ["species_slug", "partner_slug"],
  data.species.flatMap((s) => s.contestedWith.map((p) => [s.slug, slugById.get(p)!])));
writeTable("species_aliases", "fact",
  ["species_slug", "raw_name", "match_key", "alias_type", "confidence", "needs_wrt_decision", "occurrences", "sources", "note"],
  raw("species_crosswalk.csv").map((a) => [slugById.get(a.species_id) ?? null, a.raw_name, a.match_key || null,
    a.alias_type || null, conf(a.confidence), a.needs_wrt_decision === "Y", int(a.occurrences), a.sources || null, a.note || null]));

// ---------------------------------------------------------------- places and parcels
// part_slug: slug of the parcel name, suffixed -2, -3 when two parts of one place share
// a name. Order = first season seen, then site number, so it is stable across imports.
const firstSeen = new Map<string, number>();
data.records.forEach((r, i) => { const k = `${r.placeSlug}|${r.parcelId}`; if (!firstSeen.has(k)) firstSeen.set(k, i); });
const parcelKey = new Map<string, string>();                     // "<place>|<parcel.id>" → "<place>/<part>"
const parcelRows: Cell[][] = [];
for (const place of data.places) {
  const used = new Set<string>();
  const ordered = [...place.parcels].sort((a, b) =>
    (firstSeen.get(`${place.slug}|${a.id}`) ?? 0) - (firstSeen.get(`${place.slug}|${b.id}`) ?? 0) || a.id.localeCompare(b.id));
  for (const p of ordered) {
    const base = slugify(p.name) || "part";
    let part = base;
    for (let n = 2; used.has(part); n++) part = `${base}-${n}`;
    used.add(part);
    const key = `${place.slug}/${part}`;
    parcelKey.set(`${place.slug}|${p.id}`, key);
    parcelRows.push([key, place.slug, part, p.name, p.id.startsWith("unnumbered-") ? null : p.id, p.siteClass]);
  }
}
writeTable("places", "dimension", ["slug", "name", "is_scheme"], data.places.map((p) => [p.slug, p.name, p.isScheme]));
writeTable("parcels", "dimension", ["key", "place_slug", "part_slug", "name", "wrt_site_number", "site_class"], parcelRows);

// Header → parcel, matched the way the loader matches (cleaned, lower-case header).
const headerToParcel = new Map<string, string>();
for (const r of data.records) headerToParcel.set(r.provenance.siteOriginal.toLowerCase(), parcelKey.get(`${r.placeSlug}|${r.parcelId}`)!);
writeTable("site_headers", "fact",
  ["parcel_key", "header_as_typed", "header_clean", "site_id_as_typed", "site_id_proposed", "confidence",
    "needs_review", "mapping_rule", "columns", "records", "plants", "seasons_with_records", "note"],
  raw("site_crosswalk.csv").map((x) => {
    const clean = cleanLabel(x.site_original);
    return [headerToParcel.get(clean.toLowerCase()) ?? null, x.site_original, clean, x.site_id_as_typed || null,
      x.site_id_proposed || null, conf(x.confidence), x.needs_review === "Y", x.mapping_rule || null,
      int(x.columns), int(x.records), int(x.plants), x.seasons_with_records || null, x.note || null];
  }));

// ---------------------------------------------------------------- records and notes
const reasons = new Map(raw("planting_history.csv").map((r) => [r.record_id, r.review_reason || null]));
writeTable("planting_records", "fact",
  ["id", "import_id", "season_slug", "parcel_key", "species_slug", "quantity", "precision", "confidence",
    "needs_review", "review_reason", "source_file", "source_sheet", "source_cell", "season_label_original",
    "site_original", "species_original"],
  data.records.map((r) => [r.id, importId, r.seasonSlug, parcelKey.get(`${r.placeSlug}|${r.parcelId}`)!,
    slugById.get(r.speciesId)!, r.hasQuantity ? r.quantity : null, r.precision, r.confidence, r.needsReview,
    reasons.get(r.id) ?? null, r.provenance.sourceFile, r.provenance.sourceSheet, r.provenance.sourceCell,
    r.provenance.seasonLabelOriginal, r.provenance.siteOriginal, r.provenance.speciesOriginal]));
writeTable("review_notes", "fact", ["record_id", "position", "kind", "theme", "text", "raw"],
  data.records.flatMap((r) => r.notes.map((n, i) => [r.id, i, n.kind, n.theme, n.text, n.raw])));
writeTable("reconciliation", "fact",
  ["import_id", "kind", "label", "generated", "stated", "difference", "stated_cell", "records", "cause"],
  data.reconciliation.map((x) => [importId, x.kind, x.label, x.generated, x.stated, x.difference, x.statedCell || null, x.records, x.cause]));

// ---------------------------------------------------------------- content (seed once)
type Loc = { id: string; siteSlug: string; label: string; latitude: number; longitude: number; precision: string;
  description: string; sourceUrl: string; sourceLabel: string; coordinateSourceUrl: string;
  coordinateMethod?: string; checkedOn: string; parcelIds?: string[] };
const locs = readJson<Loc[]>("site-locations.json");
writeTable("place_locations", "content",
  ["id", "place_slug", "label", "latitude", "longitude", "radius_m", "precision", "description", "source_url",
    "source_label", "coordinate_source_url", "coordinate_method", "checked_on"],
  locs.map((l) => [l.id, l.siteSlug, l.label, l.latitude, l.longitude, null, l.precision, l.description,
    l.sourceUrl, l.sourceLabel, l.coordinateSourceUrl, l.coordinateMethod ?? null, l.checkedOn]));
writeTable("place_location_parcels", "content", ["location_id", "parcel_key"],
  locs.flatMap((l) => (l.parcelIds ?? []).map((id) => {
    const key = parcelKey.get(`${l.siteSlug}|${id}`);
    if (!key) throw new Error(`${l.id}: parcel ${id} not found in ${l.siteSlug}`);
    return [l.id, key];
  })));

type Profile = { speciesId: string; commonName?: string; maoriNames?: string[]; nameNote?: string; summary?: string;
  lookFor?: string; sources?: object[]; checkedAt?: string };
writeTable("species_profiles", "content",
  ["species_slug", "common_name", "maori_names", "name_note", "summary", "look_for", "sources", "checked_at"],
  readJson<Profile[]>("species-profiles.json").map((p) => [slugById.get(p.speciesId)!, p.commonName ?? null,
    p.maoriNames ?? [], p.nameNote ?? null, p.summary ?? null, p.lookFor ?? null, JSON.stringify(p.sources ?? []), p.checkedAt ?? null]));

type Photo = { speciesId: string; src: string; width?: number; height?: number; caption?: string; author?: string;
  license?: string; licenseUrl?: string; sourceUrl?: string; sourceName?: string; articleUrl?: string;
  focalPoint?: string; retrievedAt?: string };
const position = new Map<string, number>();
writeTable("species_photos", "content",
  ["species_slug", "position", "src", "width", "height", "caption", "author", "license", "license_url",
    "source_url", "source_name", "article_url", "focal_point", "retrieved_at"],
  readJson<Photo[]>("species-photos.json").map((p) => {
    const n = position.get(p.speciesId) ?? 0;
    position.set(p.speciesId, n + 1);
    return [slugById.get(p.speciesId)!, n, p.src, p.width ?? null, p.height ?? null, p.caption ?? null, p.author ?? null,
      p.license ?? null, p.licenseUrl ?? null, p.sourceUrl ?? null, p.sourceName ?? null, p.articleUrl ?? null,
      p.focalPoint ?? null, p.retrievedAt ?? null];
  }));

type PhotoReview = { speciesId: string; status: string; reason?: string; photoCount?: number; checkedAt?: string };
writeTable("species_photo_reviews", "content", ["species_slug", "status", "reason", "photo_count", "checked_at"],
  readJson<PhotoReview[]>("species-reference-reviews.json").map((r) => [slugById.get(r.speciesId)!, r.status,
    r.reason ?? null, r.photoCount ?? null, r.checkedAt ?? null]));

// ---------------------------------------------------------------- load.sql
// Dimensions are upserted (content rows point at them). Facts are replaced whole.
// Content is inserted only where missing, so staff edits survive.
const rel = (t: string) => path.join(outDir, `${t}.csv`);
const of = (k: Kind) => tables.filter((t) => t.kind === k);
const staged = (t: (typeof tables)[number]) => [
  `create temp table _${t.name} (like ${t.name} including defaults) on commit drop;`,
  `\\copy _${t.name} (${t.columns.join(", ")}) from '${rel(t.name)}' with (format csv, header true)`,
];
const facts = of("fact");
const sql = [
  `-- Data version ${importId}.`,
  "\\set ON_ERROR_STOP on",
  "begin;",
  ...of("dimension").flatMap((t) => {
    const [pk, ...rest] = t.columns;
    return [...staged(t),
      `insert into ${t.name} (${t.columns.join(", ")}) select ${t.columns.join(", ")} from _${t.name}`,
      `  on conflict (${pk}) do update set ${rest.map((c) => `${c} = excluded.${c}`).join(", ")};`];
  }),
  `delete from review_notes; delete from planting_records; delete from reconciliation;`,
  `delete from site_headers; delete from species_aliases; delete from species_contested;`,
  ...facts.map((t) => `\\copy ${t.name} (${t.columns.join(", ")}) from '${rel(t.name)}' with (format csv, header true)`),
  ...of("content").flatMap((t) => [...staged(t),
    `insert into ${t.name} (${t.columns.join(", ")}) select ${t.columns.join(", ")} from _${t.name} on conflict do nothing;`]),
  "-- Rows no longer in the ledger are reported, not deleted: they may carry pins or profiles.",
  `select 'stale place' as kind, slug from places where slug not in (select place_slug from parcels)`,
  `union all select 'stale parcel', key from parcels where key not in (select parcel_key from planting_records);`,
  "commit;",
  "",
].join("\n");
writeFileSync(path.join(outDir, "load.sql"), sql);

console.log(`data version ${importId}`);
for (const t of tables) console.log(`${t.kind.padEnd(9)} ${t.name.padEnd(24)} ${t.rows}`);
