# 07 · WRT database: the old layer and the new one

*Status, 22 October 2026: the demo pull request has dropped Drizzle. The app talks to Supabase through `@supabase/ssr` only, and `db/types.ts` describes the tables and views by hand until `supabase gen types` replaces it. The Drizzle schema, migrations and import described below are in git history at 3751999; one plain SQL file replaces them next.*

19 October 2026. Third draft. The schema is now declared once, in TypeScript with Drizzle (`db/schema/`). Migrations, row types and zod schemas are all generated from that declaration. Supabase provides the database, sign-in and access rules.

## Two layers

**`legacy` schema: the old.** The five CSVs generated from the Plants Out Master, loaded as they are, one table per file: `planting_history`, `species_register`, `species_crosswalk`, `site_crosswalk` and `reconciliation`, plus an `imports` row whose id is the data version. Only the import writes here. Staff can read it; the app's API never sees it.

**`public` schema: the new, designed model.** Built from the old layer, and the place new data goes.

| Table | Holds |
|---|---|
| `sites` | Lake Hayes, Whitechapel… Paper4Trees flagged as a scheme. Description and `is_public` for staff |
| `site_areas` | Parts of a site: WRT site number, class (keystone / community / school) |
| `site_locations` | One pin per site or per area, with an optional `radius_m` |
| `species` | WRT's register: Māori and common names, over-5 m, both threatened marks, contested group C1–C9 |
| `species_profiles`, `species_photos` | Write-ups and reference photos with licence credit |
| `seasons` | Autumn / Spring per year, with the workbook's TOTAL cell for checking |
| `planting_events` | One site area, one season, and for new events one date. `source` = `workbook` or `app` |
| `planting_lines` | How many of one species in an event. History lines keep `legacy_code`, a foreign key to their legacy row |
| `line_notes` | Why a line needs review, filed under a topic |
| `review_topics` | The questions WRT must answer, and their decisions |
| `profiles` | Staff and other signed-in people, linked to Supabase Auth |

Views: `line_details`, `totals_by_site`, `totals_by_species`, `totals_by_season`, `totals_by_review_topic`. Every total keeps the split: plants, plants resolved, plants needing review.

## How history fits the new model

History becomes 360 events (one per area per season) holding 5,449 lines. History events have no date and no type, because the workbook never recorded them. New events must have a date (a database check). Each history line points at the legacy row it came from, and that row can't be deleted while a line uses it.

Example: Whitechapel Reserve, Autumn 2019 is one event with 25 lines and 1,005 plants.

## Rules, and where each is enforced

| Rule | Where |
|---|---|
| New events need a date; history doesn't | Postgres check |
| One line per species per event; no negative quantities; unknown quantity is empty, never 0 | Postgres unique index and check |
| One pin per site and per area; a pin's area belongs to its site | Partial unique indexes; composite foreign key |
| Signed out: published records and the species list only | Access rules (RLS) |
| Staff read and write everything; nobody deletes, they deactivate | Access rules + `deactivated_at` |
| Who changed what, and when | `created_by` default + trigger on every editable table |
| Forms: real dates, each species once, at least one species | zod (`db/usecases/*/types.ts`, one file per form) |
| Content files are well formed; CC BY photos credit the author | zod (`db/content.ts`), checked by the import and by tests |

## Commands

```bash
npm run db:generate    # after changing db/schema/*: writes the next migration
npm run db:migrate     # applies migrations (DATABASE_URL in .env, see .env.example)
npm run db:import      # refreshes legacy from the CSVs and builds the new layer on it
```

The import runs in one transaction:
1. It replaces the legacy tables.
2. It updates the new layer, matched on slugs and record codes, so ids stay the same.
3. It adds missing pins, profiles and photos, and never overwrites what staff changed.

Sites or areas that lose all their history are reported, not deleted.

Drizzle owns the migrations; don't also make schema changes with the Supabase CLI. Server code connects through Drizzle as the database owner, so access rules don't apply there and the server must check the signed-in user itself. The browser uses supabase-js, where the rules do apply.

## Checked (Postgres 16, Supabase roles and auth stubbed)

- **Migrations:** applied with `drizzle-kit migrate`, building 18 tables, 49 access rules, 10 edit-trail triggers and 5 views. `drizzle-kit generate` reports no drift.
- **Totals:** 140,068 plants, 44,290 needing review, 5,449 lines. All 157 site, species and season totals match the app's query layer exactly.
- **Legacy link:** every line matches its legacy row, with the same quantity and review flag.
- **Re-import:** line ids stay the same. A pin radius, a site description, its public flag and a WRT decision all survive.
- **Access:**
  - Signed out: sees only published sites and the species list.
  - Volunteer: sees the same, cannot write, and cannot see review topics or legacy rows.
  - Staff: sees everything, and their writes are stamped with their id.
- **Refusals:** a new event with no date, the same species twice, a negative quantity, a pin on another site's area, a second whole-site pin, and deleting a legacy row a line points at.
- **Tests:** 202 pass, including 9 new zod tests that also check all four content files.

## Next

1. A `DbWrtRepository` that reads `line_details` through Drizzle and returns the app's existing domain objects, run against the current tests.
2. Staff sign-in (Supabase magic links, invite-only) and a planting-day form using `plantingDayForm`.
3. A real Supabase project: `db:migrate`, then `db:import`.
