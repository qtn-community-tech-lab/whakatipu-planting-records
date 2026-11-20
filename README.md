# WRT planting records

A public explorer for Whakatipu Reforestation Trust planting history, with staff tools for recording and editing data. Built with Next.js and Supabase.

The maintained seed contains 41 sites, 74 site areas, 93 species, 358 planting events and 5,444 planting lines totalling 140,068 recorded plants. Historical records cover 23 seasons; the season calendar extends through Spring 2028.

## Local development

Requires Node.js 22, npm and Docker. Run commands from the repository root.

```bash
npm ci
npm run supabase:start
cp .env.example .env.local  # first setup only; keep any existing local configuration
```

Copy the local Supabase keys printed at startup into `.env.local`. To see them again:

```bash
npx --yes supabase@2.121.0 status
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Local API: `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Local publishable or anon key |
| `NEXT_PUBLIC_APP_URL` | App origin: `http://127.0.0.1:3000` |
| `SUPABASE_SECRET_KEY` | Server-only secret or service-role key for login checks and seeding |

Keep credentials in the ignored `.env.local`; it overrides `.env`. Restart Next.js after changing variables.

Seed the database, then start the app:

```bash
npm run import-historical-seed-data            # read-only preview against the configured database
npm run import-historical-seed-data -- --write  # insert missing seed rows
npm run dev
```

`import-historical-seed-data` is the single seed command for a fresh, migrated database. It reads maintained JSON seeds, with review questions defined in code. It needs no CSVs or original workbook. Existing rows are preserved on retries. See [seed behaviour](supabase/README.md#historical-seed-import) and [data sources](data/README.md).

| Local service | URL |
| --- | --- |
| App | http://127.0.0.1:3000 |
| Supabase Studio / SQL Editor | http://127.0.0.1:54323 |
| Sign-in email inbox | http://127.0.0.1:54324 |

Use `127.0.0.1` consistently for app URLs; `localhost` has separate browser cookies. Sign in at `/login` with an active seeded account, open its link in the local inbox, then manage approved users at `/users`. Public history needs no login. Photos and map tiles require internet access.

AI Chat additionally uses server-side `AI_GATEWAY_API_KEY`; `WRT_CHAT_MODEL` optionally selects the model.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run supabase:start` | Start local Supabase and apply pending migrations |
| `npm run supabase:stop` | Stop Supabase, retaining data |
| `npm run db:migrate` | Apply pending local migrations |
| `npm run typecheck` | Generate route types and check TypeScript |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests; configured live database tests need seeded Supabase |
| `npm run build` / `npm start` | Build / serve the production app |

Restart Supabase after changing `supabase/config.toml` so Auth settings reload. For generated database types, use the [local generation command](db/README.md#generate-types-after-a-migration).

## Data and application rules

- Describe historical quantities as **recorded plants**. Allocation sheets do not verify actual planting.
- Include all recorded quantities in aggregates. Unknown quantities remain unknown.
- Keep original source spellings, workbook cells and review notes as provenance. Do not invent dates or locations.
- Deactivate records instead of deleting them. Historical species and sites must remain resolvable.
- Map pins are approximate public references, not historical planting boundaries. Species photos include attribution and source links.

The app reads Supabase at runtime through named queries in `db/queries/`. Public pages use database aggregates and bounded review rows; staff Records uses aggregates and database pagination. Chat and planting forms retain the history repository in `db/repository.ts`. Canonical species names and reference content are columns on `species`.

Main pages: `/sites`, `/species`, `/seasons`, `/records`, `/search` and `/about-the-data`. `/records` exports filtered CSVs; signed-in staff can export linked table CSVs at `/export`.

## Deployment

Provision Supabase, apply migrations, seed it and configure hosted Auth using the [database deployment guide](supabase/README.md#hosted-database-setup). Deploying Next.js does not create the database.

Use the Next.js preset with `npm run build`. Set all four environment variables above to the hosted project's values before building; public variables are bundled at build time. Keep the secret key server-only. Configure production email in Supabase, and explicitly allow the app origin and Auth callback for each deployment environment.

## Documentation

| Guide | Contents |
| --- | --- |
| [Seed data](data/README.md) | Inputs, relationships and IDs |
| [Supabase](supabase/README.md) | Migrations, seeding, Auth and deployment |
| [Database code](db/README.md) | Query conventions and generated types |
| [Canopy](styles/canopy/README.md) | Design tokens and UI conventions |
| [Agent instructions](AGENTS.md) | Development and review requirements |
| [Test fixtures](tests/fixtures/README.md) | Synthetic application test data |

Optional client source material belongs in the ignored `docs/` directory. It is not required to seed or run the app.
