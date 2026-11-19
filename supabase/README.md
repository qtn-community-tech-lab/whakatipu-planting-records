# Supabase database

The planting database: 9 tables, the totals views and the access rules. See the [table diagram](diagrams/tables.png).

Start with the [local development guide](../README.md#local-development) for installation, starting Supabase,
setting local keys and loading the initial data. This README covers database maintenance.

## Files

| File                                               | What it does                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/20261102000000_schema.sql`             | Creates the 9 tables (sites, areas, species, seasons, plantings, planting_lines, questions, notes, users), the edit trail, the totals views and the 25 seasons from Autumn 2015 to Autumn 2027                                                                 |
| `migrations/20261102000100_access_rules.sql`       | Access rules: signed in reads live rows, staff add and edit. Nobody deletes, makes anyone staff, changes seasons or creates spreadsheet-history rows from the app                                                                                              |
| `migrations/20261103000000_public_reads.sql`       | Signed-out visitors read live rows and the totals views, the same as a signed-in volunteer. They can't write, and can't see `users`                                                                                                                            |
| `migrations/20261104000000_seasons_page.sql`       | Adds year, half, workbook cell and review counts to the season totals, and the views `season_species`, `season_sites` and `totals_by_question`                                                                                                                 |
| `migrations/20261105000000_line_records.sql`       | Adds each line's workbook file, sheet, original spellings, precision and confidence to `line_details`                                                                                                                                                          |
| `migrations/20261106000000_naming.sql`             | Renames `plantings` to `planting_events`, `planting_lines.planting` to `planting_event`, and `retired_at` to `deactivated_at` on every table, with the functions, triggers, indexes and constraints that named them. No row changes. From James Bayly's review |
| `migrations/20261109000000_dev_anonymous_crud.sql` | Early development: anonymous CRUD on species, sites, areas, planting events, planting lines, seasons and users; keeps RLS enabled                                                                                                                              |
| `migrations/20261114000000_authentication.sql`     | Adds the email allowlist and Auth identity link, signup hook, active-membership writes and audit attribution; preserves public history reads and removes anonymous writes                                                                                      |
| `migrations/20261114000100_user_management.sql`    | Lets active approved users manage the allowlist while keeping stable app IDs and Auth identity links protected                                                                                                                                                 |
| `migrations/20261119000100_species_reference_columns.sql` | Replaces species profile JSON with reference fields, reusing the canonical species names and preserving audit fields |
| `migrations/20261119000200_remove_species_name_note.sql` | Removes the species name note; canonical names and identification content remain on the species row |
| `checks/species_profile_test.sql` | Checks empty profiles, separate reference names, ordered sources, typed dates and public reads with fixtures that roll back |
| `checks/anonymous_crud_check.sql`                  | Verifies public reads remain available and anonymous writes and user-profile reads are denied                                                                                                                                                                  |
| `checks/schema_check.sql`                          | Checks everything the migrations create, the imported row counts, that every line has its workbook file, sheet and cell, and the season totals. Lists PASS or FAIL. Only reads                                                                                 |
| `checks/access_rules_check.sql`                    | Tries 25 public, unapproved and active-user operations, including user management, and lists PASS or FAIL. Changes nothing                                                                                                                                     |
| `../data/species.json` and `../scripts/seed-species.ts` | Complete PostgreSQL-derived species seed used by the workbook import and standalone insert/backfill command |

## Migrations

[`migrations/`](migrations/) is the source of truth for the schema. Apply all files in timestamp order, starting
with `20261102000000_schema.sql`. `npm run supabase:start` starts the local stack and applies pending files;
`npm run db:migrate` applies pending files while it is running. Both commands use the pinned Supabase CLI.

On a fresh database, `supabase start` applies the migrations. On an existing database, the npm startup command
also runs `migration up --local`, because plain `supabase start` can reuse the database without applying new files.
Supabase tracks applied versions, so later runs skip them. Each migration runs as a transaction; a failure rolls
back that file and stops the command. Fix the failure before continuing with imports or the app.

Add schema changes as new timestamped SQL files, apply them locally, then
[regenerate the database types](../db/README.md#generate-types-after-a-migration).
See the [Supabase migration reference](https://supabase.com/docs/reference/cli/supabase-migration-up).

If a local stack started under the previous project ID is occupying the ports, stop it before starting this one:

```bash
npx --yes supabase@2.121.0 stop --project-id whakatipu-planting-records
```

The current project ID in `config.toml` is `wrt-planting-app`. Stopping the stack preserves its data.

## Authentication and public access

`public.users` is the email allowlist. Active users can manage it at `/users`; all active profiles have the same
permissions. A user signs in for the first time at `/login`, and Supabase links the confirmed Auth identity by
normalized email. Changing an email resets that link and resolves the new confirmed identity without changing
the app user ID. Deactivating the profile removes write and AI access on the next request.

The authentication migration seeds the nine initial users. Existing profiles with a matching email are kept
unchanged, including their IDs, names and deactivation state. Entries without a supplied name use their email
as the display name. Supabase creates their Auth identities when they first sign in.

Anonymous visitors can read all planting history, including deactivated pages, search and CSV exports. They cannot
read user profiles, write data or use AI Chat. The app checks the active email allowlist before requesting a
sign-in link, and Supabase's Before User Created hook blocks unapproved new Auth identities, including direct
Auth signups. Database writes also check active membership through RLS.

Supabase generates and verifies magic links in every environment. Email delivery is configured per Supabase
project, rather than selected by `NODE_ENV` in the app:

Before requesting a link, the server checks `public.users` for an active matching email using the
server-only `SUPABASE_SECRET_KEY`. This check also applies to existing Supabase Auth identities; the Before User
Created hook remains the database-side guard for creating new identities. Configure the secret key in each app
environment and never expose it with a `NEXT_PUBLIC_` prefix.

Failed sign-in links show an alert on `/login`. This includes Supabase errors returned to the site URL in a
`#error=...` fragment, which is only visible to the browser. Expired or consumed links prompt a fresh request;
incomplete links, verification failures and inactive staff access have separate messages. If links repeatedly
fail, check that both email templates use the token-hash callback below and that the callback origin is allowed.

| Environment       | Delivery                                                                   | Configuration                                                                 |
| ----------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Local development | Captured in the [local inbox](http://127.0.0.1:54324); no real emails sent | `config.toml`: `local_smtp.enabled = true`, `auth.email.smtp.enabled = false` |
| Production        | Resend SMTP, from `noreply@wrtqt.org.nz`                                   | Hosted Supabase Auth SMTP settings below                                      |

Point development at local Supabase. Connecting a development server to the production Supabase project uses
that project's real email delivery. Local startup and database migrations do not apply hosted SMTP settings.

### Production email with Resend

Configure the **production Supabase project** under **Authentication → Email → SMTP Settings**, following
[Resend's Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp):

| Setting                   | Value                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| Custom SMTP               | Enabled                                                          |
| Sender email              | `noreply@wrtqt.org.nz`                                           |
| Sender name               | `Whakatipu Reforestation Trust`                                  |
| Host                      | `smtp.resend.com`                                                |
| Port                      | `465` (TLS)                                                      |
| Username                  | `resend`                                                         |
| Password                  | A dedicated Resend API key with sending access to `wrtqt.org.nz` |
| Minimum interval per user | `60` seconds                                                     |

Keep the key in Supabase's SMTP password setting. It is not an application environment variable or an Edge
Function secret. No Resend SDK, email webhook or database migration is needed. Domain verification is deferred;
Resend requires `wrtqt.org.nz` to be verified before it can deliver from this address.

Keep the existing Auth configuration when enabling SMTP:

- Enable email signup and email confirmation. Keep the Before User Created hook set to
  `public.authorize_staff_signup` so only approved staff can create an identity.
- Set Supabase's Site URL and the app's `NEXT_PUBLIC_APP_URL` to the same production HTTPS origin. Allow that
  origin's `/**` callback URLs; production links must not point to `localhost` or `127.0.0.1`.
- Use [`templates/magic-link.html`](templates/magic-link.html) for both **Confirm signup** and **Magic link**,
  with the subject `Sign in to Whakatipu Reforestation Trust`. Both templates must keep the token-hash link to
  `/auth/confirm`; the default Supabase template uses a different callback flow.
- Keep email OTP expiry at `3600` seconds and the resend interval at `60` seconds. Leave email link tracking
  disabled so the provider preserves the sign-in URL.
- Keep the custom SMTP email rate limit at `30` messages per hour initially. This accommodates the expected
  20 sign-in emails per day; Supabase and Resend both enforce their own limits. See
  [Supabase's SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp).

To verify production delivery after configuration, approve a test address in `public.users`, request a link at
`/login`, and check delivery in Resend and the recipient's inbox. Follow it and confirm that the app shows
**Sign out** and opens a protected edit page. Sign out and repeat to exercise the returning-user template.
Check return navigation and that reopening a consumed link offers a fresh sign-in request. Routine testing
continues through the local inbox without Resend credentials.

## The workbook import

[`scripts/import-workbook.ts`](../scripts/import-workbook.ts) seeds entirely from `data/*.json`:
39 sites, 78 areas, 95 species, 28 seasons, 360 events, 5,449 lines and 1,339 review notes.
No local CSVs are required. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`.
Migrations must run first. The existing Supabase client handles every database read and write.

```bash
npm run import-workbook              # read-only preview of missing rows
npm run import-workbook -- --write   # insert missing rows, skip existing rows
```

The importer uses complete `sites.json`, `site_areas.json`, `species.json` and `seasons.json` rows.
`plantings.json` contains workbook events with nested `lines`; each line has a `notes` array. Event `notes`
remains the event's free-text field. Seasons are referenced by slug, and no event, line or note identity IDs
are stored in the seed. Audit fields and source user references are excluded; PostgreSQL assigns them.
Deactivation state, resolution dates and provenance are retained.

Every seed reference and stable identity is validated before connecting. Reference tables match by slug;
workbook events match by source, area and season, lines by `legacy_code`, and notes by line and question.
Events are inserted first, lines use the returned event IDs, then notes use the returned line IDs.
Ordinary inserts leave `GENERATED ALWAYS` IDs to PostgreSQL, so no sequence reset or special SQL is needed.
Only workbook events are supported in this seed because their area/season identity is unique.

This command seeds fresh databases. Reruns insert missing rows without changing existing values, allowing safe
retries after partial imports. Rows absent from the seed are left untouched.
Writes run in batches; a failure does not undo completed batches, and rerunning is safe. After importing,
season totals are checked against `seasons.json`; mismatches fail the command. Check the seed and existing database records if totals differ. Future seasons with null workbook totals are skipped.

Species names are stored once in `scientific_name`, `common_name` and the preferred `maori_name`.
`maori_name_alternatives` (`text[]`) contains other documented Māori names, excluding the preferred name and
duplicates. Reference content uses `summary`, `look_for`, `sources` and `checked_at` (`date`).
The ordered list of source labels and URLs remains a JSON array in `sources`. The app reads these fields directly
from the species row, so editing a species name updates the displayed names.
The species identity comes from `register_code`, falling back to `slug`.

## Species seed and backfill

[`data/species.json`](../data/species.json) contains complete species rows exported from the local PostgreSQL
table after the profile-column migration, with reconciled names and only the 95 species referenced by planting
records. It retains all 20 non-audit columns, including register identities,
profile fields, ordered sources, photos with attribution and URLs, and deactivation state. Both import commands
use this file as their species source. `created_at`, `created_by`, `updated_at` and `updated_by` are omitted so
database triggers assign the audit values when importing into another database.

```bash
npm run seed-species                         # validate and preview offline
npm run seed-species -- --write              # insert missing species only
npm run seed-species -- --write --backfill   # insert missing rows and backfill existing rows
```

The backfill uses existing species columns only. It updates `scientific_name`, `suggested_spelling` and
`threatened`, and fills `common_name`, `maori_name`, reference content and `photos` only when empty.
Reference fields are filled together only when all are empty, preserving any existing editorial reference content.
It never changes slugs or register codes, overwrites populated names or reference content, or stores NZTCS
assessment details. A verified NZTCS Threatened match is `threatened = true`; verified At Risk or Not Threatened
matches are `false`; unresolved matches remain `null`. For existing rows, the backfill leaves `over_5m`
untouched. Newly inserted rows take its value from the complete JSON seed. This field has not been independently
height-audited; workbook-imported `false` values mean unmarked in the source register, not necessarily
botanically verified as under five metres.

The seed command requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` only when
`--write` is used. It checks slug/register-code conflicts before writing, is safe to rerun, and preserves
deactivated rows. Use the standalone command when species are needed without importing planting history, or
when applying its limited backfill instead of the workbook import's full species sync.

To refresh the seed from PostgreSQL, export the result of this query to `data/species.json`:

```sql
select jsonb_pretty(jsonb_agg(
  to_jsonb(s) - array['created_at', 'created_by', 'updated_at', 'updated_by']
  order by register_code nulls last, slug
)) from public.species s
where exists (select 1 from public.planting_lines l where l.species = s.slug);
```

Run `npm run seed-species` to validate the exported data before using either importer.

## Sites, areas and map pins

The workbook import seeds complete site and area rows from `data/sites.json` and `data/site_areas.json`.
These are direct table dumps. The importer excludes `created_at`, `created_by`, `updated_at` and `updated_by`,
so database triggers manage audit fields. All other fields, including pins, descriptions and deactivation state,
follow the seed on reruns. No separate pin import is needed.

Workbook parcel identities are matched to the saved area slugs by site and WRT number, or by site and area name
for unnumbered parcels. Missing or ambiguous matches fail before any database writes.

## Hosted database setup

Local startup and migration commands only change the local database. Hosted Auth settings are configured in
the hosted project's dashboard. Existing production databases keep their applied migrations.

When provisioning a hosted environment:

1. Create the Supabase project and apply all migrations in timestamp order. Configure the Auth Before User Created
   hook, `/auth/confirm` redirect allowlist, one-hour email expiry and both magic-link email templates to match
   `config.toml`.
2. Run the workbook import with that project's Supabase URL and secret/service-role key in `.env.local`. It seeds
   all reference data, history, review notes and pins. Restore your local settings before resuming local development.
3. Run the SQL checks below against the hosted database.
4. Set the hosted URL, publishable key and app origin (`NEXT_PUBLIC_APP_URL`) in the Next.js deployment environment
   before building the app. Configure [Resend SMTP](#production-email-with-resend) before broad email use.

For automated migrations, configure the [Supabase GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
and enable **Deploy to production** for the chosen branch. Only after that setup should production-branch pushes
be expected to apply pending migrations. Commit new migrations with the application changes that need them.

If reusing an older database whose migrations were pasted into SQL Editor, reconcile its migration history
against the actual schema before enabling automation. Do not replay the initial schema over existing tables.

## Checking it all ran

Open local [Supabase Studio](http://127.0.0.1:54323) and paste [`checks/schema_check.sql`](checks/schema_check.sql)
into SQL Editor. After the workbook import, every row should say PASS. It checks the schema, access rules,
imported row counts, workbook provenance and season totals. The import rows say FAIL until the import has run.

[`checks/access_rules_check.sql`](checks/access_rules_check.sql) exercises signed-out, unapproved identity and active
user access. Its active-user tests need at least one approved profile with a linked Auth identity. The script
rolls back its test rows.

### Auth identity regression check

Run `checks/auth_identity_check.sql` as postgres after applying all migrations. It uses isolated
fixtures and rolls them back, checking email normalization, changed-email relinking, revoked access
for the old identity, deactivation and stable audit attribution.

The app requires `NEXT_PUBLIC_APP_URL` outside local development. Set it to the intended app origin
and allow its `/auth/confirm` callback in Supabase Auth. Preview deployments need an explicitly
configured, allowlisted origin too; the app does not fall back to `VERCEL_URL`.
