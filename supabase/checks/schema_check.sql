-- WRT planting database: did the whole SQL run?
-- Paste into Supabase > SQL Editor after all migrations (and the import).
-- It only reads. Every row should say PASS.

with expected (part, item, want, got) as (
  -- Schema file -------------------------------------------------------------
  select 'schema', 'fixed lists (enum types)', 6,
    (select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname in
        ('season_half', 'site_class', 'species_status', 'planting_type', 'planting_source', 'note_kind'))
  union all select 'schema', 'tables', 9,
    (select count(*)::int from pg_tables where schemaname = 'public' and tablename in
      ('users', 'sites', 'areas', 'species', 'seasons', 'planting_events', 'planting_lines', 'questions', 'notes'))
  union all select 'schema', 'tables with row-level security on', 9,
    (select count(*)::int from pg_tables where schemaname = 'public' and rowsecurity and tablename in
      ('users', 'sites', 'areas', 'species', 'seasons', 'planting_events', 'planting_lines', 'questions', 'notes'))
  union all select 'schema', 'views', 5,
    (select count(*)::int from pg_views where schemaname = 'public' and viewname in
      ('line_details', 'totals_by_site', 'totals_by_area', 'totals_by_species', 'totals_by_season'))
  union all select 'schema', 'indexes', 5,
    (select count(*)::int from pg_indexes where schemaname = 'public' and indexname in
      ('one_workbook_planting_event_per_area_season', 'planting_events_season_idx', 'one_line_per_species',
       'planting_lines_species_idx', 'notes_question_idx'))
  union all select 'schema', 'edit-trail triggers (touch)', 7,
    (select count(*)::int from pg_trigger where not tgisinternal and tgname = 'touch')
  union all select 'schema', 'seasons, Autumn 2015 to Autumn 2027', 25,
    (select count(*)::int from public.seasons)
  union all select 'schema', 'seasons numbered 0 to 24 in order', 1,
    (select (min(id) = 0 and max(id) = 24 and count(distinct id) = 25)::int from public.seasons)

  -- Access rules file -------------------------------------------------------
  union all select 'access rules', 'functions (membership, signup, linking, audit and guards)', 7,
    (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in
        ('current_app_user_id', 'authorize_staff_signup', 'link_auth_user_to_staff',
         'link_existing_auth_user_to_staff', 'touch_row', 'guard_deactivated', 'guard_history'))
  union all select 'access rules', 'row policies (active membership writes and public history reads)', 31,
    (select count(*)::int from pg_policies where schemaname = 'public')
  union all select 'access rules', 'guard triggers (deactivated 7, history 2)', 9,
    (select count(*)::int from pg_trigger where not tgisinternal and tgname in ('guard_deactivated', 'guard_history'))
  union all select 'access rules', 'signed in can delete from no table', 0,
    (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and has_table_privilege('authenticated', c.oid, 'delete'))
  union all select 'access rules', 'signed in cannot write seasons or users', 0,
    (select count(*)::int from (values ('public.seasons'), ('public.users')) v (t)
      where has_table_privilege('authenticated', v.t, 'insert')
         or has_table_privilege('authenticated', v.t, 'update'))
  -- Anonymous public read access; all write grants were removed ------------
  union all select 'public reads', 'signed out can write no application table', 0,
    (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and (has_table_privilege('anon', c.oid, 'insert')
          or has_table_privilege('anon', c.oid, 'update')
          or has_table_privilege('anon', c.oid, 'delete')))
  union all select 'public reads', 'signed out cannot read users', 0,
    (select has_table_privilege('anon', 'public.users', 'select')::int)
  union all select 'seasons page', 'views (season_species, season_sites, totals_by_question)', 3,
    (select count(*)::int from pg_views where schemaname = 'public' and viewname in
      ('season_species', 'season_sites', 'totals_by_question'))

  -- Naming file: nothing still has an old name ----------------------------
  union all select 'naming', 'deactivated_at columns (users and the 7 history tables)', 8,
    (select count(*)::int from information_schema.columns
      where table_schema = 'public' and column_name = 'deactivated_at'
        and table_name in (select tablename from pg_tables where schemaname = 'public'))
  union all select 'authentication', 'email and Auth identity columns', 2,
    (select count(*)::int from information_schema.columns
      where table_schema = 'public' and table_name = 'users'
        and column_name in ('email', 'auth_user_id'))
  union all select 'authentication', 'removed is_staff column', 0,
    (select count(*)::int from information_schema.columns
      where table_schema = 'public' and table_name = 'users' and column_name = 'is_staff')
  union all select 'authentication', 'normalized email unique index', 1,
    (select count(*)::int from pg_indexes
      where schemaname = 'public' and tablename = 'users' and indexname = 'users_email_lower_key')
  union all select 'authentication', 'new application IDs default to UUIDs', 1,
    (select count(*)::int from information_schema.columns
      where table_schema = 'public' and table_name = 'users' and column_name = 'id'
        and column_default like 'gen_random_uuid%')
  union all select 'authentication', 'Auth foreign key uses ON DELETE SET NULL', 1,
    (select count(*)::int from pg_constraint c
      where c.conrelid = 'public.users'::regclass and c.conname = 'users_auth_user_id_fkey'
        and c.confdeltype = 'n')
  union all select 'authentication', 'application user ID no longer references auth.users', 0,
    (select count(*)::int from pg_constraint c
      where c.conrelid = 'public.users'::regclass and c.conname = 'users_id_fkey')
  union all select 'naming', 'columns, functions, triggers, indexes, sequences or constraints with an old name', 0,
    (select count(*)::int from (
       select column_name::text as name from information_schema.columns
         where table_schema = 'public' and column_name in ('retired_at', 'planting')
       union all select proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and (proname like '%retired%' or prosrc like '%retired_at%' or prosrc like '%plantings%')
       union all select sequencename::text from pg_sequences where schemaname = 'public' and sequencename like '%plantings%'
       union all select tgname::text from pg_trigger where not tgisinternal and tgname like '%retired%'
       union all select indexname::text from pg_indexes where schemaname = 'public' and indexname like '%plantings%'
       union all select conname::text from pg_constraint c join pg_namespace n on n.oid = c.connamespace
         where n.nspname = 'public' and (conname like 'plantings\_%' or conname = 'planting_lines_planting_fkey')
       union all select tablename::text from pg_tables where schemaname = 'public' and tablename = 'plantings'
     ) old)

  -- Import (run by scripts/import-workbook.ts) ------------------------------
  union all select 'import', 'sites', 39, (select count(*)::int from public.sites)
  union all select 'import', 'areas', 78, (select count(*)::int from public.areas)
  union all select 'import', 'species with workbook register codes', 164,
    (select count(*)::int from public.species where register_code is not null)
  union all select 'import', 'questions', 9,       (select count(*)::int from public.questions)
  union all select 'import', 'planting events', 360, (select count(*)::int from public.planting_events where source = 'workbook')
  union all select 'import', 'planting lines', 5449, (select count(*)::int from public.planting_lines where legacy_code is not null)
  union all select 'import', 'planting lines missing their workbook file, sheet or cell', 0,
    (select count(*)::int from public.planting_lines where legacy_code is not null
      and (source_file is null or source_sheet is null or source_cell is null))
  union all select 'import', 'review notes (1,377 until the Slope Hill 2024 ruling on 3 Nov)', 1339, (select count(*)::int from public.notes)
  union all select 'import', 'season TOTAL cells filled', 23,
    (select count(*)::int from public.seasons where workbook_total is not null)
  union all select 'import', 'seasons that differ from their TOTAL cell', 0,
    (select count(*)::int from public.totals_by_season
      where workbook_total is not null and plants is distinct from workbook_total)
)
select part, item, want, got, case when want = got then 'PASS' else 'FAIL' end as result
from expected;
