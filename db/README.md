# Database reads

Every read from Supabase lives here. Pages call a query by name and get rows back.

| Path | Holds |
|---|---|
| `database.types.ts` | Every table, view and column, generated from the database. Never edit it: run `npm run db:types` |
| `types.ts` | `Db`, the client type every base query takes |
| `client.ts` | `db()`: one Supabase client per request, shared by the queries on a page |
| `queries/views.ts` | One base query per view or table: its columns and its usual order |
| `queries/sites.ts`, `species.ts`, `plantings.ts`, `review.ts` | The named reads pages call. Each adds a filter or a limit to a base query |

## Reading on a page

```ts
import { listSites } from "@/db/queries/sites";

const sites = await listSites();
```

| Query | Returns |
|---|---|
| `listSites()`, `topSites(limit)` | Sites with totals, most planted first |
| `listAreaTotals(site?)`, `listAreaPins(site?)` | Areas with totals, or with their map pins |
| `listSpecies()`, `rankSpecies()`, `getSpecies(slug)` | The register, species by plants, one species page |
| `listSeasons()`, `findLines(filter, page)` | Seasons in planting order, and planting lines 100 at a time |
| `listOpenQuestions()` | Questions WRT still has to answer, with their open notes |

## Rules

- Only `db/` imports Supabase. ESLint stops a page or component from doing it, so every read is in `queries/`.
- Column names are checked. `.select("…")` strings are typed against `database.types.ts`, so a wrong name fails `npm run build`.
- The database adds up. Totals come from the views with `plants`, `plants_confirmed` and `plants_needs_review`; no page sums lines.
- One request per read. A page that needs two things awaits two queries side by side.
- Supabase returns at most 1,000 rows a request, so unbounded reads page: `findLines` takes a page number.
- An unknown count is `null`, never 0.
- Queries stack one call per line, starting with `.from`. ESLint enforces it; `npx eslint --fix db` fixes it.

## After a migration

1. Run the migration in Supabase > SQL Editor, then `supabase/checks/schema_check.sql`.
2. `npx supabase login` once, then `npm run db:types`, and commit `database.types.ts` with the migration.
3. `npm test`. With `.env.local` filled in, `tests/db-reads.test.ts` runs every query against the project as a signed-out visitor.
