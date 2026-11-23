# Database code

See [local setup](../README.md#local-development) and [database maintenance](../supabase/README.md). Shared implementation requirements live in [AGENTS.md](../AGENTS.md).

- Put entity operations in `queries/`: `list<Entity>s`, `read<Entity>`, `create<Entity>`, `update<Entity>` and `deactivate<Entity>`. Spell out `PlantingEvent`, `PlantingLine` and `PlantingArea`; `findPlantingLines` is the existing paged-query exception.
- Pages and actions call named entity queries. `queries/views.ts` supplies their base table/view queries; `queries/public-history.ts` reads grouped history and bounded public review rows.
- Use session-aware `db()` from `client.ts` for writes and editor reads so RLS applies. Keep Supabase imports out of pages and components; ESLint enforces the boundary, with infrastructure, script and test exceptions.
- Use generated `database.types.ts` and writable Zod schemas in `types.ts`. Database triggers maintain audit fields.
- Deactivate instead of deleting. Normal selectors exclude deactivated entries; historical identities and quantities remain available.
- `public.users` stores approved profiles with stable app IDs; `auth_user_id` links confirmed Supabase Auth identities.
- The layout reads navigation counts, season totals and search names through `readLayoutSummary`, a single public RPC. It does not load individual planting lines, notes or species profiles.
- Public pages use `lib/wrt/public-server.ts` for grouped history and request-scoped reference reads, without a persistent cache. Staff Records uses session-aware `queries/records.ts` for aggregates and 50-row pages. Chat and planting forms retain their existing `lib/wrt/server.ts` repository path. Missing related rows fail explicitly rather than silently dropping quantities.

## Generate types after a migration

With local Supabase running:

```bash
npm run db:migrate
npx --yes supabase@2.121.0 gen types typescript --local --schema public > db/database.types.ts
npx --yes prettier@3.9.10 --write db/database.types.ts
npm run typecheck
```

Never edit generated types by hand. The local command needs no Supabase login. `npm run db:types` currently targets a hard-coded hosted project; use the explicit `--local` command for local schema changes.
