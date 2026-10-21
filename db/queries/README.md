# Queries

For: anyone building a screen on the planting database. Every read and write the app makes lives in this folder.

*Status: written 22 October 2026. Not yet wired into pages: the app still reads the CSVs until a hosted project is set up and the import has run.*

## Purpose

The app talks to Supabase directly. There is no backend of our own in between.

- **Reads** are one flat query against a table or a view. Views do the joining in the database, so no screen writes a join.
- **Writes** are one update or insert. The access rules decide who may make them. The edit-trail trigger records who did.
- **Saving a planting day** is the one database function, `save_planting_day`, because an event and its lines must land together.

| File | Covers |
|---|---|
| `species.ts` | the register, a species page with totals and history, edits, retiring |
| `places.ts` | areas with their pins, the areas of one site, top sites, pins |
| `plantings.ts` | lines by any filter, one event, season totals, saving a planting day, editing one line |
| `review.ts` | open questions, recording a ruling, resolving a line |

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

A form writes through a server action:

```ts
// app/species/[slug]/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateSpecies } from "@/db/queries/species";

export async function saveSpecies(slug: string, changes: { common_name: string }) {
  const saved = await updateSpecies(await createClient(), slug, changes);
  if (!saved) return { error: "Species not found." };
  revalidatePath(`/species/${slug}`);
}
```

"Not found" is the page's wording. The database returns nothing for a row that is missing, retired or not yours to change, and the page decides what to say.

## Rules

- One query per function, flat. If a screen needs two tables, add a view in `db/schema/views.ts`.
- Every total keeps its split: `plants`, `plants_resolved`, `plants_needs_review`.
- Nothing is deleted. Retiring sets `deactivated_at`.
- An unknown count is `null`, never 0.

## Next

1. Create the hosted project and set the two `NEXT_PUBLIC_SUPABASE_*` values from `.env.example`.
2. Run the migrations and the import.
3. Generate types with `npx supabase gen types typescript --project-id <ref>` and pass them to the clients, so column names are checked.
4. Move pages from the CSV repository to these queries one at a time.
