# James's review fixes (#2, #4, #5)

Branch `james-review-fixes`, local only: nothing pushed, nothing posted, and nothing written to the hosted Supabase project.

**Status: done and tested on a local Supabase in Docker.** Every check passes. The migration was also applied to a database already loaded with the old schema and data, the way it will run on the hosted project, and all 8 views returned exactly the same rows afterwards.

The first attempt stalled: the Mac's disk was 99% full, Docker's image store returned I/O errors, and Docker Desktop froze. After some space was freed, Kyle chose to force-restart Docker. It came back with its images intact and no containers lost (there were none).

## Commits

| Commit | What |
|---|---|
| `847ff9b` | Audit fixes, live-env helper for tests, and the map pins import (the uncommitted work from `supabase-map-pins`) |
| `5d5a0c9` | `supabase/config.toml` from `supabase init`, for a local copy in Docker |
| `c4219ba` | Query names follow list/read/create/update/deactivate; `PAGE_SIZE` 1,000; the rule in `CLAUDE.md` |
| `7b193ef` | `npm run import-workbook` / `import-pins`, `tsx` 4.23.15 pinned as a dev dependency |
| `63a6a80` | `20261106000000_naming.sql`: `planting_events`, `planting_event`, `deactivated_at`, and everything that names them |
| `6b967dc` | `database.types.ts` generated from the local database; the import report's column fits the longer labels |

## 1. James's comments and what was done

### #2: queries

| Comment | Done |
|---|---|
| `PAGE_SIZE` 100: why not 1,000? | **Changed** (`c4219ba`). 1,000 is the most Supabase returns in one request. |
| `findLines` → `findPlantingLines` | **Changed** (`c4219ba`). |
| `topSites` is `listSites` with a limit | **Changed** (`c4219ba`): `listSites(limit?)`. |
| `listAreaTotals` → `listPlantingAreas` | **Changed** (`c4219ba`), as `listPlantingAreaTotals`, because it returns totals, not the areas themselves. `listAreaPins` → `listPlantingAreaPins` to match. |
| Use `.ilike()` instead of `.eq()` | **Kept** `.eq()`. These filters match slugs from the URL (`/sites/[slug]`), not text someone types. A case-insensitive match on a slug could only find the wrong row. |
| Remove unused write functions (`db/usecases/edit-species`) | **Already there**: `db/usecases/` no longer exists. Only reads remain. |
| Schema issues, see #4 | See #4. |
| Standard query names: `list<Entity>s`, `read<Entity>`, `create`, `update`, `deactivate` | **Changed** (`c4219ba`): `getSpecies` → `readSpecies`, `getQuestionTotals` → `readQuestionTotals`, `rankSpecies` → `listSpeciesTotals`. |
| Add it to claude.md | **Changed** (`c4219ba`): `CLAUDE.md`, under `@AGENTS.md`. `next dev` rewrites `AGENTS.md`, so the rule can't go there. |

### #4: schema

| Request | Done |
|---|---|
| 1. `Plantings` → `PlantingEvents` | **Changed** (`63a6a80`): table `planting_events`, column `planting_lines.planting_event`, their index, sequence and constraints. |
| 2. Locations table (point or polygon GeoJSON), `areas.location_id`, optional `planting_lines.location_id` | **Deferred.** It changes how pins are stored and imported. It belongs in its own PR, after the renames are agreed. |
| 3. `species.common_name` and `description` | `common_name`: **already there**. `description`: **deferred**. |
| 4. `seasons.half` → `seasons.name` | **Kept.** `seasons.label` ("Autumn 2019") is already the name. `half` is the enum `autumn`/`spring` that `label` is built from. |
| 5. `sites.description` | **Already there** (`20261102000000_schema.sql`). |
| 6. `areas.name` and `description` | **Already there.** |
| 7. Remove `users.is_staff`, add a unique `email` | **Deferred**, with sign-in. `is_staff()` and every staff rule read it today. Supabase already keeps a unique email in `auth.users`. |
| Base interface: `id, created_by, created_at, updated_by, updated_at, deactivated_at` | **Partly changed** (`63a6a80`): `retired_at` → `deactivated_at` everywhere, including `users`. The 7 history tables already have `created_by`, `created_at`, `updated_by` and `updated_at`. Sites, areas, species and questions are keyed by slug, not `id`: see IDs below. **Kept**: generated types (`db/database.types.ts`), not hand-written interfaces in `types.ts`. Hand-written types drift from the database without anyone noticing; generated ones fail `tsc` instead. |
| IDs: prefixed object IDs, not slugs or UUIDs | **Deferred.** It touches every table, foreign key and URL, so it needs its own PR and a migration plan for the live rows. |

### #5: import

| Comment | Done |
|---|---|
| Add to package.json, make `tsx` a dev dependency, document `npm run import-workbook` and `npm run import-workbook -- --write` | **Changed** (`7b193ef`), for the pins import too. The one `npx tsx` left is in a comment in `20261105000000_line_records.sql`. It stays because existing migrations are never edited. |
| Resolve #4 first | See #4. |

## 2. The migration (`supabase/migrations/20261106000000_naming.sql`)

One transaction:

- `plantings` → `planting_events`; `planting_lines.planting` → `planting_event`.
- `plantings_season_idx` → `planting_events_season_idx`, `one_workbook_planting_per_area_season` → `one_workbook_planting_event_per_area_season`, `plantings_id_seq` → `planting_events_id_seq`. Every constraint named `plantings_*`, and `planting_lines_planting_fkey`, are renamed too.
- `retired_at` → `deactivated_at` on `users`, `sites`, `areas`, `species`, `planting_events`, `planting_lines`, `questions` and `notes`.
- `is_staff()` and `guard_history()` are rewritten with `create or replace`, which keeps their grants, `security definer` and `search_path = ''`. `guard_retired()` is renamed to `guard_deactivated()` (a rename keeps its grant and the triggers that call it) and then rewritten. Its 7 triggers are renamed `guard_deactivated`. The message is now "Deactivated rows can only be restored by an administrator" (still error 42501).
- Views, row rules, index conditions and foreign keys follow the renames by themselves. No row changes.

## 3. Results, on a local Supabase (CLI 2.121.0, Postgres 17)

**Before the rename** (commit `7b193ef`, five migrations, old code):

| Check | Result |
|---|---|
| `import-workbook --write` | 39 sites, 78 areas, 164 species, 9 questions, 360 plantings, 5,449 lines, 1,339 notes; all 23 seasons match the workbook |
| `import-pins --write` | 50 pins on 78 live areas |
| `schema_check.sql` | 26 of 26 PASS |

**The migration on that loaded database**, as SQL Editor will run it on the hosted project:

| Check | Result |
|---|---|
| Applying `20261106000000_naming.sql` | committed with no errors |
| Row counts of the 8 views | unchanged: line_details 5,449, season_sites 282, season_species 1,326, totals_by_area 78, totals_by_question 7, totals_by_season 25, totals_by_site 39, totals_by_species 95 |
| Contents of the 8 views (an md5 of every row) | identical before and after |
| `pg_get_viewdef` | differs only where it names `planting_events`, `planting_event` and `deactivated_at` |
| Functions | `is_staff` still security definer; all 4 keep `search_path = ''` and the `authenticated` grant |
| `schema_check.sql` (new) | 29 of 29 PASS |
| `access_rules_check.sql`, with a temporary local staff user, removed afterwards | 17 of 17 PASS, including "reactivate it: blocked" (the renamed guard) and "add a spreadsheet planting event: blocked". It is the first time all 17 have run: the hosted project has no staff account |

**From scratch with the new code** (`db reset`, all six migrations):

| Check | Result |
|---|---|
| `npm run import-workbook -- --write` | the same counts, written to `planting_events`; all 23 seasons match the workbook |
| `npm run import-pins -- --write` | 50 pins |
| Both dry runs | nothing to change |
| `schema_check.sql` | 29 of 29 PASS: 360 planting events, 5,449 lines, 1,339 notes, 50 pins, 8 `deactivated_at` columns, 0 old names |
| `supabase gen types --local` | differs from the hand edit only in field order; committed |
| `npx tsc --noEmit` | passes |
| `npm test`, local URL and publishable key | 237 of 237 passed, none skipped; the public key gets 42501 on every write |
| `npx eslint` (repo, excluding `.claude/`) | 13 errors, all the known ones in `components/ui/map.tsx` |
| `npm run build` | passes; 201 pages |
| `next start` on local data | home, /seasons, /sites/arrow-morven, /species/aristotelia-fruticosa and /records return 200; home, /seasons and /records show 140,068 plants |

## 4. Found along the way, not changed

- The trigger functions `guard_deactivated`, `guard_history` and `touch_row` can be executed by PUBLIC, not only by `authenticated`. `access_rules.sql` tries to stop this with `alter default privileges ... in schema public revoke ... from public`, but a default set for one schema can only add rights, never remove the built-in PUBLIC execute. A test function created the same way gets the same rights, so this predates the rename and the migration doesn't change it. It's harmless for trigger functions, which can't be called directly. A later migration could `revoke execute ... from public` to make the rights match what the file says.

## 5. Decisions made without asking

- `rankSpecies` → `listSpeciesTotals`: it lists rows of `totals_by_species`, like `listPlantingAreaTotals`.
- `listSeasonLeaders`, `listSeasonLines`, `listSeasons`, `listSpecies` and `listOpenQuestions` already fit the rule, so they keep their names.
- `findPlantingLines` keeps James's name, though it doesn't fit `list`/`read`. `CLAUDE.md` names it as the one exception: it pages through lines that match a filter.
- The rule covers `db/queries/` only. The CSV repository's methods (`lib/wrt/`) are another layer, so they are unchanged.
- The migration also renames the identity sequence and the constraints named after `plantings`, so no name in the schema still says "plantings". James didn't ask for this.
- `guard_history`'s message is now "Spreadsheet planting events come from the import only".
- In `access_rules_check.sql`, the tests "retire it" and "un-retire it" are now "deactivate it" and "reactivate it".
- `schema_check.sql` has two new "naming" rows (8 `deactivated_at` columns, and 0 old names left) and a row for the 50 map pins.
- `supabase/README.md`'s history table keeps the old names, because it records what ran at the time.
- `supabase start` runs without Studio, storage, realtime, edge functions, logs and mail (`-x ...`): the tests need only the database, the API, auth and postgres-meta, and the disk was nearly full.
- `supabase/README.md` gains a short "Testing on a local copy" section.
- The import report's label column is 30 characters wide, so `planting_lines (deactivated)` lines up.

## 6. Applying it to the hosted project, once James agrees

The app must ship together with the migration. The deployed code reads `plantings` and `retired_at`, and those names stop existing the moment the migration runs.

1. Merge the branch, but don't deploy yet.
2. Supabase → SQL Editor: paste `supabase/migrations/20261106000000_naming.sql` and run it.
3. Paste `supabase/checks/schema_check.sql` and run it: every row PASS.
4. `npm run db:types`. It should change nothing; if it does, commit the result.
5. Redeploy the app right away, then open home, /seasons and /records.
6. Add a row to the table in `supabase/README.md` under "Where they have run".

## 7. Draft replies

**#2:** Thanks James. `PAGE_SIZE` is 1,000 now, and the queries follow `list`/`read`/`create`/`update`/`deactivate`: `findPlantingLines`, `listSites(limit?)`, `listPlantingAreaTotals`, `listPlantingAreaPins`, `readSpecies`, `readQuestionTotals`, `listSpeciesTotals`. The rule is in CLAUDE.md. The unused write functions were already gone. I've kept `.eq()`: these match slugs from the URL, not text anyone types, so a case-insensitive match could only return the wrong row.

**#4:** Done in a new migration, `20261106000000_naming.sql`: `plantings` → `planting_events` (and `planting_lines.planting_event`), and `retired_at` → `deactivated_at` on every table, with the functions and triggers that named them. `species.common_name`, `sites.description` and `areas.name`/`description` were already there. I'd like to keep `seasons.half`: `label` is already the name, and `half` is the autumn/spring value it's built from. I'd also keep generated types over hand-written interfaces, because they fail `tsc` when the schema changes instead of drifting. Locations, prefixed IDs, `species.description` and the `users` changes are bigger, so I'd do each in its own PR once this is agreed. It's tested on a local copy, including run on top of the old schema with all the data: every view returns exactly the same rows. The hosted project stays untouched until you're happy with it.

**#5:** Done: `tsx` is a pinned dev dependency, and the docs use `npm run import-workbook` and `npm run import-workbook -- --write`, the same for `import-pins`.
