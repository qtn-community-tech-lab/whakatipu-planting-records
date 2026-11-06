-- WRT planting database: clearer names, from James Bayly's review of #4.
-- Run once in Supabase > SQL Editor, after every other migration: its date sorts it
-- last, and on the hosted project that means after line_records.sql. Deploy the app
-- that reads the new names at the same time: the old app reads plantings and retired_at.
--
--   plantings ............... planting_events (a planting line is something else)
--   planting_lines.planting . planting_lines.planting_event
--   retired_at .............. deactivated_at, on every table that has it
--   guard_retired() ......... guard_deactivated(), and its triggers
--
-- Views, row rules, indexes' conditions and foreign keys follow a rename by themselves.
-- Function bodies are text, so is_staff(), guard_deactivated() and guard_history()
-- are rewritten below with the new names. Renaming a function keeps its grants and
-- the triggers that call it; create or replace keeps its grants and settings.
-- No row changes.
begin;

-- 1. plantings -> planting_events -------------------------------------------
alter table public.plantings rename to planting_events;
alter table public.planting_lines rename column planting to planting_event;
alter index public.plantings_season_idx rename to planting_events_season_idx;
alter index public.one_workbook_planting_per_area_season
  rename to one_workbook_planting_event_per_area_season;
alter sequence public.plantings_id_seq rename to planting_events_id_seq;

-- Constraints named after the old table (plantings_pkey, plantings_area_fkey, ...) follow too,
-- so nothing in the schema still says "plantings".
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.planting_events'::regclass and conname like 'plantings\_%' loop
    execute format('alter table public.planting_events rename constraint %I to %I',
                   c, 'planting_events_' || substr(c, length('plantings_') + 1));
  end loop;
end $$;
alter table public.planting_lines
  rename constraint planting_lines_planting_fkey to planting_lines_planting_event_fkey;

-- 2. retired_at -> deactivated_at -------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users', 'sites', 'areas', 'species', 'planting_events',
                           'planting_lines', 'questions', 'notes'] loop
    execute format('alter table public.%I rename column retired_at to deactivated_at', t);
  end loop;
end $$;

-- 3. Functions that name the old column or table ---------------------------

-- is_staff(): true only for a live staff row. Security definer, empty search path, as before.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and is_staff and deactivated_at is null
  );
$$;

-- Deactivated rows stay deactivated from the app.
alter function public.guard_retired() rename to guard_deactivated;
create or replace function public.guard_deactivated() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and old.deactivated_at is not null and new.deactivated_at is null then
    raise exception 'Deactivated rows can only be restored by an administrator'
      using errcode = '42501';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['sites', 'areas', 'species', 'planting_events', 'planting_lines',
                           'questions', 'notes'] loop
    execute format('alter trigger guard_retired on public.%I rename to guard_deactivated', t);
  end loop;
end $$;

-- Spreadsheet history is created and re-linked only by the import.
create or replace function public.guard_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_table_name = 'planting_events' then
    if (tg_op = 'INSERT' and new.source = 'workbook')
       or (tg_op = 'UPDATE' and new.source is distinct from old.source) then
      raise exception 'Spreadsheet planting events come from the import only' using errcode = '42501';
    end if;
  elsif tg_table_name = 'planting_lines' then
    if (tg_op = 'INSERT' and new.legacy_code is not null)
       or (tg_op = 'UPDATE' and new.legacy_code is distinct from old.legacy_code) then
      raise exception 'Spreadsheet codes are set by the import only' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

commit;
