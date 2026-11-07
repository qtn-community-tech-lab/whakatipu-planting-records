# Database reads

Every read from Supabase lives in `queries/`. A page calls one by name:

```ts
const sites = await listSites();
```

- `database.types.ts` is generated: run `npm run db:types` after a migration (`npx supabase login` once first). Column names in `.select("…")` are checked against it.
- `queries/views.ts` holds one base query per view or table. The other files add a filter or a limit.
- Queries are named `list<Entity>s`, `read<Entity>`, and later `create<Entity>`, `update<Entity>` and `deactivate<Entity>`, with the entity spelled out (`listPlantingAreaTotals`, not `listAreaTotals`). `findPlantingLines` is the one exception: it pages through lines that match a filter. The rule is in `CLAUDE.md`.
- Rows are never deleted. A row with `deactivated_at` set is hidden from the public key and from volunteers.
- In app code, only `db/` imports Supabase, and ESLint enforces it. `lib/supabase/`, `scripts/` and `tests/` are exempt.
