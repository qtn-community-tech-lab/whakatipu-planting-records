-- WRT planting history: database schema
--
-- The whole model in one sentence:
--   a PLANTING RECORD says how many of one SPECIES went to one SITE AREA in one SEASON.
--
-- public schema (what the app uses)
--   From the workbook   sites, site_areas, seasons, species, planting_records, record_notes
--   Written by staff    site_locations, species_profiles, species_photos, review_topics
-- source schema (where each number came from; audit only, not exposed to the API)
--   imports, record_sources, site_spellings, species_spellings
--
-- An import refreshes the "from the workbook" tables and only adds missing rows to the
-- "written by staff" tables, so staff work is never overwritten.

create schema if not exists source;

create type season_name       as enum ('Autumn', 'Spring');
create type site_class        as enum ('keystone', 'community', 'school');
create type species_status    as enum ('core', 'appended', 'contested', 'seedlog_only');
create type note_kind         as enum ('ruling', 'confirm', 'fyi');   -- WRT must decide / check once / for information
create type location_accuracy as enum ('historic-event', 'landmark', 'surveyed');
create type match_confidence  as enum ('high', 'medium', 'low');
create type record_precision  as enum ('site', 'subsite', 'area', 'scheme', 'unknown');


-- =================================================================== FROM THE WORKBOOK

-- A place people plant: "Lake Hayes", "Whitechapel". Paper4Trees is an order scheme, not a place.
create table sites (
  id         int  generated always as identity primary key,
  slug       text not null unique,                -- "lake-hayes": used in URLs
  name       text not null,
  is_scheme  boolean not null default false
);

-- A part of a site, as WRT registers it: "Lake Hayes Pavilion" (site number 9G).
create table site_areas (
  id          int  generated always as identity primary key,
  site_id     int  not null references sites,
  slug        text not null,                      -- unique within the site
  name        text not null,
  wrt_number  text,                               -- WRT's site number: "9G", "13C", "NEW-…"; null if none
  site_class  site_class,                         -- null for Paper4Trees
  unique (site_id, slug),
  unique (site_id, wrt_number),
  unique (id, site_id)                            -- lets site_locations check the area belongs to the site
);

-- A planting season. The workbook has Autumn 2015 to Autumn 2026 (no Spring 2026 yet).
create table seasons (
  id              int  generated always as identity primary key,
  slug            text not null unique check (slug ~ '^(autumn|spring)-[0-9]{4}$'),
  year            smallint not null,
  name            season_name not null,
  label           text not null,                  -- "Autumn 2024"
  sort_order      smallint not null,              -- 0 = earliest
  workbook_total  int,                            -- what the season's TOTAL cell in MASTER says
  workbook_cell   text,                           -- "MASTER!T107"
  unique (year, name)
);

-- A plant on WRT's species register.
create table species (
  id                    int  generated always as identity primary key,
  slug                  text not null unique,     -- "sophora-microphylla"
  scientific_name       text not null,            -- the register's spelling
  suggested_spelling    text,                     -- usual botanical spelling, where it differs
  common_name           text,
  maori_name            text,
  status                species_status,
  over_5m               boolean,                  -- Trees That Count over-5 m flag; null = not stated
  threatened            boolean,                  -- "T" in the Plants Out Master; null = not stated
  threatened_te_kakano  boolean not null default false,   -- "#" in the Te Kakano list (the two lists disagree)
  contested_group       text,                     -- "C3": names WRT has not yet ruled are one species or two
  needs_decision        boolean not null default false,
  register_note         text
);
create index on species (contested_group) where contested_group is not null;

-- How many of one species went to one site area in one season.
-- "Recorded", not "planted": the workbook was filled from allocation sheets.
create table planting_records (
  id            int  generated always as identity primary key,
  code          text not null unique,             -- "PH-2019A-FK12": stable, tied to the workbook cell
  season_id     int  not null references seasons,
  site_area_id  int  not null references site_areas,
  species_id    int  not null references species,
  quantity      int  check (quantity >= 0),       -- null = the cell was not a number ("TBC")
  needs_review  boolean not null default false    -- true while WRT still has to rule or confirm
);
create index on planting_records (season_id);
create index on planting_records (site_area_id);
create index on planting_records (species_id);

-- Notes on a record, each filed under a review topic.
create table record_notes (
  id         int  generated always as identity primary key,
  record_id  int  not null references planting_records on delete cascade,
  topic_id   int  not null,                       -- references review_topics (added below)
  kind       note_kind not null,
  text       text not null
);
create index on record_notes (record_id);
create index on record_notes (topic_id);


-- =================================================================== WRITTEN BY STAFF

-- The questions WRT needs to answer once, and the answer when it comes.
create table review_topics (
  id          int  generated always as identity primary key,
  slug        text not null unique,               -- "slope-hill-2024"
  label       text not null,
  question    text not null,
  decision    text,                               -- WRT's ruling, in their words
  decided_on  date,
  decided_by  text
);
alter table record_notes add foreign key (topic_id) references review_topics;

-- A map pin with an optional radius. Covers the whole site unless site_area_id is set.
create table site_locations (
  id                    int  generated always as identity primary key,
  slug                  text not null unique,     -- "slope-hill-riparian"
  site_id               int  not null references sites,
  site_area_id          int,
  label                 text not null,
  latitude              double precision not null check (latitude  between -90  and 90),
  longitude             double precision not null check (longitude between -180 and 180),
  radius_m              int  check (radius_m > 0),
  accuracy              location_accuracy not null,
  description           text,
  source_label          text,
  source_url            text,
  coordinate_source_url text,
  coordinate_method     text,
  checked_on            date,
  foreign key (site_area_id, site_id) references site_areas (id, site_id)
);
create index on site_locations (site_id);

-- What a species looks like and what it is called, written for staff and volunteers.
create table species_profiles (
  species_id      int  primary key references species,
  common_name     text,
  maori_names     text[] not null default '{}',
  name_note       text,
  summary         text,
  look_for        text,
  sources         jsonb not null default '[]',    -- [{label, url}]
  checked_on      date,
  photos_status   text,                           -- "confirmed" once the photos were checked
  photos_note     text,
  photos_checked_on date
);

-- Reference photos of a species from elsewhere. Not photos of WRT plantings.
create table species_photos (
  species_id    int  not null references species,
  position      smallint not null,
  src           text not null,
  width         int,
  height        int,
  caption       text,
  author        text,
  license       text,
  license_url   text,
  source_name   text,
  source_url    text,
  article_url   text,
  focal_point   text,
  retrieved_on  date,
  primary key (species_id, position)
);


-- =================================================================== SOURCE (audit)

-- One row per import. Its id is the data version.
create table source.imports (
  id               text primary key,              -- 12 hex: sha256 over the generated CSVs
  imported_at      timestamptz not null default now(),
  files            jsonb not null,                -- [{name, rows}]
  workbook_checks  jsonb not null default '[]'    -- grand totals and exceptions from history_reconciliation.csv
);

-- Where each record came from: one workbook cell, and how confidently it was mapped.
create table source.record_sources (
  record_id         int  primary key references public.planting_records on delete cascade,
  import_id         text not null references source.imports,
  workbook_file     text not null,
  sheet             text not null,
  cell              text not null,                 -- "FK12"
  season_as_typed   text not null,
  site_as_typed     text not null,                 -- "[name]" masks kept; never unmask
  species_as_typed  text not null,
  review_reason     text,                          -- as the generator wrote it
  confidence        match_confidence not null,     -- how well site and species were matched
  precision         record_precision not null,     -- whether the column named a site or one area of it
  unique (workbook_file, sheet, cell)
);

-- Every site header typed in the MASTER grid, and which area it was read as.
create table source.site_spellings (
  id              int  generated always as identity primary key,
  site_area_id    int  references public.site_areas,   -- null if the header has no records
  as_typed        text not null,
  cleaned         text not null,
  number_as_typed text,
  mapping_rule    text,
  confidence      match_confidence,
  needs_review    boolean not null default false,
  records         int,
  plants          int,
  note            text
);

-- Every spelling of a plant name found in the source folder.
create table source.species_spellings (
  id                 int  generated always as identity primary key,
  species_id         int  references public.species,   -- null for the 60 that match nothing yet
  as_typed           text not null,
  match_key          text,
  kind               text,                         -- typo, abbreviation, old_genus, common_name…
  confidence         match_confidence,
  needs_wrt_decision boolean not null default false,
  occurrences        int,
  found_in           text,
  note               text
);


-- =================================================================== VIEWS
-- Every count keeps the split: plants resolved + plants needing review = plants.

create view record_details with (security_invoker = true) as
select
  r.id, r.code,
  se.slug as season, se.label as season_label, se.year, se.name as season_name, se.sort_order as season_order,
  si.slug as site, si.name as site_name, si.is_scheme,
  a.slug  as area, a.name  as area_name, a.wrt_number, a.site_class,
  sp.slug as species, sp.scientific_name, sp.common_name, sp.maori_name,
  sp.over_5m, sp.threatened, sp.contested_group,
  r.quantity, r.needs_review
from planting_records r
join seasons    se on se.id = r.season_id
join site_areas a  on a.id  = r.site_area_id
join sites      si on si.id = a.site_id
join species    sp on sp.id = r.species_id;

create view totals_by_site with (security_invoker = true) as
select site, site_name, is_scheme,
  coalesce(sum(quantity), 0)                                       as plants,
  coalesce(sum(quantity) filter (where not needs_review), 0)       as plants_resolved,
  coalesce(sum(quantity) filter (where needs_review), 0)           as plants_needs_review,
  count(*)                                                         as records,
  count(*) filter (where needs_review)                             as records_needs_review,
  count(distinct species)                                          as species,
  min(season_order) as first_season_order, max(season_order) as last_season_order
from record_details group by site, site_name, is_scheme;

create view totals_by_species with (security_invoker = true) as
select species, scientific_name, common_name, maori_name,
  coalesce(sum(quantity), 0)                                       as plants,
  coalesce(sum(quantity) filter (where not needs_review), 0)       as plants_resolved,
  coalesce(sum(quantity) filter (where needs_review), 0)           as plants_needs_review,
  count(*)                                                         as records,
  count(*) filter (where needs_review)                             as records_needs_review,
  count(distinct site)                                             as sites
from record_details group by species, scientific_name, common_name, maori_name;

create view totals_by_season with (security_invoker = true) as
select season, season_label, season_order,
  coalesce(sum(quantity), 0)                                       as plants,
  coalesce(sum(quantity) filter (where not needs_review), 0)       as plants_resolved,
  coalesce(sum(quantity) filter (where needs_review), 0)           as plants_needs_review,
  count(*)                                                         as records,
  count(*) filter (where needs_review)                             as records_needs_review,
  count(distinct site)                                             as sites,
  count(distinct species)                                          as species
from record_details group by season, season_label, season_order;

-- Open questions: records still needing review, by topic. A record can sit under several
-- topics, so these rows overlap and must not be added up.
create view totals_by_review_topic with (security_invoker = true) as
with flagged as (
  select distinct n.topic_id, r.id, r.quantity
  from record_notes n join planting_records r on r.id = n.record_id
  where r.needs_review and n.kind <> 'fyi'
)
select t.slug as topic, t.label, t.question, t.decision,
  coalesce(sum(f.quantity), 0) as plants_needs_review,
  count(f.id)                  as records_needs_review
from review_topics t left join flagged f on f.topic_id = t.id
group by t.id;


-- =================================================================== ACCESS
-- Signed-in users read everything in public and edit the staff tables.
-- The import uses the database connection directly, which bypasses these policies.
-- The source schema gets no grants: only the import and server code can read it.

do $$
declare t text;
begin
  foreach t in array array['sites','site_areas','seasons','species','planting_records','record_notes',
    'review_topics','site_locations','species_profiles','species_photos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read" on public.%I for select to authenticated using (true)', t);
  end loop;
  foreach t in array array['review_topics','site_locations','species_profiles','species_photos'] loop
    execute format('create policy "staff edit" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
  foreach t in array array['imports','record_sources','site_spellings','species_spellings'] loop
    execute format('alter table source.%I enable row level security', t);
  end loop;
end $$;
