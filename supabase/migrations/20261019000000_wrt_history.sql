-- WRT restoration history: Supabase schema (draft, 19 Oct 2026)
--
-- Two kinds of table:
--   LEDGER  - regenerated from the Plants Out Master workbook. Replaced whole on
--             each import. Nobody edits these rows by hand.
--   CONTENT - seeded once from the repo's data/*.json, then edited by staff in
--             Supabase (site pins, species profiles, photos). Imports never touch them.
--
-- Keys are readable text (slugs, record ids), the same keys the app already uses
-- in URLs. Renames cascade. SP-xxx register codes are kept for audit only: the
-- generator renumbers them, so nothing joins on them.

-- ------------------------------------------------------------------ enums
create type season_name        as enum ('Autumn', 'Spring');
create type site_class         as enum ('keystone', 'community', 'school', 'unknown');
create type record_precision   as enum ('site', 'subsite', 'area', 'scheme', 'unknown');
create type mapping_confidence as enum ('high', 'medium', 'low');
create type species_status     as enum ('core', 'appended', 'contested', 'seedlog_only', 'unknown');
create type review_kind        as enum ('ruling', 'confirm', 'fyi');
create type review_theme       as enum ('contested-species', 'order-scheme', 'site-number-mismatch',
  'slope-hill-2024', 'new-site', 'site-identity', 'header-cleaned', 'not-a-number', 'other');
create type location_precision as enum ('historic-event', 'landmark', 'surveyed');

-- ------------------------------------------------------------------ LEDGER

-- One row per import. Its id is the data version: a hash of the five generated CSVs.
create table imports (
  id               text primary key,                 -- 12 hex, sha256 over the CSV bytes
  workbook_sha256  text,                             -- from the generator's output log, when known
  imported_at      timestamptz not null default now(),
  row_counts       jsonb not null,                   -- {"planting_history": 5449, ...}
  note             text
);

create table seasons (
  slug        text primary key check (slug ~ '^(autumn|spring)-[0-9]{4}$'),
  year        smallint not null,
  name        season_name not null,
  label       text not null,                          -- "Autumn 2024"
  sort_order  smallint not null unique,               -- 0 = earliest
  unique (year, name)
);

create table species (
  slug                 text primary key,              -- from the register's scientific name
  register_code        text,                          -- "SP-050": audit only, NOT stable (renumbered on regeneration)
  scientific_name      text not null,                 -- register spelling (WRT's own)
  suggested_spelling   text,                          -- usual botanical spelling where it differs
  common_name          text,                          -- primary common name, macrons applied
  maori_name           text,                          -- primary Māori name, macrons applied
  common_names_all     text[] not null default '{}',  -- every common name in the register cell
  maori_names_all      text[] not null default '{}',
  status               species_status not null,
  in_core_98           boolean,
  over_5m              boolean,                       -- Trees That Count flag; null = not stated
  threatened           boolean,                       -- Plants Out Master "T"; null = not stated
  threatened_te_kakano boolean not null default false,-- "#" in the Te Kakano list (disagrees with the above)
  needs_decision       boolean not null default false,
  note                 text
);

-- Contested pairs, stored in both directions to match Species.contestedWith.
create table species_contested (
  species_slug  text not null references species on update cascade on delete cascade,
  partner_slug  text not null references species on update cascade on delete cascade,
  primary key (species_slug, partner_slug),
  check (species_slug <> partner_slug)
);

-- Every spelling seen in the source folder (species_crosswalk.csv). species_slug is
-- null for the 60 spellings that map to nothing yet.
create table species_aliases (
  id                 bigint generated always as identity primary key,
  species_slug       text references species on update cascade on delete set null,
  raw_name           text not null,
  match_key          text,
  alias_type         text,                            -- typo, abbreviation, old_genus, common_name...
  confidence         mapping_confidence,
  needs_wrt_decision boolean not null default false,
  occurrences        integer,
  sources            text,
  note               text
);
create index on species_aliases (species_slug);

-- What people call a site. Paper4Trees is a scheme, not a place on the ground.
create table places (
  slug       text primary key,
  name       text not null,
  is_scheme  boolean not null default false
);

-- A registered site or sub-site. key = "<place>/<part>".
create table parcels (
  key              text primary key,
  place_slug       text not null references places on update cascade on delete cascade,
  part_slug        text not null,                     -- unique within the place (fixes the two "Shotover River" parts)
  name             text not null,
  wrt_site_number  text,                              -- "9G", "13C", "NEW-…"; null when the header had none
  site_class       site_class not null,               -- one class per parcel (checked: no conflicts in 5,449 rows)
  unique (place_slug, part_slug),
  unique (place_slug, wrt_site_number)
);

-- Every header spelling typed in the MASTER grid (site_crosswalk.csv), with how it was mapped.
-- "[name]" masks stay as typed. Never unmask them.
create table site_headers (
  id                bigint generated always as identity primary key,
  parcel_key        text references parcels on update cascade on delete set null,
  header_as_typed   text not null,
  header_clean      text not null,
  site_id_as_typed  text,
  site_id_proposed  text,
  confidence        mapping_confidence,
  needs_review      boolean not null default false,
  mapping_rule      text,
  columns           integer,
  records           integer,
  plants            integer,
  seasons_with_records text,
  note              text
);
create index on site_headers (parcel_key);

-- The fact table: one species at one parcel in one season.
create table planting_records (
  id                     text primary key,            -- "PH-2019A-FK12": tied to the source cell
  import_id              text not null references imports,
  season_slug            text not null references seasons on update cascade,
  parcel_key             text not null references parcels on update cascade,
  species_slug           text not null references species on update cascade,
  quantity               integer check (quantity >= 0),  -- null = the cell held text ("TBC")
  precision              record_precision not null,
  confidence             mapping_confidence not null,   -- mapping quality, not planting outcome
  needs_review           boolean not null,
  review_reason          text,                         -- as the generator wrote it (may hold SP- codes)
  source_file            text not null,
  source_sheet           text not null,
  source_cell            text not null,
  season_label_original  text not null,
  site_original          text not null,                -- cleaned header, masks kept
  species_original       text not null,
  unique (source_file, source_sheet, source_cell)
);
create index on planting_records (season_slug);
create index on planting_records (parcel_key);
create index on planting_records (species_slug);
create index on planting_records (needs_review) where needs_review;

-- review_reason split into notes and classified once, at import.
create table review_notes (
  record_id  text not null references planting_records on delete cascade,
  position   smallint not null,
  kind       review_kind not null,
  theme      review_theme not null,
  text       text not null,                            -- readable: species codes replaced by names
  raw        text not null,                            -- audit trail; never show or send to a model
  primary key (record_id, position)
);
create index on review_notes (theme);

-- Generated totals vs the workbook's own TOTAL cells.
create table reconciliation (
  id           bigint generated always as identity primary key,
  import_id    text not null references imports,
  kind         text not null check (kind in ('season', 'grand', 'exception')),
  label        text not null,
  generated    integer not null,
  stated       integer not null,
  difference   integer not null,
  stated_cell  text,
  records      integer not null,
  cause        text
);

-- ------------------------------------------------------------------ CONTENT

-- Content rows point at ledger rows with ON DELETE RESTRICT: if a re-import would
-- drop a site or species that has a pin or profile, the import stops and someone decides.

-- Map pins. A pin covers the whole place unless parcels are linked below.
-- radius_m is the "pin plus radius" model: a circle wide enough to cover private land.
create table place_locations (
  id                    text primary key,             -- "slope-hill-riparian"
  place_slug            text not null references places on update cascade on delete restrict,
  label                 text not null,
  latitude              double precision not null check (latitude between -90 and 90),
  longitude             double precision not null check (longitude between -180 and 180),
  radius_m              integer check (radius_m > 0), -- null until staff set it
  precision             location_precision not null,
  description           text,
  source_url            text,
  source_label          text,
  coordinate_source_url text,
  coordinate_method     text,
  checked_on            date,
  updated_at            timestamptz not null default now()
);
create index on place_locations (place_slug);

create table place_location_parcels (
  location_id  text not null references place_locations on delete cascade,
  parcel_key   text not null references parcels on update cascade on delete restrict,
  primary key (location_id, parcel_key)
);

create table species_profiles (
  species_slug  text primary key references species on update cascade on delete restrict,
  common_name   text,
  maori_names   text[] not null default '{}',
  name_note     text,
  summary       text,
  look_for      text,
  sources       jsonb not null default '[]',            -- [{label, url}]
  checked_at    date,
  updated_at    timestamptz not null default now()
);

-- Reference photos of the species from elsewhere. NOT photos of WRT plantings.
create table species_photos (
  species_slug  text not null references species on update cascade on delete restrict,
  position      smallint not null,
  src           text not null,                          -- hotlinked today; Supabase Storage later
  width         integer,
  height        integer,
  caption       text,
  author        text,
  license       text,
  license_url   text,
  source_url    text,
  source_name   text,
  article_url   text,
  focal_point   text,
  retrieved_at  date,
  primary key (species_slug, position)
);

create table species_photo_reviews (
  species_slug  text primary key references species on update cascade on delete restrict,
  status        text not null,
  reason        text,
  photo_count   integer,
  checked_at    date
);

-- ------------------------------------------------------------------ views
-- security_invoker so the caller's RLS applies.

create view record_view with (security_invoker = true) as
select
  r.id,
  r.season_slug, s.year, s.name as season_name, s.label as season_label, s.sort_order as season_order,
  pa.place_slug, pl.name as place_name, pl.is_scheme,
  r.parcel_key, pa.name as parcel_name, pa.site_class,
  r.species_slug, sp.scientific_name, sp.common_name, sp.maori_name,
  sp.over_5m, sp.threatened, sp.needs_decision as species_contested,
  coalesce(r.quantity, 0) as quantity,
  r.quantity is not null  as has_quantity,
  r.precision, r.confidence, r.needs_review,
  r.source_sheet, r.source_cell, r.site_original, r.species_original
from planting_records r
join seasons  s  on s.slug  = r.season_slug
join parcels  pa on pa.key  = r.parcel_key
join places   pl on pl.slug = pa.place_slug
join species  sp on sp.slug = r.species_slug;

-- The QuantitySplit every number in the app carries. Never a bare total.
create view season_splits with (security_invoker = true) as
select season_slug, season_label, season_order,
  sum(quantity)                                    as total,
  sum(quantity) filter (where not needs_review)    as resolved,
  coalesce(sum(quantity) filter (where needs_review), 0) as needs_review,
  count(*)                                         as records,
  count(*) filter (where needs_review)             as records_needing_review,
  count(distinct place_slug)                       as places,
  count(distinct species_slug)                     as species
from record_view group by 1, 2, 3;

create view place_splits with (security_invoker = true) as
select place_slug, place_name, is_scheme,
  sum(quantity)                                    as total,
  sum(quantity) filter (where not needs_review)    as resolved,
  coalesce(sum(quantity) filter (where needs_review), 0) as needs_review,
  count(*)                                         as records,
  count(*) filter (where needs_review)             as records_needing_review,
  min(season_order) as first_season_order, max(season_order) as last_season_order,
  count(distinct species_slug)                     as species
from record_view group by 1, 2, 3;

create view species_splits with (security_invoker = true) as
select species_slug, scientific_name, common_name, maori_name,
  sum(quantity)                                    as total,
  sum(quantity) filter (where not needs_review)    as resolved,
  coalesce(sum(quantity) filter (where needs_review), 0) as needs_review,
  count(*)                                         as records,
  count(*) filter (where needs_review)             as records_needing_review,
  count(distinct place_slug)                       as places
from record_view group by 1, 2, 3, 4;

-- Review questions: flagged records only, ruling/confirm notes only. Themes overlap: do not add rows up.
create view review_theme_splits with (security_invoker = true) as
with t as (
  select distinct n.record_id, n.theme
  from review_notes n join planting_records r on r.id = n.record_id
  where r.needs_review and n.kind <> 'fyi'
)
select t.theme,
  sum(coalesce(r.quantity, 0)) as needs_review,
  count(*)                      as records
from t join planting_records r on r.id = t.record_id
group by t.theme;

-- ------------------------------------------------------------------ RLS
-- Signed-in staff read everything. Staff edit content tables. Ledger tables
-- are written only by the import (service role or direct connection, which bypass RLS).

do $$
declare t text;
begin
  foreach t in array array['imports','seasons','species','species_contested','species_aliases',
    'places','parcels','site_headers','planting_records','review_notes','reconciliation',
    'place_locations','place_location_parcels','species_profiles','species_photos','species_photo_reviews']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "staff read" on %I for select to authenticated using (true)', t);
  end loop;
  foreach t in array array['place_locations','place_location_parcels','species_profiles',
    'species_photos','species_photo_reviews']
  loop
    execute format('create policy "staff write" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
