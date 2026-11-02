# Supabase database

The planting database: 9 tables, the totals views and the access rules. The model is described in the "WRT Planting Data Model" doc.

## Files

| File | What it does |
|---|---|
| `migrations/20261102000000_schema.sql` | Creates the 9 tables (sites, areas, species, seasons, plantings, planting_lines, questions, notes, users), the edit trail, the totals views and the 25 seasons from Autumn 2015 to Autumn 2027 |
| `migrations/20261102000100_access_rules.sql` | Access rules: signed out sees nothing, signed in reads live rows, staff add and edit. Nobody deletes, makes anyone staff, changes seasons or creates spreadsheet-history rows from the app |
| `checks/schema_check.sql` | Checks everything both migrations create, and the imported row counts and season totals, and lists PASS or FAIL. Only reads |
| `checks/access_rules_check.sql` | Tries 16 things as signed out, volunteer and staff, and lists PASS or FAIL. Changes nothing |

## Where they have run

| Date | Project | Run |
|---|---|---|
| 2 November 2026 | hosted Supabase project | schema, then access rules, pasted into SQL Editor |
| 2 November 2026 | hosted Supabase project | `checks/schema_check.sql` after the import: all 23 rows PASS |

The check has not been run yet. It needs a staff account, and sign-in isn't set up.

## Not here yet

- The spreadsheet history (5,449 planting lines) and the reference data (sites, areas, species). Both come from an import script.
- Sign-in. Until then, only the SQL Editor and the secret key reach the data.

## Running them on a new project

Paste each migration into SQL Editor in order, or with the database connection string:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20261102000000_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20261102000100_access_rules.sql
```

Each file runs as one transaction, so a failure leaves nothing half-made.

## Checking it all ran

Paste `checks/schema_check.sql` into SQL Editor. Every row should say PASS. It checks 6 fixed lists, 9 tables with row-level security on, 5 views, 5 indexes, the 25 seasons, 4 functions, 23 row rules, 16 triggers and the table privileges. After the import, it also checks the row counts and that every season matches its workbook TOTAL cell. The import rows say FAIL until the import has run.
