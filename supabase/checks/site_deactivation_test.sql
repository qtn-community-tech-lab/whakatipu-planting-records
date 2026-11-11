-- Local regression test after all migrations. Every fixture rolls back. Run with psql -v ON_ERROR_STOP=1 -f this_file.sql.
begin;

-- Exercise production public-read policies, without development access.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and policyname like 'dev anonymous %'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

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

set local role anon;
create temp table retirement_before as select
  (select jsonb_agg(to_jsonb(e) order by e.id) from public.planting_events e) as events,
  (select jsonb_agg(to_jsonb(a) order by a.slug) from public.areas a) as areas,
  (select jsonb_agg(to_jsonb(l) order by l.id) from public.planting_lines l) as lines,
  (select jsonb_agg(to_jsonb(l) order by l.line_id) from public.line_details l) as details,
  (select jsonb_agg(to_jsonb(t) order by t.species) from public.totals_by_species t) as species,
  (select jsonb_agg(to_jsonb(t) order by t.site) from public.totals_by_site t) as sites,
  (select jsonb_agg(to_jsonb(t) order by t.season) from public.totals_by_season t) as seasons;

reset role;
update public.sites set deactivated_at = now() where slug = 'retirement-test-site';
select pg_temp.assert_true(
  (select deactivated_at = now() from public.sites where slug = 'retirement-test-site'), 'Deactivation must persist');

set local role anon;
select pg_temp.assert_true(
  (select name = 'Retirement test' and deactivated_at is not null
   from public.sites where slug = 'retirement-test-site'),
  'Public readers must resolve deactivated sites without development policies');
select pg_temp.assert_true(
  not exists (select 1 from public.sites
    where slug = 'retirement-test-site' and deactivated_at is null),
  'Active selectors must omit deactivated sites');
select pg_temp.assert_true(
  (select jsonb_agg(to_jsonb(e) order by e.id) from public.planting_events e) = (select events from retirement_before),
  'Site deactivation must preserve every event and audit value');
select pg_temp.assert_true(
  (select jsonb_agg(to_jsonb(a) order by a.slug) from public.areas a) = (select areas from retirement_before),
  'Site deactivation must leave child areas unchanged');

select pg_temp.assert_true(
  (select jsonb_agg(to_jsonb(l) order by l.id) from public.planting_lines l) = (select lines from retirement_before),
  'Site deactivation must preserve every historical line, key, quantity and audit value');
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

reset role;
rollback;
