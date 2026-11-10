<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Screenshots in pull requests

Any PR that changes what someone sees includes screenshots. Take them yourself, so
the people reviewing or reusing the work can see what's there without reading the code.

- Show each screen or state you changed, on desktop (1280px wide) and phone (390px).
- If the PR adds or changes a shared part (`components/ui`, `components/forms`), add one
  sheet with each part in its own card: its name, one line on what it's for, and its real
  states (filled, empty, with a hint, with an error, turned off). Use labels from our real
  forms. Build the sheet on a temporary page and delete it before committing.
- Upload the images through the GitHub comment box and put them in a table in the PR
  description.
- If nothing visual changed, write "Not applicable: no visual change."

## Form input validation

When adding or changing forms, reuse the string limits in `lib/forms/limits.ts`:

| Kind | Maximum length |
|---|---|
| Slugs and identifiers | 80 |
| Names, short text and photo attribution | 255 |
| URLs | 2,048 |
| Notes and long text | 2,000 |

Enforce limits in server-side Zod schemas and reuse those schemas in client forms. Set matching
HTML `maxLength` attributes on text inputs and textareas. Reject overlong submitted values with
clear field errors; do not silently truncate stored input. Unwrap nullable server fields for form
schemas instead of replacing them with unbounded strings. Test values at the limit and one character over.

These shared limits currently apply to the species create/edit form. Apply the convention to other
forms when they are updated; do not expand a task's scope solely to migrate every existing form.
The PostgreSQL species columns remain `text` without explicit length constraints; do not assume
the database enforces these application limits.

# CRUD conventions

Use the species create, edit and deactivate flows as the reference for new entity features.
Keep shared conventions here; `CLAUDE.md` imports this file.

## Database queries

- Put database operations in `db/queries/`. Pages and client components call named queries;
  they do not import Supabase. Use the session-aware `db()` from `db/client.ts` for writes
  and editor reads so database permissions apply to the caller.
- Name exports for the action and full entity: `list<Entity>s`, `read<Entity>`,
  `create<Entity>`, `update<Entity>` and `deactivate<Entity>`. Use `PlantingEvent`,
  `PlantingLine` and `PlantingArea`, not shortened names. `findPlantingLines` is the
  existing exception for paged, filtered lines.
- Base queries in `db/queries/views.ts` are building blocks named after their view or
  table; pages call the named entity queries instead.
- Keep writes direct: attempt the insert or update, return the database result and handle
  errors in the server action. Do not add existence prechecks, fallback reads or extra
  active-state predicates to standard updates. This does not replace access or input checks.
- Use `.select("slug").single()` (or the entity's equivalent key) when a write should
  affect one row. Use `.maybeSingle()` for reads where absence is an expected result.
  Select only needed columns and put chained query calls on separate lines.
- Use generated types from `db/database.types.ts`; regenerate them after schema changes
  rather than editing them. Database triggers maintain audit fields.

## Forms and validation

- Share one client form between create and edit pages. Supply initial values, submit
  callback, button label and cancel destination as props; keep database calls in the page's
  server action. See `components/wrt/species/SpeciesForm.tsx`.
- Use React Hook Form with `useForm`, `zodResolver` and types inferred from Zod schemas.
  Define the writable schema in `db/types.ts` and derive the form schema when controls
  need strings, empty values or tri-state choices. Normalize form values before submitting.
- Validate again with `safeParse()` inside every create/edit server action and write only
  the parsed data. Keep audit fields and unrelated imported metadata out of writable schemas.
- Follow the shadcn React Hook Form pattern. Reuse `components/forms/form-field.tsx`,
  which composes `Controller`, `Field`, `FieldLabel`, `FieldDescription` and `FieldError`.
  Spread both the supplied field props and accessibility props onto each control; wire
  custom controls' value, change, blur and ref explicitly when necessary.
- Use existing shadcn controls and `FieldGroup` / `FieldSet` / `FieldLegend` for layout.
  Use `useFieldArray` for editable lists and `useWatch` for dependent previews.
- Return expected failures as `{ error?: string; issues?: { path: string; message: string }[] }`.
  Map field issues through `form.setError`, focus the first invalid field and show general
  failures as root errors. Preserve entered values and allow retrying.
- Disable submission while pending and show progress using the existing Button/Spinner
  composition. A confirmation with no editable inputs can use `useActionState` and a
  server action directly; it does not need React Hook Form or an empty Zod schema.

## Server actions and refresh

- Let the route's server action own access checks, validation, the named query call,
  error mapping, cache invalidation and redirect. Check access inside the action as well
  as when rendering controls; use the existing access helper rather than copying a bypass.
- Capture the target identifier in the server action for edit/deactivate confirmations.
  Treat submitted form values as untrusted and map actionable database errors, such as
  duplicate slugs, to useful field messages.
- Invalidate caches only after a successful write. Follow the existing shared-data pattern:
  `updateTag(SUPABASE_TAG)`, then `revalidatePath("/", "layout")`, then `redirect(...)`.
- Keep redirects outside mutation `try`/`catch` blocks. In client submit handlers that
  catch exceptions, call Next.js `unstable_rethrow(error)` before displaying a fallback
  error so framework redirects and other control-flow exceptions still work.
- After editing, use the saved identifier for navigation. The existing edit flow redirects
  with `?saved=1`, renders a status alert and keys the form by `updated_at` to refresh defaults.

## Deactivation

- Use **Deactivate**, **Deactivated** and **Reactivate** consistently in UI text and code.
  Set the existing `deactivated_at` column instead of deleting rows. Reuse existing storage;
  a new CRUD action alone does not require a migration or a database trigger.
- Require a named confirmation with Cancel, pending feedback and a retryable error.
  Group Deactivate with Edit on the detail page; show the resulting deactivated state.
- Exclude deactivated entries from normal active lists and new-record selectors. Keep
  historical identities and quantities intact. Reference entities such as species and sites
  must remain resolvable in historical records without silently reducing their planting totals.
  Aggregate behavior for deactivating an event or line follows that feature's requirements.

## Verification and scope

- Keep changes and tests proportional to the feature. Cover important outcomes such as
  validation, access, save/failure behavior and preserved historical quantities; exhaustive
  branch coverage is not a goal. Mock action/query boundaries when useful, not a fake
  Supabase query engine. Use isolated database fixtures when database behavior needs checking.
- Run relevant tests, lint for changed code and type-checking. Add broader build or browser
  checks when the change warrants them; documentation-only edits do not need application tests.
- Avoid unrelated refactors, speculative guards and new infrastructure. Follow the user's
  current commit/push instructions; completing a change does not itself authorize publishing it.
