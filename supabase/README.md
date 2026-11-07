# Supabase database

The planting database: 9 tables, the totals views and the access rules. The model is described in the "WRT Planting Data Model" doc.

## Files

| File | What it does |
|---|---|
| `migrations/20261102000000_schema.sql` | Creates the 9 tables (sites, areas, species, seasons, plantings, planting_lines, questions, notes, users; `naming.sql` renames two of them), the edit trail, the totals views and the 25 seasons from Autumn 2015 to Autumn 2027 |
| `migrations/20261102000100_access_rules.sql` | Access rules: signed out sees nothing, signed in reads live rows, staff add and edit. Nobody deletes, makes anyone staff, changes seasons or creates spreadsheet-history rows from the app |
| `migrations/20261106000000_naming.sql` | Renames `plantings` to `planting_events`, `planting_lines.planting` to `planting_event`, and `retired_at` to `deactivated_at` on every table, with the functions, triggers, indexes and constraints that named them. No row changes. From James Bayly's review |
| `checks/schema_check.sql` | Checks everything the migrations create, that nothing still has an old name, and the imported row counts and season totals, and lists PASS or FAIL. Only reads |
| `checks/access_rules_check.sql` | Tries 16 things as signed out, volunteer and staff, and lists PASS or FAIL. Changes nothing |

## Where they have run

| Date | Project | Run |
|---|---|---|
| 2 November 2026 | hosted Supabase project | schema, then access rules, pasted into SQL Editor |
| 2 November 2026 | hosted Supabase project | `scripts/import-workbook.ts --write`: 39 sites, 78 areas, 164 species, 360 plantings, 5,449 lines, 1,377 notes. All 23 seasons match the workbook TOTAL cells |
| 2 November 2026 | hosted Supabase project | `checks/schema_check.sql` after the import: all 23 rows PASS |

The check has not been run yet. It needs a staff account, and sign-in isn't set up.

## Not here yet

- Sign-in. Until then, only the SQL Editor and the secret key reach the data.

## The workbook import

`scripts/import-workbook.ts` loads the history from `docs/planning/prototype/*.csv`: 39 sites, 78 areas, 164 species, 5,449 lines and 1,377 review notes. It needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`.

```bash
npm run import-workbook              # dry run: lists what would change, writes nothing
npm run import-workbook -- --write   # makes the changes
```

`tsx`, which runs the script, is a dev dependency pinned in `package-lock.json`. After `--write`, it reads each season's total back from the database and compares it with the workbook's TOTAL cell; every difference should be 0.

Running it again is safe. Rows match on slug, or spreadsheet code for lines, and only differences are written. It never touches descriptions, pins, profiles, photos or rulings, keeps notes a person wrote, and deactivates lines that leave the CSV.

## Running locally

With Docker running, start Supabase from the repository root:

```bash
npm run supabase:start
```

This uses the pinned Supabase CLI and the checked-in `config.toml`, with project ID `wrt-planting-app`. On a fresh local database, plain `supabase start` also applies every file in `supabase/migrations/` in timestamp order. The npm command additionally runs `migration up --local` to apply pending migrations to an existing database. Supabase records applied versions, so subsequent runs skip them and keep existing data. Each migration runs as one transaction; a failure rolls back that file and stops the command.

To apply new migrations while Supabase is already running, or stop it:

```bash
npm run db:migrate
npm run supabase:stop
```

Use `npm run supabase:start` for routine startup so pending migrations are always applied. Plain `supabase start` can reuse an existing database without applying new migrations. There is no automatic database reset in this flow.

Workbook history is a separate import. Before running `npm run import-workbook -- --write`, point `.env.local` at the **local** URL and secret/service-role key shown by the CLI. Starting Supabase creates the schema and seasons, but does not import the workbook.

If a stack started under the previous project ID is still occupying the local ports, stop it first, preserving its data:

```bash
supabase stop --project-id whakatipu-planting-records
```

## Running them on a hosted project

Hosted migrations deploy automatically through the Supabase GitHub integration. With **Deploy to production** enabled for the configured production branch, pushing or merging to that branch applies pending files from `supabase/migrations/` in timestamp order. Supabase tracks applied versions and skips migrations that have already run. No manual SQL Editor step, `db push`, or separate GitHub Action is needed for routine deployments.

Commit new migration files with the application changes that need them. Local startup only changes the local database; hosted migrations are applied by the Supabase integration when the production branch deploys.

The original hosted migrations were pasted into SQL Editor, so their versions may be missing from Supabase's migration history. If they have not already been reconciled, compare `migration list --linked` with the actual schema and use `migration repair --linked --status applied VERSION` only for migrations confirmed to have run before the first automated deployment. Do not replay the initial schema migration over existing tables.

See the [Supabase GitHub integration guide](https://supabase.com/docs/guides/deployment/branching/github-integration) and [CLI migration reference](https://supabase.com/docs/reference/cli/supabase-migration-up).

## Checking it all ran

Paste `checks/schema_check.sql` into SQL Editor. Every row should say PASS. It checks 6 fixed lists, 9 tables with row-level security on, 5 views, 5 indexes, the 25 seasons, 4 functions, 23 row rules, 16 triggers, the table privileges, and that no column, function, trigger, index, sequence or constraint still has a name `naming.sql` replaced. After the import, it also checks the row counts and that every season matches its workbook TOTAL cell. The import rows say FAIL until the import has run.
