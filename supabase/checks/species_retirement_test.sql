-- Local regression test after all migrations. Every fixture and policy change
-- rolls back. Run with psql -v ON_ERROR_STOP=1 -f this_file.sql.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;

insert into public.sites (slug, name) values ('retirement-test-site', 'Retirement test');
insert into public.areas (slug, site, name)
  values ('retirement-test-area', 'retirement-test-site', 'Retirement test area');
insert into public.species (slug, scientific_name, register_code) values
  ('retirement-test-species', 'Historical test species', 'RETIREMENT-TEST'),
  ('retirement-test-active', 'Active test species', null);
insert into public.planting_events (area, season, source)
  values ('retirement-test-area', 0, 'workbook');
insert into public.planting_lines (planting_event, species, quantity, legacy_code)
  select id, 'retirement-test-species', 27, 'RETIREMENT-HISTORY'
  from public.planting_events where area = 'retirement-test-area';
insert into public.planting_lines (planting_event, species, quantity)
  select id, 'retirement-test-active', 13
  from public.planting_events where area = 'retirement-test-area';

create temp table retirement_before as select
  (select jsonb_agg(to_jsonb(l) order by l.id) from public.planting_lines l) as lines,
  (select jsonb_agg(to_jsonb(l) order by l.line_id) from public.line_details l) as details,
  (select jsonb_agg(to_jsonb(t) order by t.species) from public.totals_by_species t) as species,
  (select jsonb_agg(to_jsonb(t) order by t.site) from public.totals_by_site t) as sites,
  (select jsonb_agg(to_jsonb(t) order by t.season) from public.totals_by_season t) as seasons;

update public.species set deactivated_at = now() where slug = 'retirement-test-species' and deactivated_at is null;
select pg_temp.assert_true(
  (select deactivated_at = now() from public.species where slug = 'retirement-test-species'), 'Retirement must persist');
-- The query's active-only predicate makes subsequent retirement a no-op.
update public.species set deactivated_at = now() + interval '1 day'
  where slug = 'retirement-test-species' and deactivated_at is null;
select pg_temp.assert_true(
  (select deactivated_at = now() from public.species where slug = 'retirement-test-species'), 'Repeated retirement must retain its timestamp');

select pg_temp.assert_true(
  (select jsonb_agg(to_jsonb(l) order by l.id) from public.planting_lines l) = (select lines from retirement_before),
  'Retirement must preserve every historical line, key, quantity and audit value');
select pg_temp.assert_true(
  (select jsonb_agg(to_jsonb(l) order by l.line_id) from public.line_details l) = (select details from retirement_before),
  'Joined planting history must remain unchanged');
select pg_temp.assert_true(
  (select jsonb_agg(to_jsonb(t) order by t.species) from public.totals_by_species t) = (select species from retirement_before),
  'Species totals and splits must remain unchanged');
select pg_temp.assert_true(
  (select jsonb_agg(to_jsonb(t) order by t.site) from public.totals_by_site t) = (select sites from retirement_before),
  'Site totals and splits must remain unchanged');
select pg_temp.assert_true(
  (select jsonb_agg(to_jsonb(t) order by t.season) from public.totals_by_season t) = (select seasons from retirement_before),
  'Season totals and splits must remain unchanged');

do $$
begin
  begin
    insert into public.planting_lines (planting_event, species, quantity)
      select id, 'retirement-test-species', 9 from public.planting_events where area = 'retirement-test-area';
    raise exception 'A new line must reject a retired species';
  exception when check_violation then null;
  end;
  begin
    update public.planting_lines set species = 'retirement-test-species' where species = 'retirement-test-active';
    raise exception 'Species reassignment must reject a retired species';
  exception when check_violation then null;
  end;
end $$;
-- A line retaining its historical species remains editable.
update public.planting_lines set species = species, quantity = quantity where legacy_code = 'RETIREMENT-HISTORY';

-- Test the unchanged read policies independently of development CRUD.
drop policy "dev anonymous CRUD" on public.species;
set local role anon;
select pg_temp.assert_true(
  (select count(*) = 0 from public.species where slug = 'retirement-test-species'), 'Public reads must hide retired species');
select pg_temp.assert_true(
  (select count(*) = 1 from public.species where slug = 'retirement-test-active'), 'Public reads must retain active species');
reset role;

set local role authenticated;
select pg_temp.assert_true(not public.is_staff(), 'Reader must not be staff');
select pg_temp.assert_true(
  (select count(*) = 0 from public.species where slug = 'retirement-test-species'), 'Non-staff reads must hide retired species');
reset role;

-- A representative staff account exercises the existing staff-read-all policy.
create temp table retirement_staff as select gen_random_uuid() as id;
insert into auth.users (id, email) select id, id::text || '@retirement-test.invalid' from retirement_staff;
insert into public.users (id, name, is_staff) select id, 'Retirement test staff', true from retirement_staff;
select set_config('request.jwt.claim.sub', (select id::text from retirement_staff), true);
set local role authenticated;
select pg_temp.assert_true(public.is_staff(), 'Reader must be staff');
select pg_temp.assert_true(
  (select scientific_name = 'Historical test species' and register_code = 'RETIREMENT-TEST' and deactivated_at is not null
   from public.species where slug = 'retirement-test-species'), 'Staff history must resolve retired metadata');
select pg_temp.assert_true(
  (select quantity = 27 from public.line_details where legacy_code = 'RETIREMENT-HISTORY'), 'Staff history must retain retired species quantities');
select pg_temp.assert_true(
  (select plants = 27 from public.totals_by_species where species = 'retirement-test-species'), 'Staff totals must retain retired quantities');
reset role;

rollback;
