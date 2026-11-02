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
| `import/workbook_history.sql` | The workbook history: 39 sites, 78 areas (50 with pins), 164 species, 5,449 lines and 1,377 review notes. Generated, don't edit by hand |

## Where they have run

| Date | Project | Run |
|---|---|---|
| 2 November 2026 | hosted Supabase project | schema, then access rules, pasted into SQL Editor |
| 2 November 2026 | hosted Supabase project | `checks/schema_check.sql` after the import: all 23 rows PASS |

The check has not been run yet. It needs a staff account, and sign-in isn't set up.

## Not here yet

- Sign-in. Until then, only the SQL Editor and the secret key reach the data.

## The workbook import

`import/workbook_history.sql` is built from `docs/planning/prototype/*.csv` and `data/*.json`:

```bash
npx tsx scripts/build-workbook-import.ts
```

Run it after the two migrations, in SQL Editor or with psql. It ends by listing each season against the workbook's TOTAL cell; every difference should be 0. Running it again is safe: rows match on slug or spreadsheet code, staff edits to descriptions, pins, profiles and photos are kept, notes a person wrote are kept, and lines that leave the CSV are retired, not deleted.

## Running them on a new project

Paste each migration into SQL Editor in order, or with the database connection string:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20261102000000_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20261102000100_access_rules.sql
psql "$DATABASE_URL" -f supabase/migrations/20261106000000_naming.sql
psql "$DATABASE_URL" -f supabase/import/workbook_history.sql
```

Each file runs as one transaction, so a failure leaves nothing half-made.

## Checking it all ran

Paste `checks/schema_check.sql` into SQL Editor. Every row should say PASS. It checks 6 fixed lists, 9 tables with row-level security on, 5 views, 5 indexes, the 25 seasons, 4 functions, 23 row rules, 16 triggers, the table privileges, and that no column, function, trigger, index, sequence or constraint still has a name `naming.sql` replaced. After the import, it also checks the row counts and that every season matches its workbook TOTAL cell. The import rows say FAIL until the import has run.
