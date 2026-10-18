-- Load supabase/export/*.csv (written by scripts/export-supabase.ts) into the database.
--
--   psql "$SUPABASE_DB_URL" -f supabase/import.sql      (run from the repo root)
--
-- From-the-workbook tables are refreshed: rows are matched on their readable key
-- (slug or record code), so database ids stay the same between imports.
-- Staff tables only gain rows that are missing; nothing staff wrote is changed.
-- Runs in one transaction: it all loads, or nothing does.

\set ON_ERROR_STOP on
begin;

-- ------------------------------------------------------------ 1. stage the CSVs (all text)
create temp table stage_import (id text, files text, workbook_checks text) on commit drop;
create temp table stage_seasons (slug text, year text, name text, label text, sort_order text,
  workbook_total text, workbook_cell text) on commit drop;
create temp table stage_sites (slug text, name text, is_scheme text) on commit drop;
create temp table stage_site_areas (site_slug text, slug text, name text, wrt_number text, site_class text) on commit drop;
create temp table stage_species (slug text, scientific_name text, suggested_spelling text, common_name text,
  maori_name text, status text, over_5m text, threatened text, threatened_te_kakano text, contested_group text,
  needs_decision text, register_note text) on commit drop;
create temp table stage_review_topics (slug text, label text, question text) on commit drop;
create temp table stage_records (code text, season_slug text, site_slug text, area_slug text, species_slug text,
  quantity text, needs_review text, workbook_file text, sheet text, cell text, season_as_typed text,
  site_as_typed text, species_as_typed text, review_reason text, confidence text, precision text) on commit drop;
create temp table stage_record_notes (record_code text, position text, topic_slug text, kind text, text text) on commit drop;
create temp table stage_site_spellings (site_slug text, area_slug text, as_typed text, cleaned text,
  number_as_typed text, mapping_rule text, confidence text, needs_review text, records text, plants text,
  note text) on commit drop;
create temp table stage_species_spellings (species_slug text, as_typed text, match_key text, kind text,
  confidence text, needs_wrt_decision text, occurrences text, found_in text, note text) on commit drop;
create temp table stage_site_locations (slug text, site_slug text, area_slug text, label text, latitude text,
  longitude text, accuracy text, description text, source_label text, source_url text,
  coordinate_source_url text, coordinate_method text, checked_on text) on commit drop;
create temp table stage_species_profiles (species_slug text, common_name text, maori_names text, name_note text,
  summary text, look_for text, sources text, checked_on text, photos_status text, photos_note text,
  photos_checked_on text) on commit drop;
create temp table stage_species_photos (species_slug text, position text, src text, width text, height text,
  caption text, author text, license text, license_url text, source_name text, source_url text,
  article_url text, focal_point text, retrieved_on text) on commit drop;

\copy stage_import            from 'supabase/export/import.csv'            with (format csv, header true)
\copy stage_seasons           from 'supabase/export/seasons.csv'           with (format csv, header true)
\copy stage_sites             from 'supabase/export/sites.csv'             with (format csv, header true)
\copy stage_site_areas        from 'supabase/export/site_areas.csv'        with (format csv, header true)
\copy stage_species           from 'supabase/export/species.csv'           with (format csv, header true)
\copy stage_review_topics     from 'supabase/export/review_topics.csv'     with (format csv, header true)
\copy stage_records           from 'supabase/export/planting_records.csv'  with (format csv, header true)
\copy stage_record_notes      from 'supabase/export/record_notes.csv'      with (format csv, header true)
\copy stage_site_spellings    from 'supabase/export/site_spellings.csv'    with (format csv, header true)
\copy stage_species_spellings from 'supabase/export/species_spellings.csv' with (format csv, header true)
\copy stage_site_locations    from 'supabase/export/site_locations.csv'    with (format csv, header true)
\copy stage_species_profiles  from 'supabase/export/species_profiles.csv'  with (format csv, header true)
\copy stage_species_photos    from 'supabase/export/species_photos.csv'    with (format csv, header true)

-- ------------------------------------------------------------ 2. from the workbook: refresh
insert into source.imports (id, files, workbook_checks)
select id, files::jsonb, workbook_checks::jsonb from stage_import
on conflict (id) do nothing;

insert into seasons (slug, year, name, label, sort_order, workbook_total, workbook_cell)
select slug, year::smallint, name::season_name, label, sort_order::smallint, workbook_total::int, workbook_cell
from stage_seasons
on conflict (slug) do update set year = excluded.year, name = excluded.name, label = excluded.label,
  sort_order = excluded.sort_order, workbook_total = excluded.workbook_total, workbook_cell = excluded.workbook_cell;

insert into sites (slug, name, is_scheme)
select slug, name, is_scheme::boolean from stage_sites
on conflict (slug) do update set name = excluded.name, is_scheme = excluded.is_scheme;

insert into site_areas (site_id, slug, name, wrt_number, site_class)
select s.id, a.slug, a.name, a.wrt_number, a.site_class::site_class
from stage_site_areas a join sites s on s.slug = a.site_slug
on conflict (site_id, slug) do update set name = excluded.name, wrt_number = excluded.wrt_number,
  site_class = excluded.site_class;

insert into species (slug, scientific_name, suggested_spelling, common_name, maori_name, status, over_5m,
  threatened, threatened_te_kakano, contested_group, needs_decision, register_note)
select slug, scientific_name, suggested_spelling, common_name, maori_name, status::species_status,
  over_5m::boolean, threatened::boolean, threatened_te_kakano::boolean, contested_group,
  needs_decision::boolean, register_note
from stage_species
on conflict (slug) do update set scientific_name = excluded.scientific_name,
  suggested_spelling = excluded.suggested_spelling, common_name = excluded.common_name,
  maori_name = excluded.maori_name, status = excluded.status, over_5m = excluded.over_5m,
  threatened = excluded.threatened, threatened_te_kakano = excluded.threatened_te_kakano,
  contested_group = excluded.contested_group, needs_decision = excluded.needs_decision,
  register_note = excluded.register_note;

-- Review topics are staff-owned once they exist (decisions live there): add missing ones only.
insert into review_topics (slug, label, question)
select slug, label, question from stage_review_topics
on conflict (slug) do nothing;

-- Records gone from the workbook are removed (their notes and sources go with them).
delete from planting_records where code not in (select code from stage_records);

insert into planting_records (code, season_id, site_area_id, species_id, quantity, needs_review)
select r.code, se.id, a.id, sp.id, r.quantity::int, r.needs_review::boolean
from stage_records r
join seasons se    on se.slug = r.season_slug
join sites si      on si.slug = r.site_slug
join site_areas a  on a.site_id = si.id and a.slug = r.area_slug
join species sp    on sp.slug = r.species_slug
on conflict (code) do update set season_id = excluded.season_id, site_area_id = excluded.site_area_id,
  species_id = excluded.species_id, quantity = excluded.quantity, needs_review = excluded.needs_review;

delete from record_notes;
insert into record_notes (record_id, topic_id, kind, text)
select r.id, t.id, n.kind::note_kind, n.text
from stage_record_notes n
join planting_records r on r.code = n.record_code
join review_topics t    on t.slug = n.topic_slug
order by n.record_code, n.position::int;

delete from source.record_sources;
insert into source.record_sources (record_id, import_id, workbook_file, sheet, cell, season_as_typed,
  site_as_typed, species_as_typed, review_reason, confidence, precision)
select r.id, (select id from stage_import), s.workbook_file, s.sheet, s.cell, s.season_as_typed,
  s.site_as_typed, s.species_as_typed, s.review_reason, s.confidence::match_confidence, s.precision::record_precision
from stage_records s join planting_records r on r.code = s.code;

delete from source.site_spellings;
insert into source.site_spellings (site_area_id, as_typed, cleaned, number_as_typed, mapping_rule, confidence,
  needs_review, records, plants, note)
select a.id, x.as_typed, x.cleaned, x.number_as_typed, x.mapping_rule, x.confidence::match_confidence,
  x.needs_review::boolean, x.records::int, x.plants::int, x.note
from stage_site_spellings x
left join sites s       on s.slug = x.site_slug
left join site_areas a  on a.site_id = s.id and a.slug = x.area_slug;

delete from source.species_spellings;
insert into source.species_spellings (species_id, as_typed, match_key, kind, confidence, needs_wrt_decision,
  occurrences, found_in, note)
select sp.id, x.as_typed, x.match_key, x.kind, x.confidence::match_confidence, x.needs_wrt_decision::boolean,
  x.occurrences::int, x.found_in, x.note
from stage_species_spellings x left join species sp on sp.slug = x.species_slug;

-- ------------------------------------------------------------ 3. staff tables: add missing rows only
insert into site_locations (slug, site_id, site_area_id, label, latitude, longitude, accuracy, description,
  source_label, source_url, coordinate_source_url, coordinate_method, checked_on)
select l.slug, s.id, a.id, l.label, l.latitude::float8, l.longitude::float8, l.accuracy::location_accuracy,
  l.description, l.source_label, l.source_url, l.coordinate_source_url, l.coordinate_method, l.checked_on::date
from stage_site_locations l
join sites s           on s.slug = l.site_slug
left join site_areas a on a.site_id = s.id and a.slug = l.area_slug
on conflict (slug) do nothing;

insert into species_profiles (species_id, common_name, maori_names, name_note, summary, look_for, sources,
  checked_on, photos_status, photos_note, photos_checked_on)
select sp.id, p.common_name, p.maori_names::text[], p.name_note, p.summary, p.look_for, p.sources::jsonb,
  p.checked_on::date, p.photos_status, p.photos_note, p.photos_checked_on::date
from stage_species_profiles p join species sp on sp.slug = p.species_slug
on conflict (species_id) do nothing;

insert into species_photos (species_id, position, src, width, height, caption, author, license, license_url,
  source_name, source_url, article_url, focal_point, retrieved_on)
select sp.id, p.position::smallint, p.src, p.width::int, p.height::int, p.caption, p.author, p.license,
  p.license_url, p.source_name, p.source_url, p.article_url, p.focal_point, p.retrieved_on::date
from stage_species_photos p join species sp on sp.slug = p.species_slug
on conflict (species_id, position) do nothing;

-- ------------------------------------------------------------ 4. report what no longer has records
-- Kept, not deleted: they may carry pins, profiles or decisions.
select 'site with no records' as check, slug as name from sites
  where id not in (select a.site_id from site_areas a join planting_records r on r.site_area_id = a.id)
union all
select 'area with no records', a.slug from site_areas a
  where a.id not in (select site_area_id from planting_records);

commit;
