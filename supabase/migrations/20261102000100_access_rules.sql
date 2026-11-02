-- WRT planting database: access rules.
-- Run once in Supabase > SQL Editor, after schema.sql.
--
-- Who can do what
--   Signed out ............ nothing at all.
--   Signed in (volunteer) . read live rows: places, species, seasons, plantings,
--                           and the review questions, so "needs review" totals
--                           are right for them too. No writes.
--   Staff ................. read everything, including retired rows; add and edit.
--   Nobody in the app ..... deletes rows, makes anyone staff, edits seasons, or
--                           creates or changes spreadsheet-history rows.
--   SQL Editor / secret key bypass these rules: keep the secret key for the import.

begin;

-- ---------------------------------------------------------------------------
-- 1. Table privileges: take away everything the rules don't need.
--    Supabase grants anon and authenticated full access to new tables by default;
--    row-level security filters rows, these grants remove whole operations.
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;

revoke delete, truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update on public.seasons, public.users from authenticated;

-- Views are read-only.
revoke insert, update on public.line_details, public.totals_by_site, public.totals_by_area,
  public.totals_by_species, public.totals_by_season from authenticated;

-- Future tables start locked too: each new table must grant what it needs.
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- 2. is_staff(): true only for a live staff row. It reads users past their own
--    rules, so it is security definer with an empty search path.
-- ---------------------------------------------------------------------------
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and is_staff and retired_at is null
  );
$$;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row rules
-- ---------------------------------------------------------------------------

-- users: you see yourself; staff see everyone. No app writes at all.
create policy "read self or staff" on public.users for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));

-- seasons: fixed list, readable by anyone signed in.
create policy "read" on public.seasons for select to authenticated using (true);

-- Everything else: signed in reads live rows, staff read all and write.
do $$
declare t text;
begin
  foreach t in array array['sites', 'areas', 'species', 'plantings', 'planting_lines', 'questions', 'notes'] loop
    execute format(
      'create policy "read live rows, staff read all" on public.%I for select to authenticated
         using (retired_at is null or (select public.is_staff()))', t);
    execute format(
      'create policy "staff add" on public.%I for insert to authenticated
         with check ((select public.is_staff()))', t);
    execute format(
      'create policy "staff edit" on public.%I for update to authenticated
         using ((select public.is_staff())) with check ((select public.is_staff()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Guards the rules can't express, for anyone signed in (auth.uid() set).
--    The import and SQL Editor run without a signed-in user and skip them.
-- ---------------------------------------------------------------------------

-- Retired rows stay retired from the app.
create function public.guard_retired() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and old.retired_at is not null and new.retired_at is null then
    raise exception 'Retired rows can only be restored by an administrator'
      using errcode = '42501';
  end if;
  return new;
end $$;

-- Spreadsheet history is created and re-linked only by the import.
create function public.guard_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_table_name = 'plantings' then
    if (tg_op = 'INSERT' and new.source = 'workbook')
       or (tg_op = 'UPDATE' and new.source is distinct from old.source) then
      raise exception 'Spreadsheet plantings come from the import only' using errcode = '42501';
    end if;
  elsif tg_table_name = 'planting_lines' then
    if (tg_op = 'INSERT' and new.legacy_code is not null)
       or (tg_op = 'UPDATE' and new.legacy_code is distinct from old.legacy_code) then
      raise exception 'Spreadsheet codes are set by the import only' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['sites', 'areas', 'species', 'plantings', 'planting_lines', 'questions', 'notes'] loop
    execute format('create trigger guard_retired before update on public.%I
                      for each row execute function public.guard_retired()', t);
  end loop;
end $$;

create trigger guard_history before insert or update on public.plantings
  for each row execute function public.guard_history();
create trigger guard_history before insert or update on public.planting_lines
  for each row execute function public.guard_history();

-- Trigger functions can't be called directly; this only keeps them runnable
-- for signed-in edits after the function lockdown above.
grant execute on function public.touch_row(), public.guard_retired(), public.guard_history() to authenticated;

commit;
