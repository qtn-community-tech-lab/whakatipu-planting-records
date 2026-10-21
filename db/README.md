# Database

For: developers looking at how the app could move from the CSV files onto Supabase.

*Status: 22 October 2026. A code-only demo. The schema is written in TypeScript and the queries are written, but there is no SQL yet and no Supabase project. One plain SQL file comes next.*

## Purpose

One hosted Supabase project would hold the planting history and take new planting days. The app would talk to it directly with the Supabase client. There is no server of our own and no Docker.

| Folder | What is in it |
|---|---|
| `schema/` | Every table, view and access rule, written in TypeScript |
| `queries/` | Every read and write the app would make, one small function each. See `queries/README.md` |
| `zod.ts` | Form checks for the tables, including the planting-day form |
| `content.ts` | Checks the map pin, species profile and photo files before the import uses them |
| `../scripts/import-history.ts` | Loads the 5,449 records and builds the new layer from them |

## Two layers

- **`legacy`** keeps the five ledger files as they came out of the spreadsheets. Only the import writes to it. Staff can read it; the public never sees it.
- **`public`** is what the app reads and staff edit: sites, areas, pins, species, seasons, planting events and lines, review questions and notes.

History and new planting days share the same tables. A history event has a season but no date or type, because the workbook never recorded them. A new event must have a date. Every history line keeps `legacy_code`, a link to the row it came from, and through it the workbook, sheet and cell.

## Rules the database will keep

| Rule | Kept by |
|---|---|
| A new event needs a date; a history event does not | a check on `planting_events` |
| One line per species per event | a unique index on active lines |
| A count is never negative; an unknown count is empty, never 0 | a check on `planting_lines` |
| Signed-out visitors see only published rows | access rules |
| Only staff can write | access rules, through `is_staff()` |
| Who changed each row, and when | an edit-trail trigger |
| Nothing is deleted | `deactivated_at`; retired rows drop out of every view |
| An event and its lines are saved together | the `save_planting_day` function |

## Next

1. Write the schema as one plain SQL file, including `is_staff()`, the edit-trail trigger and `save_planting_day`.
2. Create the Supabase project and run that file in its SQL editor.
3. Load the history with the import.
4. Move pages from the CSV files to `db/queries/`, one at a time.
