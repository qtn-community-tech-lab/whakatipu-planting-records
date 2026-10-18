# 07 · WRT planting database (Supabase)

19 October 2026. Built against branch `z` at `a094f07`. Second draft: the first draft's 16 flat tables are replaced by a smaller relational model. An illustrated version lives in the "WRT Planting Database" artifact.

## The model

**A planting record says how many of one species went to one site area in one season.** Every other table describes one of those four things, or explains where a number came from.

Files:
- `supabase/migrations/20261019000000_wrt_schema.sql`: tables, views, access rules.
- `scripts/export-supabase.ts`: writes `supabase/export/*.csv` from the generated CSVs and `data/*.json`.
- `supabase/import.sql`: loads those CSVs in one transaction.

## Tables

From the workbook (refreshed by every import):

| Table | Rows | Links to | Holds |
|---|---:|---|---|
| `planting_records` | 5,449 | seasons, site_areas, species | code, quantity (empty for "TBC"), needs_review |
| `sites` | 39 | | slug, name, is_scheme (Paper4Trees) |
| `site_areas` | 78 | sites | slug, name, WRT site number, site class |
| `seasons` | 23 | | slug, year, Autumn/Spring, sort order, workbook TOTAL cell and value |
| `species` | 164 | | register names, status, over-5 m, both threatened marks, contested group (C1–C9), needs decision |
| `record_notes` | 1,501 | planting_records, review_topics | kind (ruling / confirm / fyi), text |

Written by staff (imports only add missing rows):

| Table | Rows | Links to | Holds |
|---|---:|---|---|
| `review_topics` | 9 | | the question, and WRT's decision, date and decider |
| `site_locations` | 50 | sites, optionally one site_area | lat, lng, **radius_m**, accuracy, sources |
| `species_profiles` | 95 | species (one each) | names, summary, look-for, sources, photo check |
| `species_photos` | 280 | species | image, credit, licence |

Source, in a separate `source` schema the API cannot see: `imports` (the data version), `record_sources` (workbook cell, names as typed, match confidence and precision), `site_spellings` (134 headers), `species_spellings` (728 spellings).

Views: `record_details` (records with everything joined), `totals_by_site`, `totals_by_species`, `totals_by_season`, `totals_by_review_topic`. Every total keeps the split: plants, plants resolved, plants needing review, records, records needing review.

## Decisions

- **Number ids for links, slugs for URLs.** Imports match rows on slug or record code, so ids stay the same between imports.
- **A record is seven columns.** Year, site and class come through its links. Workbook detail sits in `source.record_sources`.
- **Site class lives on the area.** All 78 areas have a single class across their records.
- **Contested species carry WRT's own group code** (C1–C9) instead of a pairs table.
- **A pin covers a whole site or one area.** No pin covers two, so one optional foreign key does it, and the database checks the area belongs to the pin's site.
- **Workbook totals sit on each season**; the five grand totals and the "TBC" exception sit on the import row.
- **Review topics are a table**, so WRT's rulings get recorded where the questions are.
- **Staff tables are protected.** Imports never change their rows, and a site, area or species they point at cannot be deleted.

## Loading

```bash
supabase link --project-ref <ref> && supabase db push      # once
npx tsx scripts/export-supabase.ts                          # each regeneration
psql "$SUPABASE_DB_URL" -f supabase/import.sql              # from the repo root
```

## Checked

On Postgres 16 with the real data: 140,068 plants, 44,290 needing review, 5,449 records, 667 needing review; Whitechapel 2019 = 2,105 (136); all 23 season totals match the workbook; all 157 site, species and season totals match the app's query layer; a second import changes nothing and keeps record ids; staff edits (a pin radius, a decision) survive it; signed-out users read nothing; the `source` schema is closed to signed-in users.

## Using it in the app

Write a `DbWrtRepository` that implements `WrtRepository`, reads the tables (paging past Supabase's 1,000-row default), and rebuilds the same domain objects, so `queries.ts`, the pages and the chat stay as they are. Run the existing tests against both repositories before switching.

## Before production

1. Limit editing of staff tables to a staff role; today any signed-in user can edit them.
2. Add PostGIS only when we need "pins within X m".
3. Copy reference photos to Supabase Storage if hotlinking becomes a problem.
4. Rulings from WRT (Slope Hill 2024, contested groups, macron spellings, Paper4Trees) change rows, not the schema.
