# Supabase database

The planting database: 9 tables, the totals views and the access rules. The model is described in the "WRT Planting Data Model" doc.

## Files

| File | What it does |
|---|---|
| `migrations/20261102000000_schema.sql` | Creates the 9 tables (sites, areas, species, seasons, plantings, planting_lines, questions, notes, users; `naming.sql` renames two of them), the edit trail, the totals views and the 25 seasons from Autumn 2015 to Autumn 2027 |
| `migrations/20261102000100_access_rules.sql` | Access rules: signed in reads live rows, staff add and edit. Nobody deletes, makes anyone staff, changes seasons or creates spreadsheet-history rows from the app |
| `migrations/20261103000000_public_reads.sql` | Signed-out visitors read live rows and the totals views, the same as a signed-in volunteer. They can't write, and can't see `users` |
| `migrations/20261104000000_seasons_page.sql` | Adds year, half, workbook cell and review counts to the season totals, and the views `season_species`, `season_sites` and `totals_by_question` |
| `migrations/20261105000000_line_records.sql` | Adds each line's workbook file, sheet, original spellings, precision and confidence to `line_details` |
| `migrations/20261106000000_naming.sql` | Renames `plantings` to `planting_events`, `planting_lines.planting` to `planting_event`, and `retired_at` to `deactivated_at` on every table, with the functions, triggers, indexes and constraints that named them. No row changes |
| `checks/schema_check.sql` | Checks everything the migrations create, that nothing still has an old name, the imported row counts and pins, that every line has its workbook file, sheet and cell, and the season totals. Lists PASS or FAIL. Only reads |
| `checks/access_rules_check.sql` | Tries 17 things as signed out, volunteer and staff, and lists PASS or FAIL. Changes nothing |

## Where they have run

| Date | Project | Run |
|---|---|---|
| 2 November 2026 | hosted Supabase project | schema, then access rules, pasted into SQL Editor |
| 2 November 2026 | hosted Supabase project | `scripts/import-workbook.ts --write`: 39 sites, 78 areas, 164 species, 360 plantings, 5,449 lines, 1,377 notes. All 23 seasons match the workbook TOTAL cells |
| 2 November 2026 | hosted Supabase project | `checks/schema_check.sql` after the import: every row PASS. The check had fewer rows then; it has changed since |
| not recorded | hosted Supabase project | `public_reads.sql`, `seasons_page.sql` and `line_records.sql`, then the import again to fill the new line columns. Confirmed live on 5 November 2026: the public key reads the new views, and all 5,449 lines have their workbook file, sheet, cell and code |
| 4 November 2026 | hosted Supabase project | `scripts/import-pins.ts --write`: 50 pins set on 50 areas, each with its source link and checked date. A second dry run changes nothing |
| 5 November 2026 | hosted Supabase project | `checks/schema_check.sql`, read-only: 25 of 26 rows PASS. The notes row expected 1,377; the database has 1,339, the same as the CSV since the Slope Hill 2024 ruling. The check now expects 1,339. `import-workbook.ts` dry run: nothing to change |

`checks/access_rules_check.sql` has not been run. Its staff tests need a staff account, and sign-in isn't set up.

## Not here yet

- Sign-in. Until then, the public key reads live rows and nothing else, and only the SQL Editor and the secret key can write.

## The workbook import

`scripts/import-workbook.ts` loads the history from `docs/planning/prototype/*.csv`: 39 sites, 78 areas, 164 species, 5,449 lines and 1,339 review notes (1,377 before the Slope Hill 2024 ruling on 3 November cleared 38). It needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`.

```bash
npm run import-workbook              # dry run: lists what would change, writes nothing
npm run import-workbook -- --write   # makes the changes
```

`tsx`, which runs the script, is a dev dependency pinned in `package-lock.json`. After `--write`, it reads each season's total back from the database and compares it with the workbook's TOTAL cell; every difference should be 0.

Running it again is safe. Rows match on slug, or spreadsheet code for lines, and only differences are written. It never touches descriptions, pins, profiles, photos or rulings, keeps notes a person wrote, and retires lines that leave the CSV.

## The map pins

`scripts/import-pins.ts` copies the researched pins in `data/site-locations.json` onto their areas: latitude, longitude, the link the coordinates came from, and the date they were checked. Run it the same way: `npm run import-pins` for a dry run, then `npm run import-pins -- --write`.

A pin with a WRT number goes on that area of its site. A pin for a whole site goes on the site's area only when the site has just one. It fills empty pins only, so a pin someone has set or moved is never changed.

## Running them on a new project

Paste each migration into SQL Editor in order, or with the database connection string:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20261102000000_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20261102000100_access_rules.sql
psql "$DATABASE_URL" -f supabase/migrations/20261103000000_public_reads.sql
psql "$DATABASE_URL" -f supabase/migrations/20261104000000_seasons_page.sql
psql "$DATABASE_URL" -f supabase/migrations/20261105000000_line_records.sql
psql "$DATABASE_URL" -f supabase/migrations/20261106000000_naming.sql
```

Each file runs as one transaction, so a failure leaves nothing half-made.

## Checking it all ran

Paste `checks/schema_check.sql` into SQL Editor. Every row should say PASS. It checks 6 fixed lists, 9 tables with row-level security on, 8 views, 5 indexes, the 25 seasons, 4 functions, 31 row rules, 16 triggers, the table privileges, that signed-out visitors can't write or see `users`, and that no column, function, trigger, index or constraint still has a name `naming.sql` replaced. After the imports, it also checks the row counts, the 50 map pins, that every line has its workbook file, sheet and cell, and that every season matches its workbook TOTAL cell. The import rows say FAIL until the import has run.

## Testing on a local copy

A migration can be tried on a local Supabase in Docker before it goes near the hosted project:

```bash
npx supabase@2.121.0 init           # once: writes supabase/config.toml, which isn't committed
npx supabase@2.121.0 start          # first run downloads the images
npx supabase@2.121.0 db reset       # applies every file in migrations/, in order
npx supabase@2.121.0 status -o env  # the local URL and keys
```

Point the imports, tests and app at it by setting `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the local keys on the command line; values set there win over `.env.local`. Check it with `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/checks/schema_check.sql`, and stop it with `npx supabase@2.121.0 stop`.
