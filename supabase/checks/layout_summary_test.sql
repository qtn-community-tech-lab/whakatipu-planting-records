-- Local-only regression fixtures; every change rolls back.
-- Run after migrations with psql -v ON_ERROR_STOP=1 -f this_file.sql.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;

-- Exercise the production read policies, without development access.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and policyname like 'dev anonymous %'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

set local role anon;
create temp table layout_before as select public.read_layout_summary(true) as data;
reset role;

insert into public.seasons (id, slug, label, year, half) values
  (30000, 'autumn-2090', 'Autumn 2090', 2090, 'autumn'),
  (30001, 'spring-2090', 'Spring 2090', 2090, 'spring'),
  (30002, 'autumn-2091', 'Autumn 2091', 2091, 'autumn');
insert into public.sites (slug, name, deactivated_at) values
  ('layout-test-active', 'Layout active site', null),
  ('layout-test-old', 'Layout historical site', now());
insert into public.areas (slug, site, name, deactivated_at) values
  ('layout-test-east', 'layout-test-active', 'East Kōwhai', null),
  ('layout-test-west', 'layout-test-old', 'West', now());
insert into public.species (slug, scientific_name, maori_name, deactivated_at) values
  ('layout-test-planted', 'Layout planted species', 'Kōwhai', null),
  ('layout-test-review', 'Layout review species', null, now()),
  ('layout-test-unknown', 'Layout unknown species', null, null),
  ('layout-test-unplanted', 'Layout unplanted species', null, null);
insert into public.planting_events (area, season, source, deactivated_at) values
  ('layout-test-east', 30000, 'workbook', null),
  ('layout-test-west', 30001, 'workbook', null),
  ('layout-test-east', 30002, 'workbook', now());
insert into public.planting_lines (planting_event, species, quantity, legacy_code, site_original, species_original)
  select id, 'layout-test-planted', 12, 'LAYOUT-CONFIRMED', 'Old reserve header', 'Old Kōwhai spelling'
  from public.planting_events where area = 'layout-test-east' and season = 30000;
insert into public.planting_lines (planting_event, species, quantity, legacy_code)
  select id, 'layout-test-unknown', null, 'LAYOUT-UNKNOWN'
  from public.planting_events where area = 'layout-test-east' and season = 30000;
insert into public.planting_lines (planting_event, species, quantity, legacy_code, site_original)
  select id, 'layout-test-review', 35, 'LAYOUT-REVIEW', 'Historical header'
  from public.planting_events where area = 'layout-test-west';
insert into public.planting_lines (planting_event, species, quantity, legacy_code, deactivated_at)
  select id, 'layout-test-planted', 888, 'LAYOUT-DEACTIVATED-LINE', now()
  from public.planting_events where area = 'layout-test-east' and season = 30000;
insert into public.planting_lines (planting_event, species, quantity, legacy_code)
  select id, 'layout-test-planted', 999, 'LAYOUT-DEACTIVATED-EVENT'
  from public.planting_events where area = 'layout-test-east' and season = 30002;
insert into public.questions (slug, question) values
  ('layout-test-first', 'First test question'), ('layout-test-second', 'Second test question');
insert into public.notes (line, question, kind, text)
  select id, 'layout-test-first', 'confirm', 'layout-test-hidden-note'
  from public.planting_lines where legacy_code = 'LAYOUT-REVIEW';
insert into public.notes (line, question, kind)
  select id, 'layout-test-second', 'ruling'
  from public.planting_lines where legacy_code = 'LAYOUT-REVIEW';
insert into public.notes (line, question, kind)
  select id, 'layout-test-first', 'fyi'
  from public.planting_lines where legacy_code = 'LAYOUT-UNKNOWN';
update public.species set over_5m = true where slug = 'layout-test-planted';
update public.areas set class = 'community' where slug = 'layout-test-east';

set local role anon;
create temp table layout_results as select public.read_layout_summary(true) as all_data,
  public.read_layout_summary(false) as confirmed;

select pg_temp.assert_true(
  (select not prosecdef from pg_proc where oid = 'public.read_layout_summary(boolean)'::regprocedure),
  'The layout function must respect caller privileges and RLS');
select pg_temp.assert_true(
  (select (all_data->>'siteCount')::integer = (data->>'siteCount')::integer + 1
    and (all_data->>'speciesCount')::integer = (data->>'speciesCount')::integer + 3
    and (all_data->>'records')::integer = (data->>'records')::integer + 3
   from layout_results, layout_before),
  'Active register counts must exclude deactivated references; every visible line must count once');
select pg_temp.assert_true(
  (select item->>'total' = '12' and item->>'records' = '2' and item->>'needsReview' = '0'
   from layout_results, jsonb_array_elements(all_data->'seasons') item where item->>'slug' = 'autumn-2090'),
  'Unknown quantities and FYI notes must preserve record counts without adding review plants');
select pg_temp.assert_true(
  (select item->>'total' = '35' and item->>'records' = '1' and item->>'needsReview' = '35'
   from layout_results, jsonb_array_elements(all_data->'seasons') item where item->>'slug' = 'spring-2090'),
  'Several review notes must not multiply a planting quantity');
select pg_temp.assert_true(
  (select item->>'total' = '0' and item->>'records' = '0' and item->>'needsReview' = '0'
   from layout_results, jsonb_array_elements(confirmed->'seasons') item where item->>'slug' = 'spring-2090'),
  'Confirmed-only rings must retain the historical season with zero scoped records');
select pg_temp.assert_true(
  (select item->>'total' = '35' and item->'terms' @> '["Historical header", "West"]'::jsonb
   from layout_results, jsonb_array_elements(all_data->'places') item where item->>'slug' = 'layout-test-old'),
  'Deactivated sites and areas must retain historical quantities and search aliases');
select pg_temp.assert_true(
  not exists (select 1 from layout_results, jsonb_array_elements(confirmed->'places') item
    where item->>'slug' = 'layout-test-old'),
  'Confirmed-only search must omit sites containing only review records');
select pg_temp.assert_true(
  (select item->'terms' @> '["Old Kōwhai spelling"]'::jsonb and item->>'total' = '12'
   from layout_results, jsonb_array_elements(confirmed->'species') item where item->>'slug' = 'layout-test-planted'),
  'Species search must preserve historical spellings');
select pg_temp.assert_true(
  (select count(*) = 2 from layout_results, jsonb_array_elements(confirmed->'species') item
   where item->>'slug' in ('layout-test-review', 'layout-test-unplanted') and item->>'total' = '0'),
  'The search index must retain deactivated and unplanted register species');
select pg_temp.assert_true(
  not exists (select 1 from layout_results, jsonb_array_elements(all_data->'seasons') item
    where item->>'slug' = 'autumn-2091'),
  'Empty seasons and deactivated events must not extend the historical range');
select pg_temp.assert_true(
  (select all_data::text not like '%layout-test-hidden-note%'
    and not (all_data ?| array['notes', 'photos', 'summary', 'source_file']) from layout_results),
  'Navigation must not return review-note or profile content');

select pg_temp.assert_true(
  public.read_planting_summary(array['species'], '{"site":"layout-test-active"}', true)#>>'{totals,total}' = '12'
    and public.read_planting_summary(array['species'], '{"site":"layout-test-active"}', true)#>>'{totals,records}' = '2',
  'Grouped presentation must count unknown quantities without adding plants');
select pg_temp.assert_true(
  public.read_planting_summary(array['species'], '{"site":"layout-test-old"}', true)#>>'{totals,total}' = '35'
    and public.read_planting_summary(array['species'], '{"site":"layout-test-old"}', false)#>>'{totals,records}' = '0',
  'Review filtering must happen before every aggregate, including deactivated references');
select pg_temp.assert_true(
  public.read_planting_summary(array['theme'], '{"site":"layout-test-old","theme":"layout-test-first"}', true)#>>'{totals,total}' = '35',
  'Several notes must not duplicate the filtered planting quantity');
select pg_temp.assert_true(
  public.read_planting_summary(array['species'], '{"site":"layout-test-active","species":"layout-test-review"}', true)#>>'{totals,records}' = '0',
  'Public identity filters must intersect in the database');
select pg_temp.assert_true(
  (select count(*) <= 25 from public.read_public_review_rows('{}', true, 100000)),
  'Public review RPCs must enforce the database row cap');
select pg_temp.assert_true(
  (select legacy_code = 'LAYOUT-REVIEW'
   from public.read_public_review_rows('{"site":"layout-test-old"}', true, 1))
    and not exists (select 1 from public.read_public_review_rows('{"site":"layout-test-active"}', true, 25)),
  'Public record tables must fetch only scoped records needing review');
select pg_temp.assert_true(
  not exists (select 1 from jsonb_array_elements(public.read_history_references('names')->'species') item
    where item ?| array['summary', 'look_for', 'sources', 'checked_at']),
  'Name and chart references must omit profile text and source collections');

grant select on layout_results to authenticated;
reset role;
set local role authenticated;
select pg_temp.assert_true(
  public.read_layout_summary(true) = (select all_data from layout_results),
  'Authenticated readers must receive the same public navigation data');
reset role;

-- Empty and subsequently seeded databases must be readable without stale tables.
savepoint empty_history;
update public.planting_events set deactivated_at = now();
set local role anon;
select pg_temp.assert_true(
  public.read_layout_summary(true)->'seasons' = '[]'::jsonb
    and public.read_layout_summary(true)->'places' = '[]'::jsonb
    and public.read_layout_summary(true)->>'records' = '0',
  'An empty history must return valid empty navigation data');
reset role;
rollback to savepoint empty_history;
set local role anon;
select pg_temp.assert_true(
  public.read_layout_summary(true) = (select all_data from layout_results),
  'The next read must recover immediately when history becomes available');
reset role;

rollback;
