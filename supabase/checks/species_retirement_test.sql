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
  (select jsonb_agg(to_jsonb(l) order by l.id) from public.planting_lines l) as lines,
  (select jsonb_agg(to_jsonb(l) order by l.line_id) from public.line_details l) as details,
  (select jsonb_agg(to_jsonb(t) order by t.species) from public.totals_by_species t) as species,
  (select jsonb_agg(to_jsonb(t) order by t.site) from public.totals_by_site t) as sites,
  (select jsonb_agg(to_jsonb(t) order by t.season) from public.totals_by_season t) as seasons;

reset role;
update public.species set deactivated_at = now() where slug = 'retirement-test-species';
select pg_temp.assert_true(
  (select deactivated_at = now() from public.species where slug = 'retirement-test-species'), 'Retirement must persist');

set local role anon;
select pg_temp.assert_true(
  (select scientific_name = 'Historical test species' and deactivated_at is not null
   from public.species where slug = 'retirement-test-species'),
  'Public readers must resolve deactivated species without development policies');
select pg_temp.assert_true(
  not exists (select 1 from public.species
    where slug = 'retirement-test-species' and deactivated_at is null),
  'Active selectors must omit deactivated species');

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

reset role;
insert into public.questions (slug, question, deactivated_at)
  values ('retirement-test-question', 'Historical question', now());
insert into public.notes (line, question, kind, text, deactivated_at)
  select id, 'retirement-test-question', 'confirm', 'Historical note', now()
  from public.planting_lines where legacy_code = 'RETIREMENT-HISTORY';
update public.sites set deactivated_at = now() where slug = 'retirement-test-site';
update public.areas set deactivated_at = now() where slug = 'retirement-test-area';

set local role anon;
select pg_temp.assert_true(
  exists (select 1 from public.sites where slug = 'retirement-test-site' and deactivated_at is not null)
  and exists (select 1 from public.areas where slug = 'retirement-test-area' and deactivated_at is not null)
  and exists (select 1 from public.questions where slug = 'retirement-test-question' and deactivated_at is not null)
  and exists (select 1 from public.notes where question = 'retirement-test-question' and deactivated_at is not null),
  'Public readers must resolve deactivated sites, areas, questions and notes');
select pg_temp.assert_true(
  (select quantity = 27 from public.line_details where legacy_code = 'RETIREMENT-HISTORY'),
  'Deactivating reference data must preserve joined planting history');

reset role;
update public.planting_lines set deactivated_at = now() where legacy_code = 'RETIREMENT-HISTORY';
update public.planting_events set deactivated_at = now() where area = 'retirement-test-area';
set local role anon;
select pg_temp.assert_true(
  exists (select 1 from public.planting_lines where legacy_code = 'RETIREMENT-HISTORY' and deactivated_at is not null)
  and exists (select 1 from public.planting_events where area = 'retirement-test-area' and deactivated_at is not null),
  'Public readers must resolve deactivated events and lines');
select pg_temp.assert_true(
  not exists (select 1 from public.line_details where legacy_code = 'RETIREMENT-HISTORY'),
  'History views must still exclude deactivated events and lines');

rollback;
