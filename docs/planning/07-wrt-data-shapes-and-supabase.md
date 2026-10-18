# 07 · WRT data shapes and the move to Supabase

19 October 2026. Built against `ktgcreative/wtr-app-tree-reforestation`, branch `z` at `a094f07` (7 Oct), not against reports 03–06 alone. The code has moved on since those reports: threatened marks, site pins, species profiles and photos now exist.

**Status: proven, not committed.** The schema was applied to a local Postgres 16, the export loaded twice, and every place, species and season split (157 rows) matched the app's own query layer exactly.

| Check | App | Database |
|---|---|---|
| Recorded plants / needs review | 140,068 / 44,290 | 140,068 / 44,290 |
| Records / needing review | 5,449 / 667 | 5,449 / 667 |
| Places / schemes / parcels / species used | 39 / 1 / 78 / 95 | same |
| Whitechapel 2019 | 2,105 (136 NR, 54 records) | same |
| Slope Hill 2024 theme | 29,000 on 38 records | same |
| Season totals vs workbook TOTAL cells | 23 / 23 match | 23 / 23 match |
| Second load of the same data | n/a | no changes, no errors |
| Staff-set pin radius after a re-import | n/a | kept |
| Anonymous read with RLS on | n/a | 0 rows |

Files:
- `supabase/migrations/20261019000000_wrt_history.sql`: tables, enums, views, RLS.
- `scripts/export-supabase.ts`: writes one CSV per table plus `load.sql`.

---

## 1. Two layers of shape

1. **Domain types** (`lib/wrt/types.ts`). This is the app's contract and it does not change. `Season`, `Species`, `Place`, `Parcel`, `PlantingRecord`, `ReviewNote`, `ReconciliationRow`, and the `QuantitySplit` every number carries.
2. **Storage tables** (below). A future `DbWrtRepository` reads them and builds the same domain objects, so `queries.ts`, the pages and the chat tools stay as they are.

## 2. Tables

**Ledger** tables are rebuilt from the Plants Out Master on each import. Nobody edits them by hand. **Content** tables are seeded once from `data/*.json` and then edited by staff in Supabase; imports never overwrite them.

| Table | Kind | Rows | Key | What it holds |
|---|---|---:|---|---|
| `imports` | ledger | 1 | `id` (12-hex hash of the five CSVs) | The data version. Every record points at its import |
| `seasons` | ledger | 23 | `slug` (`autumn-2024`) | Year, Autumn/Spring, label, sort order |
| `species` | ledger | 164 | `slug` | Register names, status, over-5 m flag, both threatened marks, needs-decision |
| `species_contested` | ledger | 30 | (species, partner) | Contested pairs, both directions |
| `species_aliases` | ledger | 728 | id | Every spelling seen, with alias type and confidence (the app drops these today) |
| `places` | ledger | 39 | `slug` | Site name, `is_scheme` (Paper4Trees) |
| `parcels` | ledger | 78 | `key` = `place/part` | Part name, WRT site number, site class |
| `site_headers` | ledger | 134 | id | Every MASTER header spelling and how it was mapped |
| `planting_records` | ledger | 5,449 | `id` (`PH-2019A-FK12`) | The fact table: one species, one parcel, one season, a quantity, provenance |
| `review_notes` | ledger | 1,501 | (record, position) | `review_reason` split into ruling / confirm / fyi notes, with theme |
| `reconciliation` | ledger | 29 | id | Generated vs workbook totals |
| `place_locations` | content | 50 | `id` | Map pins: lat, lng, **`radius_m`**, precision, sources |
| `place_location_parcels` | content | 36 | (pin, parcel) | Pins that cover only some parts of a site |
| `species_profiles` | content | 95 | `species_slug` | Names, summary, "look for", sources |
| `species_photos` | content | 280 | (species, position) | Reference photos (not WRT plantings), licence and credit |
| `species_photo_reviews` | content | 45 | `species_slug` | Photo check status |

Views (all `security_invoker`, so RLS applies): `record_view` (records joined to season, parcel, place, species), `season_splits`, `place_splits`, `species_splits`, `review_theme_splits`. Each split view returns the full `QuantitySplit` columns: `total`, `resolved`, `needs_review`, `records`, `records_needing_review`.

## 3. Decisions, and why

- **Readable text keys, not UUIDs.** The app already keys everything by slug and record id, and URLs use them. Text keys make the export a plain CSV copy, keep rows readable in the Supabase table editor, and renames cascade with `on update cascade`.
- **`SP-xxx` codes are kept but never joined on.** The generator renumbers them by sort position. They live in `species.register_code` for audit only.
- **Site class moves to the parcel.** Every one of the 78 parcels has a single class across all its records, so the record does not need its own copy.
- **Year, season name and place are not stored on the record.** They come from the season and the parcel. `record_view` puts them back.
- **`quantity` is null for the one "TBC" cell**, not 0. The repository maps null to `quantity: 0, hasQuantity: false`, as now.
- **Parcels get a `part_slug` unique within the place.** The two parts called "Shotover River" become `shotover-river` and `shotover-river-2`. This fixes the parts page's silent first-match bug (report 05 §5.2).
- **Review notes are split and themed once, at import**, so themes can be filtered in SQL. The raw `review_reason` stays on the record for audit. `review_notes.raw` must never be shown or sent to a model.
- **Species names are stored as the app shows them**, macrons applied. That means a WRT correction becomes a row edit, not a change to `display-names.ts`. The overlay is still unconfirmed by WRT; say so in the onboarding sessions.
- **Content rows point at ledger rows with `on delete restrict`.** If a re-import would drop a site that has a pin, or a species with a profile, the load stops and someone decides. It never deletes staff work silently. Rows that drop out of the ledger are listed at the end of the load, not deleted.
- **Pins carry an optional `radius_m`.** That is the agreed "pin plus radius" model: no polygons, little CMS work. `precision` gains `surveyed` for pins staff place themselves.

Not stored: search keys (derived in the app from names and aliases), the species research batches and photo evidence files (inputs that produced the profiles), the discovery inventories, and the source workbook. The workbook must never go to Supabase.

## 4. Exporting and loading

```bash
# once: create the tables
supabase link --project-ref <ref>
supabase db push                                   # applies supabase/migrations/*

# each time the CSVs are regenerated
npx tsx scripts/export-supabase.ts                 # → supabase/export/*.csv + load.sql
psql "$SUPABASE_DB_URL" -f supabase/export/load.sql   # run from the repo root
```

`load.sql` runs in one transaction:
1. Upserts the dimensions: imports, seasons, species, places, parcels.
2. Deletes and reloads the facts: records, notes, reconciliation, aliases, headers, contested pairs.
3. Inserts content only where missing.
4. Lists stale places and parcels.

It takes under a second for 5,449 rows. `\copy` needs `psql` and the direct database connection string (Project Settings → Database), not the REST API.

The export reuses `loadFromDirectory()`, so places, parcels, slugs, macrons and themes come out exactly as the app builds them. If the generator's rules change, the database follows on the next export.

The Supabase dashboard's CSV import also works for a one-off load. Load the tables in the order above, because of the foreign keys.

## 5. Using it in the app

Write `lib/wrt/db/db-repository.ts` implementing `WrtRepository`, and switch to it in `getRepository()` (`lib/wrt/server.ts`) behind an env flag.

- **Read whole tables and build the domain objects in TypeScript.** At 5,449 rows this is cheap. `queries.ts`, `confirmedOnly()` and the chat tools then work unchanged. Do not port the aggregation to SQL yet.
- **Page past the 1,000-row limit.** Supabase's REST API returns at most 1,000 rows per request by default. Fetch records with `.range()` in pages, or read through a direct Postgres connection on the server.
- **Cache per data version.** Read the latest `imports.id`, keep the loaded objects until it changes, and show it in the footer so staff can see which data they are looking at.
- **Rebuild what the CSV loader derives:**
  - `Place.siteClasses`: classes ordered by plants, from records.
  - `Species.searchKeys` and `Species.aliases`: from names plus `species_aliases`.
  - `Species.contestedWith`: from `species_contested`.
  - `Parcel.id`: `wrt_site_number`, or `unnumbered-<part_slug>`.
  - `PlantingRecord.siteClass`: from the parcel.
- **Prove it with the existing tests.** Run `tests/` against both repositories in one parity test before switching. The local parity check in this report did the same for splits.
- **Swap `site-locations.ts` and the profile and photo modules** to read the content tables, so staff edits show without a redeploy.

Outside the app, the views are ready for the Supabase SQL editor, a Metabase-style dashboard, or a chat tool that wants SQL. Staff can edit pins and profiles straight in the table editor.

## 6. Open before production

1. **Write access.** RLS lets any signed-in user edit content tables. Add a staff role (or an allow-list of emails) before inviting anyone outside the team.
2. **Radius queries.** Plain lat/lng is enough to draw pins and circles. Add PostGIS and a `geography` column only when we need "which pins are within X m".
3. **Photos** are still hotlinked from Wikimedia and iNaturalist. Copy them to Supabase Storage if offline use or link rot matters.
4. **`workbook_sha256`** is not filled yet. Have the generator emit it so the data version traces back to the workbook, not only the CSVs.
5. **Living-document tables** (report 06 §3.3) come later and sit beside these; nothing here blocks them.
6. **Questions for WRT that change rows, not schema:** the Slope Hill HGF and Coronation columns, contested pairs, macron spellings, and whether Paper4Trees counts as a site. Each ruling is a regenerate-and-reload, and the data version moves.
