# Queries

For: anyone building a screen on the planting database. Every read the app makes lives in this folder; writes are in `../usecases/`.

*Status: 22 October 2026. A code-only demo: no page calls these yet, and the database they read does not exist yet.*

## Purpose

The app talks to Supabase directly. There is no backend of our own in between.

- **Reads** are one flat query against a table or a view. Views do the joining in the database, so no screen writes a join.

| File | Covers |
|---|---|
| `species.ts` | the register, a species page with totals and history |
| `places.ts` | areas with their pins, the areas of one site, top sites |
| `plantings.ts` | lines by any filter, one event, season totals |
| `review.ts` | open questions |

## Calling them

A page reads on the server:

```tsx
// app/species/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSpecies } from "@/db/queries/species";

export default async function SpeciesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getSpecies(await createClient(), slug);
  if (!page) notFound();
  // page.species, page.totals, page.history
}
```

A form writes through a use case: see `../usecases/README.md`.

## Rules

- One query per function, flat. If a screen needs two tables, add a view to the SQL file and its row type to `db/types.ts`.
- Every total keeps its split: `plants`, `plants_resolved`, `plants_needs_review`.
- Nothing is deleted. Retiring sets `deactivated_at`.
- An unknown count is `null`, never 0.

## Next

1. Create the hosted project and set the two `NEXT_PUBLIC_SUPABASE_*` values from `.env.example`.
2. Run the schema SQL and the import.
3. Replace `db/types.ts` with `npx supabase gen types typescript --project-id <ref>`; the clients already take it.
4. Move pages from the CSV repository to these queries one at a time.
