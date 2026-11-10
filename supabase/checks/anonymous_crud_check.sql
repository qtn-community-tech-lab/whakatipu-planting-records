-- Run as postgres after all migrations. Anonymous reads/edits and denied operations.
-- All fixture rows are rolled back.
begin;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
declare
  fixture_slug text := 'anonymous-crud-check-' || txid_current();
  fixture_season smallint;
  fixture_event bigint;
  fixture_line bigint;
  t text;
  key_column text;
  key_value text;
  update_column text;
  changed bigint;
begin
  select candidate::smallint into strict fixture_season
  from generate_series(-32768, -32000) candidate
  where not exists (select 1 from public.seasons where id = candidate or year = candidate)
  limit 1;

  insert into public.seasons (id, slug, label, year, half)
    values (fixture_season, fixture_slug, 'Anonymous CRUD check', fixture_season, 'autumn');
  insert into public.sites (slug, name) values (fixture_slug, 'Anonymous CRUD check');
  insert into public.areas (slug, site, name) values (fixture_slug, fixture_slug, 'Anonymous CRUD check');
  insert into public.species (slug, scientific_name) values (fixture_slug, 'Anonymous CRUD check');
  insert into public.planting_events (area, season, planted_on)
    values (fixture_slug, fixture_season, current_date) returning id into fixture_event;
  insert into public.planting_lines (planting_event, species, quantity)
    values (fixture_event, fixture_slug, 1) returning id into fixture_line;

  -- Check every application table and ensure anonymous deletes are denied.
  foreach t in array array['planting_lines', 'planting_events', 'species', 'areas', 'sites', 'seasons'] loop
    key_column := case when t in ('species', 'areas', 'sites') then 'slug' else 'id' end;
    key_value := case t
      when 'planting_lines' then fixture_line::text
      when 'planting_events' then fixture_event::text
      when 'seasons' then fixture_season::text
      else fixture_slug end;

    execute format('select count(*) from public.%I where %I::text = $1', t, key_column)
      into changed using key_value;
    if changed <> 1 then raise exception 'Anonymous SELECT failed for %', t; end if;

    update_column := case t
      when 'planting_lines' then 'quantity'
      when 'planting_events' then 'notes'
      when 'species' then 'scientific_name'
      when 'seasons' then 'label'
      else 'name' end;
    -- Assigning a regular column to itself runs UPDATE policies and edit-trail triggers.
    execute format('update public.%I set %I = %I where %I::text = $1', t, update_column, update_column, key_column)
      using key_value;
    get diagnostics changed = row_count;
    if changed <> 1 then raise exception 'Anonymous UPDATE failed for %', t; end if;

    begin
      execute format('delete from public.%I where %I::text = $1', t, key_column) using key_value;
      raise exception 'Anonymous DELETE unexpectedly allowed for %', t;
    exception when insufficient_privilege then null;
    end;
    raise notice 'PASS: anonymous INSERT, SELECT, UPDATE allowed; DELETE denied on %', t;
  end loop;

  if has_table_privilege('anon', 'public.users', 'SELECT')
    or has_table_privilege('anon', 'public.users', 'INSERT')
    or has_table_privilege('anon', 'public.users', 'UPDATE')
    or has_table_privilege('anon', 'public.users', 'DELETE') then
    raise exception 'Anonymous access to users is still granted';
  end if;
  begin
    update public.users set is_staff = true;
    raise exception 'Anonymous users UPDATE unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: anonymous users access denied';
end $$;

rollback;
