-- Local regression test after all migrations. Every fixture rolls back. Run with psql -v ON_ERROR_STOP=1 -f this_file.sql.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;

insert into public.sites (slug, name) values ('retirement-test-site', 'Retirement test');
insert into public.areas (slug, site, name)
  values ('retirement-test-area', 'retirement-test-site', 'Retirement test area');
insert into public.species (slug, scientific_name, register_code)
  values ('retirement-test-species', 'Historical test species', 'RETIREMENT-TEST');
insert into public.planting_events (area, season, source)
  values ('retirement-test-area', 0, 'workbook');
insert into public.planting_lines (planting_event, species, quantity, legacy_code)
  select id, 'retirement-test-species', 27, 'RETIREMENT-HISTORY'
  from public.planting_events where area = 'retirement-test-area';

create temp table retirement_before as select
  (select jsonb_agg(to_jsonb(l) order by l.id) from public.planting_lines l) as lines,
  (select jsonb_agg(to_jsonb(l) order by l.line_id) from public.line_details l) as details,
  (select jsonb_agg(to_jsonb(t) order by t.species) from public.totals_by_species t) as species,
  (select jsonb_agg(to_jsonb(t) order by t.site) from public.totals_by_site t) as sites,
  (select jsonb_agg(to_jsonb(t) order by t.season) from public.totals_by_season t) as seasons;

update public.species set deactivated_at = now() where slug = 'retirement-test-species';
select pg_temp.assert_true(
  (select deactivated_at = now() from public.species where slug = 'retirement-test-species'), 'Retirement must persist');

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

rollback;
