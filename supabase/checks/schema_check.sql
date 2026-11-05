-- WRT planting database: did the whole SQL run?
-- Paste into Supabase > SQL Editor after all six migrations (and the import).
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
  union all select 'access rules', 'functions (is_staff, touch_row, guard_deactivated, guard_history)', 4,
    (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('is_staff', 'touch_row', 'guard_deactivated', 'guard_history'))
  union all select 'access rules', 'row rules (policies: 23 here, 8 from public_reads)', 31,
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
  -- Public reads file: signed out reads, never writes, never sees users ----
  union all select 'public reads', 'signed out can write no table', 0,
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
  union all select 'import', 'sites', 39,          (select count(*)::int from public.sites)
  union all select 'import', 'areas', 78,          (select count(*)::int from public.areas)
  union all select 'import', 'species', 164,       (select count(*)::int from public.species)
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
