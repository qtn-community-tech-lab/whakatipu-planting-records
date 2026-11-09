# Database reads

For installation, local Supabase and environment variables, start with the [local development guide](../README.md#local-development).
For migrations, imports and SQL checks, see the [Supabase reference](../supabase/README.md).

Every read from Supabase lives in `queries/`. A page calls one by name:

```ts
const sites = await listSites();
```

- `database.types.ts` is generated from the database schema. Column names in `.select("…")` are checked against it.
- `queries/views.ts` holds one base query per view or table. The other files add a filter or a limit.
- Queries are named `list<Entity>s`, `read<Entity>`, and later `create<Entity>`, `update<Entity>` and `deactivate<Entity>`, with the entity spelled out (`listPlantingAreaTotals`, not `listAreaTotals`). `findPlantingLines` is the one exception: it pages through lines that match a filter. The rule is in `CLAUDE.md`.
- Rows are never deleted. Species with `deactivated_at` set are retired from the active register and new planting selections. Existing policies restrict retired metadata to staff; the temporary anonymous development CRUD policy also permits reads. Public and non-staff read policies remain limited to active species.
- When staff authentication replaces the development bypass, historical repositories must use the signed-in staff client. The current anonymous history loader cannot preserve retired species in joins and totals under the restricted public policy.
- `deactivateSpecies` retires only the species row, preserving its slug and all linked planting quantities. Repeated requests retain its first retirement timestamp. `guard_active_species` rejects new lines and species reassignment to retired entries; unchanged historical associations stay valid.
- In app code, only `db/` imports Supabase, and ESLint enforces it. `lib/supabase/`, `scripts/` and `tests/` are exempt.

## Generate types after a migration

With local Supabase running, apply pending migrations and generate types from that database:

```bash
npm run db:migrate
npx --yes supabase@2.121.0 gen types typescript --local --schema public > db/database.types.ts
npx --yes prettier@3.9.10 --write db/database.types.ts
npm run typecheck
```

This does not need a Supabase login. The existing `npm run db:types` script targets a legacy hosted project ID;
use the local command above until a hosted project is provisioned and the script is updated.
