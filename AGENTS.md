<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository conventions

Use the species create, edit and deactivate flows as the CRUD reference. `CLAUDE.md` imports this file; keep shared instructions here.

## Data and seeding

- Schema changes belong in new `supabase/migrations/` files. Regenerate `db/database.types.ts`; never edit generated types by hand. Database triggers maintain audit fields.
- `import-historical-seed-data` seeds from `data/{sites,site_areas,species,seasons,plantings}.json` and `lib/wrt/review-themes.ts`. It reads no CSVs. See [seed behaviour](supabase/README.md#historical-seed-import).
- Keep events, lines and review notes nested in `plantings.json`, without their database identity IDs or audit fields. Use returned Supabase insert IDs to link children. Season references in this file are slugs.
- Use `import-historical-seed-data` as the single seed command for a fresh, migrated database. It inserts missing rows and preserves existing values so interrupted imports can be retried. Do not add per-entity seed or backfill commands.
- Species names and reference content live directly on `species`; do not restore separate profile names, a profile object or legacy catalogues.

## Database queries

- Put entity operations in `db/queries/`. Pages/components call named queries instead of importing Supabase. Use session-aware `db()` from `db/client.ts` for writes and editor reads so caller permissions apply.
- Export `list<Entity>s`, `read<Entity>`, `create<Entity>`, `update<Entity>` and `deactivate<Entity>`. Spell out `PlantingEvent`, `PlantingLine` and `PlantingArea`. `findPlantingLines` is the existing paged-query exception.
- `db/queries/views.ts` contains base table/view queries; pages call named entity queries.
- Attempt writes directly and return the database result for the server action to handle. Do not add existence prechecks, fallback reads or extra active-state predicates to standard updates. Keep access and input validation.
- Use `.select("slug").single()` (or the equivalent key) for single-row writes and `.maybeSingle()` for reads where absence is expected. Select needed columns only; put chained calls on separate lines.

## Forms and validation

- Share one client create/edit form with initial values, submit callback, button label and cancel destination. Keep database calls in the route's server action. Reference: `components/wrt/species/SpeciesForm.tsx`.
- Use React Hook Form, `useForm`, `zodResolver` and Zod-inferred types. Define writable schemas in `db/types.ts`; derive form schemas for string controls, empty values and tri-state choices. Normalize before submitting.
- Revalidate with `safeParse()` in each create/edit server action and write only parsed values. Exclude audit fields and unrelated imported metadata from writable schemas.
- Reuse `components/forms/form-field.tsx` and shadcn controls with `FieldGroup`, `FieldSet` and `FieldLegend`. Spread field and accessibility props; wire custom control value, change, blur and ref. Use `useFieldArray` for lists and `useWatch` for dependent previews.
- Return expected failures as `{ error?: string; issues?: { path: string; message: string }[] }`. Map issues with `form.setError`, focus the first invalid field, show general failures as root errors and preserve values for retry.
- Disable submission while pending and use the existing Button/Spinner composition. Input-free confirmations may use `useActionState` directly without React Hook Form or an empty schema.

Reuse `lib/forms/limits.ts` in server Zod schemas, client schemas and HTML `maxLength`:

| Field | Maximum |
| --- | --- |
| Slugs and identifiers | 80 |
| Names, short text, photo attribution | 255 |
| URLs | 2,048 |
| Notes and long text | 2,000 |

Reject overlong values with field errors; never truncate. Unwrap nullable server fields instead of replacing them with unbounded strings. Test the limit and one character over. Species forms already follow this convention; apply it to other forms when touched, without widening scope. PostgreSQL species `text` columns do not enforce these limits.

## Server actions

- The route action owns access checks, validation, the named query, error mapping, invalidation and redirect. Check access inside the action as well as when rendering controls, using the existing access helper.
- Capture edit/deactivation targets in the action. Treat submitted values as untrusted and map actionable errors, such as duplicate slugs, to field messages.
- After a successful write: `updateTag(SUPABASE_TAG)`, `revalidatePath("/", "layout")`, then `redirect(...)`. Keep redirects outside mutation `try`/`catch` blocks.
- Client submit handlers that catch exceptions must call Next.js `unstable_rethrow(error)` before showing fallback errors.
- Navigate with the saved identifier. Edit flows use `?saved=1`, a status alert and a form keyed by `updated_at` to refresh defaults.

## Deactivation

- Use **Deactivate**, **Deactivated** and **Reactivate**. Set `deactivated_at` rather than deleting rows. A new CRUD action alone needs no migration or trigger.
- Require a named confirmation with Cancel, pending feedback and retryable errors. Group Deactivate with Edit on detail pages and show deactivated state.
- Exclude deactivated entries from normal active lists and new-record selectors. Preserve historical identities and quantities: deactivated species/sites must still resolve without reducing historical totals. Event/line aggregate behaviour follows the feature's requirements.

## Verification and scope

- Keep tests proportional: cover validation, access, save/failure behaviour and preserved historical quantities. Mock action/query boundaries rather than a Supabase query engine; use isolated fixtures for database behaviour.
- Run relevant tests, changed-code lint and type-checking. Add build/browser checks when warranted. Documentation-only changes need no application tests.
- Avoid unrelated refactors, speculative guards and new infrastructure. Follow the user's commit/push instructions; completing work does not authorize publishing.

## PR screenshots

Every visual PR includes screenshots taken by the author for each changed screen/state at desktop 1280px and phone 390px. Upload through the GitHub comment box and include a table in the PR description.

For shared UI/form changes, also capture a temporary component sheet: one card per part with its name, purpose and real filled, empty, hint, error and disabled states, using actual form labels. Delete the temporary page before committing.

For nonvisual PRs write: "Not applicable: no visual change."
