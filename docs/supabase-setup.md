# Supabase setup and migrations

Use this guide to create a fresh local Supabase project for this repository, then optionally apply its schema to a fresh hosted project. Run all shell commands from the repository root, beside `package.json`.

The migration creates the schema, access rules, views and database functions. It does not import the CSV history or switch the app's pages to Supabase. The current explorer still reads CSV files.

## 1. Install the tools

You need Node.js 20.9+, the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), and a running Docker-compatible container runtime such as Docker Desktop. On macOS, you can install the CLI with Homebrew:

```sh
brew install supabase/tap/supabase
```

Open your container runtime, then check the tools and install this app's dependencies:

```sh
node --version
supabase --version
docker info
npm ci
```

The examples use the globally installed `supabase` command. No additional npm dependency is needed. Local development does not require a hosted Supabase project or `supabase login`.

## 2. Create and start the local project

This repo includes `supabase/config.toml` and `supabase/migrations/20261023000000_create_planting_records.sql`, so a fresh checkout is already initialized. Only if `supabase/config.toml` is missing, create it with:

```sh
supabase init
```

Keep the existing migration. If you generate new configuration, commit `config.toml` and `supabase/.gitignore` so teammates can reuse it.

Start Supabase and apply any pending migrations:

```sh
supabase start
supabase migration up --local
supabase migration list --local
supabase status
```

The first start downloads container images and may apply the migration automatically. If `migration up` reports that the database is already up to date, that is expected. Check that version `20261023000000` is applied in the local migration list. These commands target your local stack.

Open the Studio URL printed by `supabase status` (normally `http://127.0.0.1:54323`). The public schema should contain 10 tables, including `sites`, `species` and `planting_events`, plus six reporting views. The domain tables start empty.

## 3. Configure the app's local connection

For a new checkout:

```sh
cp .env.example .env.local
```

If `.env.local` already exists, edit it instead. Copy the local API/project URL and publishable key from `supabase status` into these variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-local-publishable-key>
```

Use the URL reported by your CLI if it differs from the example. Older CLI versions may label the public key `anon`; that key also works with the client. Use the public key here, not the secret/service-role key or database password. `.env.local` is ignored by Git.

```sh
npm run dev
```

Open `http://localhost:3000`. Restart Next.js after changing environment variables. The Supabase clients now have connection settings; the pages will continue displaying CSV data until the database integration is wired in.

## 4. Prepare the first staff account

In local Studio, create a test user in **Authentication → Users** and copy its UUID. This is the Supabase Auth identity, separate from the 16-character WRT domain ID.

Open Studio's SQL editor and run this once, replacing the UUID, email and display name:

```sql
insert into public.users (
  id, email, display_name, auth_user_id, is_staff, created_by, updated_by
)
values (
  'usr_000000000001', 'staff@example.org', 'WRT staff',
  '<auth-user-uuid>', true, 'usr_000000000001', 'usr_000000000001'
);
```

The first domain user references itself as its audit actor. Later operator inserts can reference that user. Staff permissions require an active domain user linked to the Auth UUID with `is_staff = true`; signing in alone grants no editing rights. The app's sign-in and session-refresh flow still needs implementation.

## 5. Check the schema and generate types

Run the database linter and existing app tests:

```sh
supabase db lint --local
npm test
```

The app tests cover CSV/domain behavior and form validation. They do not test database permissions or RPC execution. Use a signed-in staff Supabase client to check writes and an anonymous client to check published reads; Studio's SQL editor uses privileged access and does not demonstrate client permissions.

Generate database types into a separate file for review:

```sh
supabase gen types typescript --local --schema public > db/types.generated.ts
```

Compare it with `db/types.ts` before adopting it. Preserve the `Db`, `LineDetails` and `retired` exports in a separate helper module when replacing the handwritten types. Historical `planting_date`, `event_type` and `quantity` must remain nullable.

## Daily development

Start your container runtime, then run:

```sh
npm run dev:local
```

This runs three steps in order: `supabase start`, `supabase migration up --local`, then `npm run dev`. The app starts only after Supabase and migrations succeed. Open `http://localhost:3000` for the app; Supabase Studio normally runs at `http://127.0.0.1:54323`. Connection settings still come from `.env.local` as described in step 3.

Press Ctrl+C to stop Next.js. Supabase runs in background containers; run `supabase stop` to stop them and retain local data. To run just one service, use `npm run dev` for the app or `supabase start` for Supabase. The Supabase CLI command itself does not launch Next.js.

For the next schema change:

```sh
supabase migration new describe_the_change
```

Edit the new SQL file, apply it with `migration up --local`, and regenerate types. Once a migration has been shared or applied, create another migration for subsequent changes. `supabase db reset --local` deletes local data and rebuilds from migrations; it is not needed for normal updates.

## Apply to a fresh hosted Supabase project

Create a new project in the [Supabase Dashboard](https://supabase.com/dashboard). Replace `<your-project-ref>` below with the reference from its Dashboard URL before running the commands:

```sh
supabase login
supabase link --project-ref <your-project-ref>
supabase migration list --linked
supabase db push --linked --dry-run
```

Check the project reference against its Dashboard URL. The dry run should list the initial migration. Apply it when ready:

```sh
supabase db push --linked
supabase migration list --linked
```

`--linked` targets the hosted project; `--local` targets your machine. This initial migration creates tables from scratch. A project that already has the WRT domain tables needs a separate ALTER migration based on its existing schema and migration history.

The push does not copy local Auth users or application data. Create the hosted staff account using step 4 in the hosted Dashboard. For a deployment, set the same two `NEXT_PUBLIC_SUPABASE_*` variables to that project's URL and publishable key in the hosting provider, then redeploy. Keep your local development settings pointed at the local stack.

For more detail, see Supabase's [local workflow](https://supabase.com/docs/guides/local-development/cli-workflows) and [CLI reference](https://supabase.com/docs/reference/cli).
