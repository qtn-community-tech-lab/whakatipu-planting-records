# Supabase database

The planting database: 9 tables, the totals views and the access rules. The model is described in the "WRT Planting Data Model" doc.

## Files

| File | What it does |
|---|---|
| `migrations/20261102000000_schema.sql` | Creates the 9 tables (sites, areas, species, seasons, plantings, planting_lines, questions, notes, users), the edit trail, the totals views and the 25 seasons from Autumn 2015 to Autumn 2027 |
| `migrations/20261102000100_access_rules.sql` | Access rules: signed out sees nothing (opened up by public_reads), signed in reads live rows, staff add and edit. Nobody deletes, makes anyone staff, changes seasons or creates spreadsheet-history rows from the app |
| `migrations/20261103000000_public_reads.sql` | Public reads: signed-out visitors read live rows of every table except users, and every totals view. Nobody signed out writes |
| `checks/schema_check.sql` | Checks everything both migrations create, and the imported row counts and season totals, and lists PASS or FAIL. Only reads |
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
npx tsx scripts/import-workbook.ts
```

That is a dry run: it lists what would be added or changed and writes nothing. Add `--write` to make the changes. It then reads each season's total back from the database and compares it with the workbook's TOTAL cell; every difference should be 0.

Running it again is safe. Rows match on slug, or spreadsheet code for lines, and only differences are written. It never touches descriptions, pins, profiles, photos or rulings, keeps notes a person wrote, and retires lines that leave the CSV.

## Running them on a new project

Paste each migration into SQL Editor in order, or with the database connection string:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20261102000000_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20261102000100_access_rules.sql
psql "$DATABASE_URL" -f supabase/migrations/20261103000000_public_reads.sql
```

Each file runs as one transaction, so a failure leaves nothing half-made.

## Checking it all ran

Paste `checks/schema_check.sql` into SQL Editor. Every row should say PASS. It checks 6 fixed lists, 9 tables with row-level security on, 5 views, 5 indexes, the 25 seasons, 4 functions, 31 row rules, 16 triggers and the table privileges, including what signed-out visitors can read. After the import, it also checks the row counts and that every season matches its workbook TOTAL cell. The import rows say FAIL until the import has run.
