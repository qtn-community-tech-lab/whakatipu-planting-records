# Database

For: developers looking at how the app could move from the CSV files onto Supabase. A code-only demo, 22 October 2026: no SQL, no import, no Supabase project yet. The design and what was checked are in the pull request.

The app talks to Supabase directly through `@supabase/ssr`, as the signed-in person, so the database's access rules decide what they can read and change. There is no server of our own.

| Path | Holds |
|---|---|
| `types.ts` | The tables, views and function the app touches, as one `Database` type. Column names are checked against it. `supabase gen types` replaces it later. |
| `queries/` | Every read, one small flat function each: species, places, plantings, review. Views do the joining. |
| `usecases/` | Every write, one folder each. `types.ts` spells out what staff fill in and the zod check with its messages; `index.ts` saves it. |
| `content.ts` | Checks the pin, species profile and photo files in `data/` that the import will load. |

## Calling them

A page reads on the server; a form checks with the use case's schema, then writes through a server action.

```ts
const page = await getSpecies(await createClient(), slug);          // db/queries/species
const parsed = speciesChanges.safeParse(input);                     // db/usecases/edit-species
if (parsed.success) await updateSpecies(await createClient(), slug, parsed.data);
```

The database returns nothing for a row that is missing, retired or not yours to change; the page decides what to say.

## Rules

- A total always keeps its split: `plants`, `plants_resolved`, `plants_needs_review`.
- Nothing is deleted. Retiring sets `deactivated_at`.
- An unknown count is `null`, never 0.
- Saving a planting day is the one database function, `save_planting_day`, so an event and its lines land together.

## Next

1. One plain SQL file: the tables and views in `types.ts`, `is_staff()`, the edit-trail trigger and `save_planting_day`. The Drizzle version of all of it, with the access rules, is at commit 3751999 in `db/schema/`.
2. Create the project, run the file, replace `types.ts` with `supabase gen types`.
3. The import, against the Supabase client with the service key. The Drizzle version at 3751999 (`scripts/import-history.ts`) holds the area-slug and contested-group rules worth keeping.
4. Move pages to `queries/` and forms to `usecases/`, one at a time.
