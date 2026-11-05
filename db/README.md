# Database reads

Every read from Supabase lives in `queries/`. A page calls one by name:

```ts
const sites = await listSites();
```

- `database.types.ts` is generated: run `npm run db:types` after a migration (`npx supabase login` once first). Column names in `.select("…")` are checked against it.
- `queries/views.ts` holds one base query per view or table. The other files add a filter or a limit.
- In app code, only `db/` imports Supabase, and ESLint enforces it. `lib/supabase/`, `scripts/` and `tests/` are exempt.
