# WRT restoration history explorer (V0)

A read-only explorer of Whakatipu Reforestation Trust’s saved sites, species, planting areas and planting records.

The reference seed contains 95 species, 29 sites, 50 locations, 50 planting areas and 23 season labels (Autumn 2015–Autumn 2026). It contains no planting events or quantities; catalogues remain browsable before history is imported.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest: parser, validation, repository and query invariants, search
npm run build && npm start
```

Node 20.9+ (tested on 22). Configure the Supabase URL and publishable key in `.env.local` using `.env.example`. Public reads do not require sign-in; database RLS controls access.

## Supabase development

Follow the [Supabase setup and migration guide](docs/supabase-setup.md) to start a new local project, apply the migration, configure `.env.local`, create the first staff account and generate database types. It also covers applying migrations to a fresh hosted Supabase project. The [database reference](db/README.md) explains the schema and access rules.

For a new checkout, copy the environment example:

```sh
cp .env.example .env.local
```

If `.env.local` already exists, edit it instead. After starting local Supabase using the setup guide, run `supabase status` and copy its API URL and publishable key (or `anon` key) into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-local-publishable-or-anon-key>
```

Use the URL printed by the CLI if it differs. Use the public key, never the service-role key. Restart Next.js after changing these values.

With Docker running and setup complete, start both Supabase and the app with one command:

```sh
npm run dev:local
```

This starts Supabase, applies pending local migrations, then runs the app at `http://localhost:3000`. Press Ctrl+C to stop the app; run `supabase stop` to stop the database services. `npm run dev` starts the app on its own.

`dev:local` does not select the local connection automatically: the app uses the configured environment variables. If `.env.local` points to a hosted project, the app connects to that project even while local Supabase is running.

During development, browser-side Supabase database responses are logged in the browser console with their method, query, status and returned data. Server-side calls are not logged or forwarded to the browser. This logging is disabled in production and does not log Auth responses or request headers.

Pages read Supabase directly through the existing server client. Load the reference seed separately as described in the setup guide; historical CSV records are not automatically imported.

## Deployment

The source is in the private [GitHub repository](https://github.com/ktgcreative/wtr-app-tree-reforestation).
The [Vercel project](https://vercel.com/ktgcreatives-projects/wtr-app-tree-reforestation) is connected to it;
pushes to the existing production branch `z` trigger a deployment.

Vercel uses the Next.js preset and `npm run build`. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the target database. Reads run at request time with no application cache.

## Pages

| Route | Answers |
|---|---|
| `/` | The whole history at a glance: season by season, top sites and species |
| `/sites`, `/sites/[slug]` | What went in at a site, year by year, with its parcels. `?year=2019` lists that year's species |
| `/species`, `/species/[slug]` | Every species: where and when it was recorded, the spellings found in WRT's files |
| `/seasons`, `/seasons/[slug]` | What went in during a season, grouped by its exact saved label across years |
| `/records` | Filter every record by site, species, year or season; CSV export |
| `/search?q=` | Sites, species and seasons. Ignores macrons and tolerates typos ("kowhia", "white chapel") |
| `/about-the-data` | How to read every number: saved quantities, unknown counts, dates and provenance |

## Data access

`getWrt()` in `lib/wrt/server.ts` uses the existing server Supabase client and `db/queries/explorer.ts`. Reads page through active catalogue rows and joined planting lines, respecting the caller’s RLS. `lib/wrt/queries.ts` supplies the existing page, export and chat summaries. No CSV/JSON fallback or application caching is used.

Saved quantities are authoritative. Totals sum known counts and show the number of unknown counts separately. Unknown dates remain null; years come only from planting dates. Seasons are grouped by exact saved text. Internal IDs are used for joins, while pages display names and use saved site, species and area slugs.

The CSV parser, historical repository and JSON research catalogues remain available for source-artifact validation tests. They are not runtime data sources. Source provenance is shown when an imported record has it.

## Design system

[Canopy](styles/canopy/README.md) is vendored unchanged in `styles/canopy/` (tokens + component classes) and is the
source of truth for colour, type, radius, spacing and components. `styles/app.css` adds app patterns built only from
Canopy tokens. shadcn components (`components/ui/`) are restyled onto Canopy, and Canopy is icon-free, so there is no
icon library. Plus Jakarta Sans is self-hosted from npm (`@fontsource-variable/plus-jakarta-sans`).

## Reference maps and species guide

Map points come from saved site and planting-area locations. An area uses its site’s pin when it has none, and shared pins are grouped without duplicating quantities. Sites without pins remain browsable.

The species guide uses saved descriptions and one saved image per species. Source links and image credits are retained in the descriptions. The JSON catalogues in `data/` document the original reference snapshot; maintain `supabase/seed.sql` directly.

The explorer does not include editing, stock, seed lots or survival tracking. Historical planting records require a separate import.
