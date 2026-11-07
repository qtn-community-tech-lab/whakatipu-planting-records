-- WRT planting database: 9 tables and the totals views.
-- Paste into Supabase > SQL Editor and run once on an empty project.
-- Row-level security is switched on with no rules: the public key can read and
-- write nothing, while the SQL Editor, Table Editor and the secret key see everything.

begin;

-- ---------------------------------------------------------------------------
-- Fixed lists
-- ---------------------------------------------------------------------------
create type public.season_half     as enum ('autumn', 'spring');
create type public.site_class      as enum ('keystone', 'community', 'school');
create type public.species_status  as enum ('core', 'appended', 'contested', 'seedlog_only');
create type public.planting_type   as enum ('establishment', 'infill', 'replacement');
create type public.planting_source as enum ('workbook', 'app');
create type public.note_kind       as enum ('ruling', 'confirm', 'fyi');

-- ---------------------------------------------------------------------------
-- 9. users: who can sign in, and whether they are staff
-- ---------------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  is_staff    boolean not null default false,
  created_at  timestamptz not null default now(),
  retired_at  timestamptz
);

-- Edit trail, filled in by a trigger on every table below.
-- Signed-in edits record the person; server or import edits record whoever the
-- code passes as updated_by, or nobody, never the previous editor.
create function public.touch_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := new.created_by;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_by := coalesce(
      auth.uid(),
      case when new.updated_by is distinct from old.updated_by then new.updated_by end
    );
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. sites: places people know by name. Paper4Trees is a scheme, not a place.
-- ---------------------------------------------------------------------------
create table public.sites (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  description text not null default '',
  is_scheme   boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.users (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users (id),
  retired_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- 2. areas: the parts of a site planted separately, each with one map pin
-- ---------------------------------------------------------------------------
create table public.areas (
  slug           text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  site           text not null references public.sites (slug) on update cascade,
  name           text not null,
  description    text not null default '',
  wrt_number     text,                    -- the Trust's own number: 15, 9G, 22A
  class          public.site_class,       -- empty for Paper4Trees
  lat            double precision check (lat between -90 and 90),
  lng            double precision check (lng between -180 and 180),
  radius_m       integer check (radius_m > 0),
  pin_source_url text,
  pin_checked_on date,
  created_at     timestamptz not null default now(),
  created_by     uuid references public.users (id),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.users (id),
  retired_at     timestamptz,
  unique (site, wrt_number),
  check ((lat is null) = (lng is null))   -- a pin has both coordinates or neither
);

-- ---------------------------------------------------------------------------
-- 3. species: the Trust's register, with write-up and photos built in
-- ---------------------------------------------------------------------------
create table public.species (
  slug                 text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  scientific_name      text not null,      -- the register's spelling
  suggested_spelling   text,               -- usual botanical spelling, where it differs
  common_name          text,
  maori_name           text,
  status               public.species_status,
  over_5m              boolean,            -- Trees That Count flag; empty = not stated
  threatened           boolean,            -- "T" in the Plants Out Master
  threatened_te_kakano boolean not null default false,
  contested_group      text check (contested_group ~ '^C[0-9]+$'),
  needs_decision       boolean not null default false,
  register_code        text,               -- old SP- code, for tracing only
  register_note        text,
  profile              jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  photos               jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  created_at           timestamptz not null default now(),
  created_by           uuid references public.users (id),
  updated_at           timestamptz not null default now(),
  updated_by           uuid references public.users (id),
  retired_at           timestamptz
);

-- ---------------------------------------------------------------------------
-- 4. seasons: Autumn or Spring of a year, sorted in planting order
-- ---------------------------------------------------------------------------
create table public.seasons (
  id             smallint primary key,     -- also the sort order: 0 = Autumn 2015
  slug           text not null unique,     -- autumn-2019
  label          text not null,            -- Autumn 2019
  year           smallint not null,
  half           public.season_half not null,
  workbook_total integer,                  -- the season's TOTAL cell, filled by the import
  workbook_cell  text,
  unique (year, half)
);

insert into public.seasons (id, slug, label, year, half)
select (y - 2015) * 2 + h.n,
       h.name || '-' || y,
       initcap(h.name) || ' ' || y,
       y,
       h.name::public.season_half
from generate_series(2015, 2027) as y
cross join (values (0, 'autumn'), (1, 'spring')) as h (n, name)
where not (y = 2027 and h.name = 'spring');   -- Autumn 2015 to Autumn 2027

-- ---------------------------------------------------------------------------
-- 5. plantings: one planting in one area in one season
-- ---------------------------------------------------------------------------
create table public.plantings (
  id          bigint generated always as identity primary key,
  area        text not null references public.areas (slug) on update cascade,
  season      smallint not null references public.seasons (id),
  planted_on  date,                        -- required for new plantings, empty for history
  type        public.planting_type,        -- empty for history
  source      public.planting_source not null default 'app',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  created_by  uuid references public.users (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users (id),
  retired_at  timestamptz,
  check (source = 'workbook' or planted_on is not null)
);
create unique index one_workbook_planting_per_area_season
  on public.plantings (area, season) where source = 'workbook';
create index plantings_season_idx on public.plantings (season);

-- ---------------------------------------------------------------------------
-- 6. planting_lines: how many of one species went into a planting
-- ---------------------------------------------------------------------------
create table public.planting_lines (
  id          bigint generated always as identity primary key,
  planting    bigint not null references public.plantings (id),
  species     text not null references public.species (slug) on update cascade,
  quantity    integer check (quantity >= 0),   -- empty = unknown ("TBC"), never 0
  legacy_code text unique,                     -- spreadsheet row, e.g. PH-2019A-FK10
  source_cell text,                            -- cell in MASTER, e.g. FK10
  created_at  timestamptz not null default now(),
  created_by  uuid references public.users (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users (id),
  retired_at  timestamptz
);
create unique index one_line_per_species
  on public.planting_lines (planting, species) where retired_at is null;
create index planting_lines_species_idx on public.planting_lines (species);

-- ---------------------------------------------------------------------------
-- 7. questions: what only the Trust can decide, and its answer
-- ---------------------------------------------------------------------------
create table public.questions (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  question    text not null,
  ruling      text,                        -- the Trust's answer, in their words
  ruled_on    date,
  ruled_by    text,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.users (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users (id),
  retired_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- 8. notes: which question affects which line. Open ruling or confirm notes
--    make a line "needs review".
-- ---------------------------------------------------------------------------
create table public.notes (
  id          bigint generated always as identity primary key,
  line        bigint not null references public.planting_lines (id),
  question    text not null references public.questions (slug) on update cascade,
  kind        public.note_kind not null,
  text        text not null default '',
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.users (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users (id),
  retired_at  timestamptz,
  unique (line, question)
);
create index notes_question_idx on public.notes (question);

-- Edit-trail triggers
create trigger touch before insert or update on public.sites          for each row execute function public.touch_row();
create trigger touch before insert or update on public.areas          for each row execute function public.touch_row();
create trigger touch before insert or update on public.species        for each row execute function public.touch_row();
create trigger touch before insert or update on public.plantings      for each row execute function public.touch_row();
create trigger touch before insert or update on public.planting_lines for each row execute function public.touch_row();
create trigger touch before insert or update on public.questions      for each row execute function public.touch_row();
create trigger touch before insert or update on public.notes          for each row execute function public.touch_row();

-- ---------------------------------------------------------------------------
-- Views: all the adding up. Every total has plants, confirmed and needs review.
-- security_invoker keeps the views under the same row-level security as the tables.
-- ---------------------------------------------------------------------------
create view public.line_details with (security_invoker = true) as
select
  l.id            as line_id,
  p.id            as planting_id,
  l.legacy_code,
  p.source,
  se.slug         as season,
  se.label        as season_label,
  se.id           as season_order,
  se.year,
  p.planted_on,
  si.slug         as site,
  si.name         as site_name,
  si.is_scheme,
  a.slug          as area,
  a.name          as area_name,
  a.wrt_number,
  a.class,
  sp.slug         as species,
  sp.scientific_name,
  sp.common_name,
  sp.maori_name,
  sp.threatened,
  sp.contested_group,
  l.quantity,
  exists (
    select 1 from public.notes n
    where n.line = l.id
      and n.kind in ('ruling', 'confirm')
      and n.resolved_at is null
      and n.retired_at is null
  ) as needs_review
from public.planting_lines l
join public.plantings p on p.id   = l.planting
join public.seasons  se on se.id  = p.season
join public.areas     a on a.slug = p.area
join public.sites    si on si.slug = a.site
join public.species  sp on sp.slug = l.species
where l.retired_at is null and p.retired_at is null;

create view public.totals_by_site with (security_invoker = true) as
select site, site_name, is_scheme,
  sum(quantity)                                 as plants,
  sum(quantity) filter (where not needs_review) as plants_confirmed,
  sum(quantity) filter (where needs_review)     as plants_needs_review,
  count(*)                                      as lines,
  count(*) filter (where quantity is null)      as lines_unknown,
  count(distinct species)                       as species,
  min(season_order)                             as first_season,
  max(season_order)                             as last_season
from public.line_details
group by site, site_name, is_scheme;

create view public.totals_by_area with (security_invoker = true) as
select area, area_name, wrt_number, class, site, site_name,
  sum(quantity)                                 as plants,
  sum(quantity) filter (where not needs_review) as plants_confirmed,
  sum(quantity) filter (where needs_review)     as plants_needs_review,
  count(*)                                      as lines,
  count(*) filter (where quantity is null)      as lines_unknown,
  count(distinct species)                       as species
from public.line_details
group by area, area_name, wrt_number, class, site, site_name;

create view public.totals_by_species with (security_invoker = true) as
select species, scientific_name, common_name, maori_name,
  sum(quantity)                                 as plants,
  sum(quantity) filter (where not needs_review) as plants_confirmed,
  sum(quantity) filter (where needs_review)     as plants_needs_review,
  count(*)                                      as lines,
  count(*) filter (where quantity is null)      as lines_unknown,
  count(distinct site)                          as sites
from public.line_details
group by species, scientific_name, common_name, maori_name;

create view public.totals_by_season with (security_invoker = true) as
select se.id as season_order, se.slug as season, se.label as season_label,
  se.workbook_total,
  sum(d.quantity)                                   as plants,
  sum(d.quantity) filter (where not d.needs_review) as plants_confirmed,
  sum(d.quantity) filter (where d.needs_review)     as plants_needs_review,
  count(d.line_id)                                  as lines,
  count(distinct d.site)                            as sites,
  count(distinct d.species)                         as species
from public.seasons se
left join public.line_details d on d.season = se.slug
group by se.id, se.slug, se.label, se.workbook_total;

-- ---------------------------------------------------------------------------
-- Lock the tables: row-level security on, no rules yet.
-- ---------------------------------------------------------------------------
alter table public.users          enable row level security;
alter table public.sites          enable row level security;
alter table public.areas          enable row level security;
alter table public.species        enable row level security;
alter table public.seasons        enable row level security;
alter table public.plantings      enable row level security;
alter table public.planting_lines enable row level security;
alter table public.questions      enable row level security;
alter table public.notes          enable row level security;

commit;
