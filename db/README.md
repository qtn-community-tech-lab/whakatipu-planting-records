# Database

For: developers looking at how the app could move from the CSV files onto Supabase.

*Status: 22 October 2026. A code-only demo. The app side is written: the shape of the data, the reads and the writes. There is no SQL yet, no import and no Supabase project. One plain SQL file comes next.*

## Purpose

One hosted Supabase project would hold the planting history and take new planting days. The app would talk to it directly with the Supabase client. There is no server of our own and no Docker.

| Folder | What is in it |
|---|---|
| `types.ts` | The tables, views and function the app touches, as one `Database` type the Supabase client checks column names against |
| `queries/` | Every read the app would make, one small function each. See `queries/README.md` |
| `usecases/` | Every write, one folder each: what staff fill in (`types.ts`) and the save (`index.ts`). See `usecases/README.md` |
| `content.ts` | Checks the map pin, species profile and photo files the import will load |

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

1. Write the schema as one plain SQL file: the tables in `types.ts`, the views, `is_staff()`, the edit-trail trigger and `save_planting_day`. The Drizzle version of all of it is in git history at 3751999 (`db/schema/`), views and access rules included.
2. Create the Supabase project, run that file in its SQL editor, and replace `types.ts` with `supabase gen types`.
3. Write the import against the Supabase client with the service key. The Drizzle version is at 3751999 (`scripts/import-history.ts`): it holds the area-slug and contested-group rules worth keeping.
4. Move pages from the CSV files to `db/queries/` and forms to `db/usecases/`, one at a time.
