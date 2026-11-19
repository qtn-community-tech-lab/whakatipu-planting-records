-- Run as postgres after migrations. All fixtures roll back.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;

select pg_temp.assert_true(
  (select bool_and(has_table_privilege('service_role', name, 'SELECT')
    and has_table_privilege('service_role', name, 'INSERT'))
   from unnest(array['public.sites', 'public.areas', 'public.species',
     'public.questions', 'public.seasons', 'public.planting_events',
     'public.planting_lines', 'public.notes']) as tables(name)),
  'The seed role must read and insert every imported table');

set local role service_role;
insert into public.sites (slug, name) values ('seed-access-test-site', 'Seed access test');
insert into public.areas (slug, site, name)
  values ('seed-access-test-area', 'seed-access-test-site', 'Seed access test');
insert into public.species (slug, scientific_name)
  values ('seed-access-test-species', 'Seed access test');
insert into public.questions (slug, question)
  values ('seed-access-test-question', 'Seed access test');
insert into public.seasons (id, slug, label, year, half)
  values (32000, 'autumn-2188', 'Autumn 2188', 2188, 'autumn');

with event as (
  insert into public.planting_events (area, season, source)
    values ('seed-access-test-area', 32000, 'workbook') returning id
), line as (
  insert into public.planting_lines (planting_event, species, quantity, legacy_code)
    select id, 'seed-access-test-species', 7, 'seed-access-test-line' from event returning id
)
insert into public.notes (line, question, kind, text)
  select id, 'seed-access-test-question', 'fyi', 'Seed access test' from line;

select pg_temp.assert_true(
  (select plants = 7 from public.totals_by_season where season = 'autumn-2188'),
  'The seed role must read totals through the dependent reporting views');

rollback;
