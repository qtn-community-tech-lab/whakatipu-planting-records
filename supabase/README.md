# Supabase

Start with the [local setup](../README.md#local-development). The database has nine application tables: `users`, `sites`, `areas`, `species`, `seasons`, `planting_events`, `planting_lines`, `questions` and `notes`, plus reporting views. See the [table diagram](diagrams/tables.png); migrations define the current schema.

## Migrations

SQL files in [`migrations/`](migrations/) are applied in timestamp order. Supabase tracks applied versions.

```bash
npm run supabase:start  # start the stack and apply pending migrations
npm run db:migrate     # apply pending migrations to the running local stack
npm run supabase:stop  # retain local data
```

Add schema changes as new timestamped migrations, apply them locally, then [regenerate database types](../db/README.md#generate-types-after-a-migration). These npm commands target the local database. Restart the stack after changing `config.toml`; migrations alone do not reload Auth configuration.

To rebuild a disposable local database, **this deletes its current data**:

```bash
npx --yes supabase@2.121.0 db reset --local
npm run import-historical-seed-data -- --write
```

## Historical seed import

[`scripts/import-historical-seed-data.ts`](../scripts/import-historical-seed-data.ts) seeds from [maintained JSON](../data/README.md) and the review question definitions in `lib/wrt/review-themes.ts`. It reads no CSVs.

Apply migrations first. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`, checking that they target the intended database.

```bash
npm run import-historical-seed-data            # validate seeds and preview missing rows; reads the database
npm run import-historical-seed-data -- --write  # insert missing rows
```

The seed contains 41 sites, 74 areas, 93 species, 9 questions, 28 seasons, 358 events, 5,444 lines and 1,334 notes. Planting quantities total 140,068.

The importer validates seed references before connecting, inserts parent rows first, and uses returned IDs to link events, lines and notes. These three tables retain `GENERATED ALWAYS` identities. Season seeds supply explicit IDs for new rows; existing season IDs are resolved by slug.

Reruns match rows as follows:

| Table | Match |
| --- | --- |
| Sites, areas, species, questions, seasons | Slug |
| Workbook events | Source + area + season |
| Planting lines | `legacy_code` |
| Review notes | Line ID + question |

Existing rows are skipped; rows absent from the seed are kept. This command prepares fresh databases and supports retries after partial imports. Writes run in batches, so an error leaves completed batches in place. After writing, season totals are compared with non-null `workbook_total` values in `seasons.json`; a mismatch fails the command.

Audit fields are assigned by database triggers. Seed deactivation state, review resolution and provenance are retained. No separate pin import, PostgreSQL npm driver or identity override is needed.

If a secret key receives `permission denied for table sites`, apply
`migrations/20261120000000_historical_seed_access.sql` to that database. It explicitly
grants the seed role table, sequence and totals-view access instead of relying on
Supabase's default privileges. RLS bypass alone does not grant table access.

## Species data

The historical seed import loads complete species rows from `data/species.json` along with all other reference data and planting history. Use this single command after applying migrations to a fresh database.

Species names are stored once in `scientific_name`, `common_name` and `maori_name`, with other Māori names in `maori_name_alternatives`. Reference content uses `summary`, `look_for`, `sources` and `checked_at`; there is no separate profile object. Threat status can be unknown (`null`). An unmarked `over_5m` source value is not a verified height assessment.

To refresh the planted-species seed, export this query's JSON result to `data/species.json`, then preview the full seed with `npm run import-historical-seed-data`:

```sql
select jsonb_pretty(jsonb_agg(
  to_jsonb(s) - array['created_at', 'created_by', 'updated_at', 'updated_by']
  order by register_code nulls last, slug
)) from public.species s
where exists (select 1 from public.planting_lines l where l.species = s.slug);
```

## Authentication and public access

`public.users` is the approved email list, managed by active users at `/users`. The authentication migration supplies the initial profiles. Supabase creates Auth identities on first sign-in and links confirmed, normalized email addresses to stable application user IDs. Deactivated profiles lose write and AI access.

Public visitors can read planting history, including historical deactivated records, but cannot read user profiles or write data. Writes use session-aware clients and database RLS. Before requesting a magic link, the server checks active membership with `SUPABASE_SECRET_KEY`; the `public.authorize_staff_signup` hook also blocks unapproved new Auth identities.

Locally, sign-in email is captured at http://127.0.0.1:54324. A development app pointed at hosted Supabase uses that project's email delivery.

### Production email with Resend

Configure the hosted Supabase project's custom SMTP settings:

| Setting | Value |
| --- | --- |
| Sender | `Whakatipu Reforestation Trust <noreply@wrtqt.org.nz>` |
| Host / port | `smtp.resend.com` / `465` (TLS) |
| Username | `resend` |
| Password | Dedicated Resend sending API key for the verified `wrtqt.org.nz` domain |

Keep the key in Supabase; the app needs no Resend SDK or environment variable. Verify the sending domain before using this address.

Match hosted Auth configuration to [`config.toml`](config.toml):

- Enable email signup and confirmation, with the Before User Created hook set to `public.authorize_staff_signup`.
- Set Site URL and `NEXT_PUBLIC_APP_URL` to the app's HTTPS origin. Allow its `/auth/confirm` callback URLs. Preview environments also need an explicit, allowed origin; the app does not fall back to `VERCEL_URL`.
- Use [`templates/magic-link.html`](templates/magic-link.html) for both **Confirm signup** and **Magic link**. Preserve its token-hash link to `/auth/confirm`.
- Use a one-hour email OTP expiry and a 60-second resend interval. Disable email link tracking so sign-in URLs remain intact.

Verify first-time and returning-user sign-in with an approved address, including access to an edit page and requesting a new link after expiry or consumption. Local testing uses the captured inbox.

## Hosted database setup

1. Provision Supabase and apply migrations in timestamp order. For an existing database, reconcile migration history before replaying SQL or enabling automated migrations.
2. Configure hosted Auth and SMTP as above.
3. Point `.env.local` at the hosted URL and secret key, preview the seed, then run with `--write`. Restore local settings afterward.
4. Set the hosted URL, publishable key, secret key and app origin in the Next.js deployment environment before building.
5. Verify public reads, sign-in, protected edits and recorded season totals.

Local startup does not configure a hosted project. Automated migration deployment requires a separately configured Supabase integration or CI workflow.

## Database checks

Run SQL checks through Studio's SQL Editor. Read each file's prerequisites before running it.

- [`schema_check.sql`](checks/schema_check.sql): schema, provenance, seed counts and historical season totals after a fresh import.
- [`access_rules_check.sql`](checks/access_rules_check.sql): public, unapproved and active-user permissions; requires a linked active Auth identity and rolls back fixtures.
- [`anonymous_crud_check.sql`](checks/anonymous_crud_check.sql): public reads and denied anonymous writes.
- [`auth_identity_check.sql`](checks/auth_identity_check.sql): identity linking, email changes, deactivation and audit attribution; run as postgres, fixtures roll back.
- [`historical_seed_access_test.sql`](checks/historical_seed_access_test.sql): seed-role reads, linked inserts, generated IDs and totals access; fixtures roll back.
- [`layout_summary_test.sql`](checks/layout_summary_test.sql): compact navigation, review scope, historical search aliases, public permissions and empty-history recovery; local fixtures roll back.
- [`event_correction_test.sql`](checks/event_correction_test.sql): atomic event corrections, failure rollback, area/site validation, preserved history, actual totals and staff permissions; local fixtures roll back.
- Other `*_test.sql` files cover species references and historical deactivation behaviour.

`npm test` includes JSON validation and relationship tests. Live database tests use the configured Supabase environment; see `tests/live-env.ts`.
