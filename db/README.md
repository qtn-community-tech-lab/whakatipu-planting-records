# Database

For: whoever sets up the Supabase project or changes the schema. Everyone else only needs the project URL and publishable key in `.env.local`.

*Status: 22 October 2026. Schema, import, queries and the save function are written and tested on real Postgres. No hosted project exists yet.*

## Purpose

One hosted Supabase project holds the planting history and takes new planting days. The app talks to it directly with the Supabase client. There is no server of our own and no Docker.

| Folder | What is in it |
|---|---|
| `schema/` | Every table, view and access rule, declared once in Drizzle |
| `migrations/` | SQL generated from `schema/`, plus three hand-written files: the staff check, the edit trail and the save function |
| `queries/` | Every read and write the app makes, one small function each. See `queries/README.md` |
| `zod.ts` | Form checks generated from the tables |
| `content.ts` | Checks the map pin, species profile and photo files before the import uses them |

## Two layers

- **`legacy`** keeps the five ledger files as they came out of the spreadsheets. Only the import writes to it. Staff can read it; the public never sees it.
- **`public`** is what the app reads and staff edit: sites, areas, pins, species, seasons, planting events and lines, review questions and notes.

History and new planting days share the same tables. A history event has a season but no date or type, because the workbook never recorded them. A new event must have a date; the database refuses one without. Every history line keeps `legacy_code`, a link to the row it came from, and through it the workbook, sheet and cell.

## Setting up a project

Do this once.

1. Create a project in the Supabase dashboard. The free tier is enough.
2. From the project's settings, copy the database connection string, the project URL and the publishable key into `.env.local` (see `.env.example`).
3. Create everything and load the history:

```bash
export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
npm run db:migrate     # tables, views, access rules, edit trail, save function
npm run db:import      # the 5,449 records, then the new layer built from them
```

4. In the dashboard, add staff: create their sign-in accounts, then set `is_staff` on their row in `profiles`.

The connection string can do anything to the database. Keep it on your own machine and never in the browser or the repo. The app only uses the URL and the publishable key, and the access rules decide what each person sees.

Running the import again is safe. It keeps every id, keeps every edit staff have made, and adds pins, profiles and photos only where they are missing.

## Changing the schema

```bash
# 1. edit db/schema/*.ts
npm run db:generate    # writes a new SQL file in db/migrations/; read it before going on
npm test               # runs every migration on real Postgres in-process
npm run db:migrate     # applies it to the project
```

Never edit an applied migration; add a new one. Never change tables in the dashboard either: the repo would no longer match the database.

## Rules the database keeps

| Rule | Kept by |
|---|---|
| A new event needs a date; a history event does not | check on `planting_events` |
| One line per species per event | unique index on active lines |
| A count is never negative; an unknown count is empty, never 0 | check on `planting_lines` |
| Signed-out visitors see only published rows | access rules |
| Only staff can write | access rules, through `is_staff()` |
| Who changed each row, and when | the edit-trail trigger |
| Nothing is deleted | `deactivated_at`; retired rows drop out of every view |

## Next

1. Create the hosted project and run the setup above.
2. Generate typed clients: `npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts`.
3. Move pages from the CSV files to `db/queries/`, one at a time.
