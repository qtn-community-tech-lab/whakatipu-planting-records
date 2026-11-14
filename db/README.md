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
- Rows are never deleted. Public reads include deactivated history; active selectors continue to filter it out.
- `public.users` is the email allowlist managed at `/users` by active users. `email` is normalized and
  case-insensitively unique; `auth_user_id` links a profile to Supabase Auth while audit rows keep the stable app ID.
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
