# WRT restoration history explorer (V0)

A public web app that lets anyone explore every recorded planting season since Autumn 2015 by **site, species,
year and season**, without opening an old spreadsheet. Approved staff can sign in to use AI Chat and make changes.

5,449 records · 23 seasons (Autumn 2015 → Autumn 2026) · 140,068 recorded plants · 38 sites and 1 order scheme · 95 species planted (164 in the register).

## Local development

Run Next.js against a local Supabase database. A hosted Supabase project is not required for local development.

Prerequisites: Node.js 22, npm and Docker running. Run all commands from the repository root. The npm scripts
use a pinned Supabase CLI, so you do not need a global CLI installation or a Supabase account.

### 1. Install dependencies and start the database

```bash
npm ci
npm run supabase:start
```

`supabase:start` runs `supabase start`, then `migration up --local`. The CLI applies the SQL files in
[`supabase/migrations/`](supabase/migrations/) one by one in timestamp order and records each applied version.
On later starts, only pending migrations run; existing data is kept. You do not need to paste each file into
SQL Editor. This creates the schema and seasons; the workbook data is imported in step 3.

After changing `supabase/config.toml`, run `npm run supabase:stop` followed by `npm run supabase:start`
to reload Auth settings and hooks. Applying database migrations alone does not reload the running Auth service.

### 2. Configure the local environment

Copy the template if you do not already have `.env.local`:

```bash
cp .env.example .env.local
```

Fill in `.env.local` with the **local** values printed by Supabase:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key, or anon key>
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
SUPABASE_SECRET_KEY=<local secret key, or service_role key>
```

To see the values again, run `npx --yes supabase@2.121.0 status`. The publishable/anon key is used by the app;
the secret/service-role key is used only by the import scripts and must never have a `NEXT_PUBLIC_` prefix.

Keep these values in the git-ignored `.env.local`: the import scripts load that file directly, and Next.js uses
it to override `.env`. The tracked `.env` contains legacy hosted settings; they are not a working local setup.
Restart Next.js after changing environment variables.

### 3. Add a staff email and test sign-in

Approved staff emails are managed in `public.users`. Add a profile in Supabase Studio's SQL Editor, replacing the
name and email with the approved person's details:

```sql
insert into public.users (name, email)
values ('Staff name', 'staff@example.org');
```

Start the app and open [`/login`](http://127.0.0.1:3000/login). Local Supabase captures sign-in messages in its
email inbox at [http://127.0.0.1:54324](http://127.0.0.1:54324); no email is delivered to a real inbox. Open the
message link to sign in. Use `http://127.0.0.1:3000` consistently: `localhost` has separate browser cookies.
Public pages and CSV downloads work without an account.

### 4. Load the planting history and map pins

Check that the URL in `.env.local` is local, then run the workbook import before the pins import:

```bash
npm run import-workbook             # preview changes
npm run import-workbook -- --write
npm run import-pins                 # preview changes
npm run import-pins -- --write
```

The client workbook-derived CSVs are not stored in Git. Restore `docs/` locally as described in
[Client documentation](#client-documentation) before running the workbook import. It checks each season
against its source total. These imports can be rerun; see [import behaviour](supabase/README.md#the-workbook-import).

### 5. Start the app

```bash
npm run dev
```

Open [the app](http://127.0.0.1:3000). Local [Supabase Studio](http://127.0.0.1:54323) provides the table browser
and SQL Editor. Reference photos and map tiles still need internet access.

### Everyday commands

```bash
npm run supabase:start  # start the local database and apply pending migrations
npm run db:migrate      # apply pending migrations while Supabase is already running
npm run supabase:stop   # stop Supabase, keeping local data
npm run typecheck       # generate Next.js route types and run strict TypeScript checks
npm run lint
npm test                # parser, validation, repository and query invariants, search
npm run build && npm start
```

Local Supabase Auth captures email in its inbox at `http://127.0.0.1:54324`. Production uses Resend through
Supabase's custom SMTP settings, with `noreply@wrtqt.org.nz` as the sender. Follow the
[production email setup](supabase/README.md#production-email-with-resend) to activate it in the hosted project.

Start Supabase before running the app or the full test suite. Live database tests use `.env.local` and expect
the workbook import to have run. The [database checks](supabase/README.md#checking-it-all-ran) verify the schema
and imported data in SQL Editor.

## Documentation

| Guide                                   | Contents                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------- |
| [Supabase](supabase/README.md)          | Migrations, import behaviour, SQL checks and future hosted database setup |
| [Database reads](db/README.md)          | Query conventions and generating TypeScript types from the local schema   |
| [Canopy](styles/canopy/README.md)       | Vendored design system                                                    |

### Client documentation

The client documentation and workbook-derived source files are excluded from Git. To use them locally,
download or copy the contents of the [shared Google Drive folder](https://drive.google.com/drive/folders/13_jeLGxdwGMCy4ZJUO27X-KoThnqbZ6M?usp=share_link)
into a `docs/` directory at the repository root. Git ignores that directory, so its contents will not be
committed or pushed.

## Deployment

The source is in the private [GitHub repository](https://github.com/ktgcreative/wtr-app-tree-reforestation),
with a [Vercel project](https://vercel.com/ktgcreatives-projects/wtr-app-tree-reforestation) for the Next.js app.
Hosting the app also requires a provisioned Supabase database with the migrations and imports applied;
deploying Next.js alone does not create it. See [hosted database setup](supabase/README.md#hosted-database-setup).

Use the Next.js preset and `npm run build`. Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the deployment environment to the hosted project's values before
building. These public values are bundled at build time; local URLs and legacy `.env` values are not production configuration.
The app does not need `SUPABASE_SECRET_KEY`.
Set `NEXT_PUBLIC_APP_URL` to the production app origin and configure
[Resend SMTP in hosted Supabase](supabase/README.md#production-email-with-resend). Supabase owns email delivery;
the app does not need a Resend SDK or API key.
`.vercelignore` excludes local build output, import scripts and research material from CLI uploads.

## Pages

| Route | Answers |
|---|---|
| `/` | The whole history at a glance: season by season, top sites and species, open questions for WRT |
| `/sites`, `/sites/[slug]` | What went in at a site, year by year, with its parcels. `?year=2019` lists that year's species |
| `/species`, `/species/[slug]` | Every species: where and when it was recorded, the spellings found in WRT's files |
| `/seasons`, `/seasons/[slug]` | What went in during a season, checked against the workbook's own total |
| `/records` | Filter every record by site, species, year, season, review status or question; CSV export |
| `/search?q=` | Sites, species and seasons. Ignores macrons and tolerates typos ("kowhia", "white chapel") |
| `/about-the-data` | How to read every number: recorded vs verified, open rulings, precision, reconciliation |

## How to read the numbers (product rules, enforced in code)

1. **Recorded plants, not verified plantings.** The history was filled from allocation sheets. The UI never says "planted N".
2. **Every aggregate keeps the split.** All totals are a `QuantitySplit` (`resolved` + `needsReview`). 667 records carrying
   44,290 plants still need a WRT ruling or confirmation; they show in amber everywhere.
3. **Precision is what it is.** Site + species + season + quantity. No dates, event types, volunteers, photos or coordinates are invented.
4. **IDs are plumbing.** `SP-…`, site numbers and record IDs are join keys only. Review notes are shown with species names
   (`ReviewNote.text`); the original note is kept in `ReviewNote.raw`.
5. **Provenance on every record.** The "Source" expander shows the original strings, workbook, sheet and cell.

## Architecture

```text
local docs/planning/prototype/*.csv → scripts/import-workbook.ts → Supabase
 data/site-locations.json     → scripts/import-pins.ts     → Supabase
                                                             ↓
                                                     db/repository.ts
                                                             ↓
                                             lib/wrt/server.ts → getWrt()
                                                             ↓
                                                   lib/wrt/queries.ts
                                                             ↓
                                               app/** and components/**
```

The live app reads only Supabase. `SupabaseWrtRepository` implements `WrtRepository` for the shared query layer;
the seasons pages also read database views through `db/queries`.

CSV parsing and validation live under `scripts/workbook/` for the one-off workbook import. Client source CSVs
must be restored locally before importing. `tests/supabase-parity.test.ts` checks live database figures against
the import fixture, including season-total checks. The app never reads source files at runtime.

## Design system

[Canopy](styles/canopy/README.md) is vendored unchanged in `styles/canopy/` (tokens + component classes) and is the
source of truth for colour, type, radius, spacing and components. `styles/app.css` adds app patterns built only from
Canopy tokens. shadcn components (`components/ui/`) are restyled onto Canopy, and Canopy is icon-free, so there is no
icon library. Plus Jakarta Sans is self-hosted from npm (`@fontsource-variable/plus-jakarta-sans`).

`lib/wrt/display-names.ts` restores macrons (the species register has none) and fixes a few common-name typos for
display only. Delete it once the species register has its own display-name column.

## Known limits of V0

- Numbers will move when WRT rules on the open questions (Slope Hill 2024, contested species pairs, Paper4Trees, site numbers).
- History only: no current stock, seed lots, potting or allocations.
- Spring 2026 is not in the MASTER workbook yet.

## Site reference maps

The Sites map and individual site pages show approximate public reference locations across 29 historical site groups (50 points). `data/site-locations.json` keeps these points separate from the planting ledger, with explicit latitude/longitude, location and coordinate source URLs, derivation notes and a checked date. Points come from WRT's historic event map, council geometry or public landmarks; they do not claim historical planting boundaries. Marker labels show compact recorded plant counts (such as 1.2k), calculated from the reader's current record scope. Whole-site references use the group count; references for identified parts use distinct registered parcel IDs so quantities are not duplicated or assigned to unmapped parts. An amber dot preserves the presence of review quantities, with the full split shown on selection. Map groups expand on click; the location picker also exposes every point, coordinates, sources and a Google Maps link. Site-class filters limit map coverage to the visible sites. Unmapped sites show an explicit empty state; Paper4Trees has no map.

## Species photo guide

Open **Species → Top 20 photo guide** for hosted reference photos of the twenty most planted species. Each species has three photos; thumbnails appear in the main Species list, and the full set appears on its detail page, with photographer credits, licences and source links.
