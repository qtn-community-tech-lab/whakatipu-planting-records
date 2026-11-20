# Seed and reference data

`npm run import-historical-seed-data` uses these maintained JSON files:

| File | Contents |
| --- | --- |
| `sites.json` | 41 sites |
| `site_areas.json` | 75 areas, including map pins and source links |
| `species.json` | 93 species with canonical names, reference content, photos and attribution |
| `seasons.json` | 28 seasons, Autumn 2015–Spring 2028; future workbook totals are null |
| `plantings.json` | 358 events with nested `lines` and each line's review `notes` |

Review question definitions come from [`lib/wrt/review-themes.ts`](../lib/wrt/review-themes.ts). No CSVs are read by the seed command. Legacy workbook parsing helpers remain for source analysis and tests.

The app reads species content, photos, attribution and source links from Supabase after seeding. Reference and photo counts use those saved fields. Local species photos live in `public/species/{slug}.webp` and use root-relative paths in `species.json`.

## Relationships and IDs

Sites, areas, species and questions use slugs. Planting events reference seasons by slug in JSON; the importer resolves the saved season ID. `seasons.json` supplies explicit season IDs for new rows and matches existing seasons by slug.

Event, line and note IDs are omitted from `plantings.json`. PostgreSQL generates them on insert, and the importer uses returned IDs to link children. Each line retains a unique workbook `legacy_code`. Event `notes` is free text; line `notes` is an array of review notes.

Audit fields are excluded during import so database triggers assign them. Deactivation state, resolved dates and provenance are retained. Existing rows are skipped, including previously edited rows; changing a seed does not update them.

See [import commands and matching rules](../supabase/README.md#historical-seed-import). Use `npm run import-historical-seed-data` to validate all seeds and preview missing rows against the configured database.
