# Database

For: developers looking at how the app could move from the CSV files onto Supabase. A code-only demo, 22 October 2026: no SQL, no import, no Supabase project yet. The design and what was checked are in the pull request.

The app talks to Supabase directly through `@supabase/ssr`, as the signed-in person, so the database's access rules decide what they can read and change. There is no server of our own.

| Path | Holds |
|---|---|
| `types.ts` | Only the columns the app reads and writes, as one `Database` type the client checks names against. Writable columns come from the use cases. `supabase gen types` replaces it later. |
| `queries/` | Every read. `views.ts` has one base query per view (its columns and order); `sites.ts`, `species.ts`, `plantings.ts` and `review.ts` add a filter or a limit on top. |
| `usecases/` | Every write, one folder each. `types.ts` spells out what staff fill in and the zod check with its messages; `index.ts` saves it. |

## Calling them

A page reads on the server. A form shows messages with the use case's schema in the browser, then writes through a server action that passes the raw input on.

```ts
const page = await getSpecies(await createClient(), slug);          // db/queries/species
const saved = await updateSpecies(await createClient(), slug, input); // db/usecases/edit-species
if (!saved) return { error: "Species not found." };
```

Every use case parses its own input and throws on anything its form would reject, so the check can't be skipped. Every write returns the changed row, or null when it is missing, retired or not yours to change; the page decides what to say.

## Words

| Word | Means | Was also called |
|---|---|---|
| site | A place people plant: Lake Hayes, Whitechapel | place |
| area | A part of a site as WRT registers it, with its site number. Screens say "part" | parcel, part |
| pin | A site's or an area's map marker, with an optional radius | location, site_location |
| season | Autumn or Spring of one year | |
| event | One area, one season, and for new ones one day | planting day |
| line | How many of one species went in on one event | record |
| split | plants = resolved + needing review. Every total keeps it | |

## Rules

- Queries stack one call per line, like parameters, starting with `.from` under `db`. The linter enforces every line after the first; `npx eslint --fix db` fixes them.
- A total always keeps its split: `plants`, `plants_resolved`, `plants_needs_review`.
- Nothing is deleted. Retiring sets `deactivated_at`, once: retiring again returns null and keeps the first date.
- Views hide retired rows. Tables don't, so staff can still see them; a query that reads a table filters `deactivated_at` itself, as `listSpecies` does.
- `needs_review` is never written. Views work it out from the line's notes: a line needs review while any ruling or confirm note on it is unresolved. Answering a question resolves its notes, not its lines.
- An unknown count is `null`, never 0.
- Supabase returns at most 1,000 rows a request, so unbounded reads page: `findLines` takes a page number.
- Saving a planting day is the one database function, `save_planting_day`, so an event and its lines land together. It takes the form as one argument, `day`.

## Next

1. One plain SQL file: the tables and views in `types.ts`, `is_staff()`, the edit-trail trigger, `save_planting_day` and `answer_review_question`. Notes get a `resolved_at`; `needs_review` moves from a stored column on lines to the views. Views filter `deactivated_at is null`; the staff access rules on tables don't. The Drizzle version of the rest, with the access rules, is at commit 3751999 in `db/schema/`.
2. Create the project, run the file, replace `types.ts` with `supabase gen types`. Then flip the direction: each use case's type `satisfies` the generated `Update` type, instead of `types.ts` importing from the use cases. The generated `Insert` types also check required columns, which `Partial<Row>` here does not.
3. Session refresh: `@supabase/ssr` needs `proxy.ts` (Next 16's name for middleware) to refresh the sign-in on each request, or server components start seeing expired sessions.
4. Creating a pin and restoring a retired row. Today `place-pin` only moves and retires a pin, and nothing sets `deactivated_at` back to null.
5. The import, against the Supabase client with the service key. The Drizzle version at 3751999 (`scripts/import-history.ts`) holds the area-slug and contested-group rules worth keeping.
6. Move pages to `queries/` and forms to `usecases/`, one at a time.
