# Use cases

For: anyone building a form on the planting database. Every write the app makes is one of these folders.

*Status: 22 October 2026. A code-only demo: no page calls these yet, and the database they write to does not exist yet.*

Each folder is one thing staff do. Two files:

| File | Holds |
|---|---|
| `types.ts` | the shape of what staff fill in, written out as an interface, and the zod check with its messages. Change a field or a message here. |
| `index.ts` | the write itself: one update, insert or database function. It takes the typed input and maps it to columns. |

| Folder | Staff can |
|---|---|
| `record-planting-day/` | record a day (the event and its species lines land together), then add, correct or retire one line |
| `edit-species/` | change a species' names and flags, or retire it |
| `place-pin/` | move a map pin, set its radius, or retire it |
| `answer-review-question/` | write WRT's ruling on an open question, then resolve the lines under it |

Reads live in `../queries/`.

## Calling one

A form checks on the client with the schema from `types.ts`, then writes through a server action:

```ts
// app/species/[slug]/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { speciesChanges, updateSpecies } from "@/db/usecases/edit-species";

export async function saveSpecies(slug: string, input: unknown) {
  const parsed = speciesChanges.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const saved = await updateSpecies(await createClient(), slug, parsed.data);
  if (!saved) return { error: "Species not found." };
  revalidatePath(`/species/${slug}`);
}
```

The database returns nothing for a row that is missing, retired or not yours to change; the page decides what to say.

## Rules

- The interface in `types.ts` is the contract. The zod schema `satisfies` it, so the two cannot drift from each other.
- The database keeps the same limits (a date on new events, no negative counts, one line per species), so a write that skips the form is still checked.
- Nothing is deleted. Retiring sets `deactivated_at`.
- An unknown count is `null`, never 0.
