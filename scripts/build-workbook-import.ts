/**
 * Build supabase/import/workbook_history.sql from the CSVs in docs/planning/prototype
 * and the content files in data/.
 *
 *   npx tsx scripts/build-workbook-import.ts
 *
 * The SQL fills sites, areas, species, seasons' workbook totals, questions, and one
 * "workbook" planting per area per season with its lines and review notes.
 * Paste it into Supabase > SQL Editor, or run it with psql. Running it again is safe:
 *   - rows are matched on their slug, or legacy_code for lines, so ids stay the same
 *   - staff-owned text (descriptions, pins, profiles, photos) is only filled when empty
 *   - notes the import wrote are replaced; notes a person wrote are kept
 *   - lines that drop out of the CSV are retired, never deleted
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_DATA_DIR, loadFromDirectory } from "../lib/wrt/csv/csv-repository";
import { REVIEW_THEMES } from "../lib/wrt/review-themes";
import { slugify } from "../lib/wrt/text";
import type { ReviewNoteKind } from "../lib/wrt/types";

const OUT = path.join("supabase", "import", "workbook_history.sql");
const data = loadFromDirectory(process.env.WRT_DATA_DIR || DEFAULT_DATA_DIR);
const json = <T>(file: string): T => JSON.parse(readFileSync(path.join("data", file), "utf8")) as T;
const problems: string[] = [];

// ------------------------------------------------------------------ SQL helpers
type Value = string | number | boolean | null | undefined | object;
function lit(v: Value): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${v.replace(/'/g, "''")}'`;
}
const rows = (list: Value[][]) => list.map((r) => `  (${r.map(lit).join(", ")})`).join(",\n");

// ------------------------------------------------------------------ sites and areas
// Area slugs are unique across all sites: the area name, then site-area, then numbered.
const areaSlug = new Map<string, string>(); // "placeSlug|parcelId" -> slug
const usedAreaSlugs = new Set<string>();
for (const place of data.places) {
  for (const parcel of place.parcels) {
    const base = slugify(parcel.name) || "area";
    let slug = usedAreaSlugs.has(base) ? `${place.slug}-${base}` : base;
    for (let n = 2; usedAreaSlugs.has(slug); n++) slug = `${place.slug}-${base}-${n}`;
    usedAreaSlugs.add(slug);
    areaSlug.set(`${place.slug}|${parcel.id}`, slug);
  }
}
// A WRT number is a real register number, not the loader's "unnumbered-…" key or a provisional "NEW-…" one.
const wrtNumber = (id: string) => (id.startsWith("unnumbered-") || id.startsWith("NEW-") ? null : id);

// Pins from data/site-locations.json: one per area, first one wins.
interface Location {
  id: string; siteSlug: string; label: string; latitude: number; longitude: number; description: string;
  sourceUrl?: string; coordinateSourceUrl?: string; checkedOn?: string; parcelIds?: string[];
}
const pinOf = new Map<string, Location>();
for (const loc of json<Location[]>("site-locations.json")) {
  const place = data.places.find((p) => p.slug === loc.siteSlug);
  if (!place) { problems.push(`pin ${loc.id}: no site ${loc.siteSlug}`); continue; }
  const parcelId = loc.parcelIds?.[0] ?? (place.parcels.length === 1 ? place.parcels[0].id : undefined);
  const slug = parcelId ? areaSlug.get(`${place.slug}|${parcelId}`) : undefined;
  if (!slug) { problems.push(`pin ${loc.id}: no single area in ${loc.siteSlug} to put it on`); continue; }
  if (pinOf.has(slug)) { problems.push(`pin ${loc.id}: area ${slug} already has pin ${pinOf.get(slug)!.id}`); continue; }
  pinOf.set(slug, loc);
}

const siteRows = data.places.map((p) => [p.slug, p.name, p.isScheme]);
const areaRows = data.places.flatMap((place) => place.parcels.map((parcel) => {
  const slug = areaSlug.get(`${place.slug}|${parcel.id}`)!;
  const pin = pinOf.get(slug);
  return [
    slug, place.slug, parcel.name, pin?.description ?? "", wrtNumber(parcel.id),
    parcel.siteClass === "unknown" ? null : parcel.siteClass,
    pin ? Number(pin.latitude) : null, pin ? Number(pin.longitude) : null,
    pin ? (pin.coordinateSourceUrl ?? pin.sourceUrl ?? null) : null, pin?.checkedOn ?? null,
  ];
}));

// ------------------------------------------------------------------ species
// Contested groups: species linked by contested_with, named by WRT's code ("C3") from the register note.
const byId = new Map(data.species.map((s) => [s.id, s]));
const groupOf = new Map<string, string>();
for (const s of data.species) {
  if (!s.contestedWith.length || groupOf.has(s.id)) continue;
  const members = new Set([s.id]);
  for (const id of members) for (const o of byId.get(id)?.contestedWith ?? []) members.add(o);
  const code = [...members].map((id) => byId.get(id)?.note?.match(/^(C\d+):/)?.[1]).find(Boolean);
  if (!code) problems.push(`contested species ${[...members].join(" ")}: no C-code in the register note, group left empty`);
  else for (const id of members) groupOf.set(id, code);
}

interface Profile { speciesId: string; commonName?: string; maoriNames?: string[]; nameNote?: string; summary?: string; lookFor?: string; sources?: unknown[]; checkedAt?: string }
interface Photo { speciesId: string; scientificName?: string; [k: string]: unknown }
interface PhotoCheck { speciesId: string; status: string; reason?: string; summary?: string; checkedAt?: string }
const profiles = new Map(json<Profile[]>("species-profiles.json").map((p) => [p.speciesId, p]));
const checks = new Map(json<PhotoCheck[]>("species-reference-reviews.json").map((c) => [c.speciesId, c]));
const photos = new Map<string, object[]>();
for (const { speciesId, scientificName: _name, ...photo } of json<Photo[]>("species-photos.json")) {
  photos.set(speciesId, [...(photos.get(speciesId) ?? []), photo]);
}
for (const id of [...profiles.keys(), ...photos.keys(), ...checks.keys()]) {
  if (!byId.has(id)) problems.push(`species content for ${id}: not in the species register`);
}

const speciesRows = data.species.map((s) => {
  const p = profiles.get(s.id);
  const c = checks.get(s.id);
  const profile = p ? {
    commonName: p.commonName, maoriNames: p.maoriNames, nameNote: p.nameNote, summary: p.summary,
    lookFor: p.lookFor, sources: p.sources, checkedOn: p.checkedAt,
    ...(c ? { photoCheck: { status: c.status, reason: c.reason, summary: c.summary, checkedOn: c.checkedAt } } : {}),
  } : {};
  return [
    s.slug, s.scientificName, s.suggestedSpelling, s.commonName, s.maoriName,
    s.status === "unknown" ? null : s.status, s.over5m, s.threatened, s.threatenedMarks.teKakano,
    groupOf.get(s.id) ?? null, s.needsDecision, s.id, s.note, profile, photos.get(s.id) ?? [],
  ];
});

// ------------------------------------------------------------------ seasons, questions
const seasonRows = data.reconciliation.filter((r) => r.kind === "season").map((r) => [r.label, r.stated, r.statedCell || null]);
const questionRows = Object.entries(REVIEW_THEMES).map(([slug, t]) => [slug, `${t.label}: ${t.question}`]);

// ------------------------------------------------------------------ lines and notes
const RANK: Record<ReviewNoteKind, number> = { ruling: 0, confirm: 1, fyi: 2 };
const lineKey = new Map<string, string>();
const lineRows: Value[][] = [];
const noteRows: Value[][] = [];
for (const r of data.records) {
  const area = areaSlug.get(`${r.placeSlug}|${r.parcelId}`)!;
  const species = byId.get(r.speciesId)!.slug;
  const key = `${area}|${r.seasonSlug}|${species}`;
  if (lineKey.has(key)) problems.push(`${r.id} and ${lineKey.get(key)}: same area, season and species (the database allows one)`);
  lineKey.set(key, r.id);
  lineRows.push([r.id, area, r.seasonSlug, species, r.hasQuantity ? r.quantity : null, r.provenance.sourceCell]);

  // One note per line per question: merge same-question notes, keeping the strongest kind.
  const merged = new Map<string, { kind: ReviewNoteKind; text: string[] }>();
  for (const n of r.notes) {
    const m = merged.get(n.theme) ?? { kind: n.kind, text: [] };
    if (RANK[n.kind] < RANK[m.kind]) m.kind = n.kind;
    m.text.push(n.text);
    merged.set(n.theme, m);
  }
  for (const [question, m] of merged) noteRows.push([r.id, question, m.kind, m.text.join("\n")]);
}

if (problems.some((p) => p.includes("same area, season and species"))) {
  console.error(problems.join("\n"));
  throw new Error("Two CSV rows would become one line. Fix the crosswalk before importing.");
}

// ------------------------------------------------------------------ write
const sql = `-- WRT planting database: the workbook history.
-- Generated by scripts/build-workbook-import.ts from docs/planning/prototype/*.csv and data/*.json.
-- Do not edit by hand: change the CSVs and run the script again.
--
-- Run after the schema and access rules, in Supabase > SQL Editor (it runs as the
-- database owner, so the access rules don't apply). Safe to run again.
-- ${data.places.length} sites, ${areaRows.length} areas, ${speciesRows.length} species, ${lineRows.length} lines, ${noteRows.length} notes.

begin;

-- Sites ----------------------------------------------------------------------
insert into public.sites (slug, name, is_scheme) values
${rows(siteRows)}
on conflict (slug) do update set name = excluded.name, is_scheme = excluded.is_scheme
  where (sites.name, sites.is_scheme) is distinct from (excluded.name, excluded.is_scheme);

-- Areas: name, number and class follow the CSV; description and pin only fill gaps.
insert into public.areas (slug, site, name, description, wrt_number, class, lat, lng, pin_source_url, pin_checked_on) values
${rows(areaRows)}
on conflict (slug) do update set
  site = excluded.site, name = excluded.name, wrt_number = excluded.wrt_number, class = excluded.class,
  description    = case when areas.description = '' then excluded.description else areas.description end,
  lat            = coalesce(areas.lat, excluded.lat),
  lng            = case when areas.lat is null then excluded.lng else areas.lng end,
  pin_source_url = case when areas.lat is null then excluded.pin_source_url else areas.pin_source_url end,
  pin_checked_on = case when areas.lat is null then excluded.pin_checked_on else areas.pin_checked_on end
  where (areas.site, areas.name, areas.wrt_number, areas.class) is distinct from
        (excluded.site, excluded.name, excluded.wrt_number, excluded.class)
     or (areas.description = '' and excluded.description <> '')
     or (areas.lat is null and excluded.lat is not null);

-- Species: register columns follow the CSV; profile and photos only fill gaps.
insert into public.species (slug, scientific_name, suggested_spelling, common_name, maori_name, status, over_5m,
  threatened, threatened_te_kakano, contested_group, needs_decision, register_code, register_note, profile, photos) values
${rows(speciesRows)}
on conflict (slug) do update set
  scientific_name = excluded.scientific_name, suggested_spelling = excluded.suggested_spelling,
  common_name = excluded.common_name, maori_name = excluded.maori_name, status = excluded.status,
  over_5m = excluded.over_5m, threatened = excluded.threatened, threatened_te_kakano = excluded.threatened_te_kakano,
  contested_group = excluded.contested_group, needs_decision = excluded.needs_decision,
  register_code = excluded.register_code, register_note = excluded.register_note,
  profile = case when species.profile = '{}'::jsonb then excluded.profile else species.profile end,
  photos  = case when species.photos  = '[]'::jsonb then excluded.photos  else species.photos  end
  where (species.scientific_name, species.suggested_spelling, species.common_name, species.maori_name, species.status,
         species.over_5m, species.threatened, species.threatened_te_kakano, species.contested_group,
         species.needs_decision, species.register_code, species.register_note)
        is distinct from
        (excluded.scientific_name, excluded.suggested_spelling, excluded.common_name, excluded.maori_name, excluded.status,
         excluded.over_5m, excluded.threatened, excluded.threatened_te_kakano, excluded.contested_group,
         excluded.needs_decision, excluded.register_code, excluded.register_note)
     or (species.profile = '{}'::jsonb and excluded.profile <> '{}'::jsonb)
     or (species.photos  = '[]'::jsonb and excluded.photos  <> '[]'::jsonb);

-- Seasons: the workbook's own TOTAL cell, to check the import against.
update public.seasons s set workbook_total = v.total, workbook_cell = v.cell
from (values
${rows(seasonRows)}
) as v (label, total, cell)
where s.label = v.label and (s.workbook_total, s.workbook_cell) is distinct from (v.total, v.cell);

-- Questions the Trust answers once. The question text follows the app; a ruling is never touched.
insert into public.questions (slug, question) values
${rows(questionRows)}
on conflict (slug) do update set question = excluded.question
  where questions.question is distinct from excluded.question;

-- Lines --------------------------------------------------------------------
create temp table import_lines (legacy_code text primary key, area text, season text, species text,
  quantity integer, source_cell text) on commit drop;
insert into import_lines values
${rows(lineRows)};

-- One workbook planting per area per season.
insert into public.plantings (area, season, source)
select distinct l.area, s.id, 'workbook'::public.planting_source
from import_lines l join public.seasons s on s.slug = l.season
on conflict (area, season) where source = 'workbook' do nothing;

insert into public.planting_lines (planting, species, quantity, legacy_code, source_cell)
select p.id, l.species, l.quantity, l.legacy_code, l.source_cell
from import_lines l
join public.seasons s on s.slug = l.season
join public.plantings p on p.area = l.area and p.season = s.id and p.source = 'workbook'
on conflict (legacy_code) do update set
  planting = excluded.planting, species = excluded.species, quantity = excluded.quantity,
  source_cell = excluded.source_cell, retired_at = null
  where (planting_lines.planting, planting_lines.species, planting_lines.quantity,
         planting_lines.source_cell, planting_lines.retired_at)
        is distinct from
        (excluded.planting, excluded.species, excluded.quantity, excluded.source_cell, null::timestamptz);

-- Lines no longer in the CSV are retired, not deleted.
update public.planting_lines set retired_at = now()
where legacy_code is not null and retired_at is null
  and legacy_code not in (select legacy_code from import_lines);

-- Notes --------------------------------------------------------------------
-- Notes the import wrote (no author) are replaced; notes a person wrote are kept.
create temp table import_notes (legacy_code text, question text, kind public.note_kind, text text) on commit drop;
insert into import_notes values
${rows(noteRows)};

delete from public.notes n
using public.planting_lines l
where n.line = l.id and l.legacy_code is not null and n.created_by is null and n.resolved_at is null
  and not exists (select 1 from import_notes i
                  where i.legacy_code = l.legacy_code and i.question = n.question
                    and i.kind = n.kind and i.text = n.text);

insert into public.notes (line, question, kind, text)
select l.id, i.question, i.kind, i.text
from import_notes i join public.planting_lines l on l.legacy_code = i.legacy_code
on conflict (line, question) do nothing;

commit;

-- Check: each season against the workbook's TOTAL cell -----------------------
select s.label as season,
       coalesce(sum(l.quantity), 0) as imported,
       s.workbook_total as workbook,
       coalesce(sum(l.quantity), 0) - s.workbook_total as difference,
       count(l.id) as lines
from public.seasons s
left join public.plantings p on p.season = s.id and p.source = 'workbook'
left join public.planting_lines l on l.planting = p.id and l.retired_at is null
where s.workbook_total is not null
group by s.id, s.label, s.workbook_total
order by s.id;
`;

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, sql);
console.log(`wrote ${OUT} (${(sql.length / 1024).toFixed(0)} KB)`);
console.log(`  ${siteRows.length} sites, ${areaRows.length} areas (${pinOf.size} with pins), ${speciesRows.length} species`);
console.log(`  ${lineRows.length} lines, ${noteRows.length} notes, ${seasonRows.length} season totals`);
for (const p of problems) console.log(`  note: ${p}`);
