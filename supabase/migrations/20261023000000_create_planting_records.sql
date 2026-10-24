-- Initial schema for a NEW Supabase project (Postgres 15+).
-- Table names and 16-character domain IDs follow the WRT target schema.
-- Historical dates, event types and quantities may be unknown. Never invent them.
begin;

-- Domain values retained from the former API contract; clients use database types.
create type public.planting_event_type as enum ('establishment', 'infill', 'replacement');

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create function private.new_id() returns text
language sql volatile set search_path = '' as $$
  select translate(substr(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), 1, 16), '+/', '-_');
$$;
revoke all on function private.new_id() from public, anon, authenticated, service_role;
grant execute on function private.new_id() to authenticated, service_role;

create table public.users (
  id text primary key default private.new_id() check (char_length(id) = 16),
  email text not null,
  display_name text not null,
  auth_user_id uuid unique references auth.users(id) on delete restrict,
  is_staff boolean not null default false,
  created_by text not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  check (updated_at >= created_at)
);

create table public.locations (
  id text primary key default private.new_id() check (char_length(id) = 16),
  geometry jsonb not null,
  radius_m integer check (radius_m > 0),
  label text not null default '',
  source_url text,
  coordinate_source_url text,
  coordinate_method text,
  checked_on date,
  created_by text not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  check (updated_at >= created_at),
  constraint locations_geometry_point_check check (
    case
      when jsonb_typeof(geometry) is distinct from 'object' then false
      when geometry ->> 'type' is distinct from 'Point' then false
      when geometry - 'type' - 'coordinates' <> '{}'::jsonb then false
      when jsonb_typeof(geometry -> 'coordinates') is distinct from 'array' then false
      when jsonb_array_length(geometry -> 'coordinates') <> 2 then false
      when jsonb_typeof(geometry -> 'coordinates' -> 0) is distinct from 'number' then false
      when jsonb_typeof(geometry -> 'coordinates' -> 1) is distinct from 'number' then false
      else (geometry -> 'coordinates' ->> 0)::numeric between -180 and 180
        and (geometry -> 'coordinates' ->> 1)::numeric between -90 and 90
    end
  )
);

create table public.sites (
  id text primary key default private.new_id() check (char_length(id) = 16),
  slug text not null unique,
  name text not null,
  description text not null default '',
  location_id text unique references public.locations(id) on delete restrict,
  is_scheme boolean not null default false,
  created_by text not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  check (updated_at >= created_at)
);

create table public.planting_areas (
  id text primary key default private.new_id() check (char_length(id) = 16),
  site_id text not null references public.sites(id) on delete restrict,
  slug text not null,
  name text not null,
  description text not null default '',
  wrt_number text,
  site_class text check (site_class in ('keystone', 'community', 'school')),
  aliases text[] not null default '{}',
  location_id text unique references public.locations(id) on delete restrict,
  created_by text not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  unique (site_id, slug),
  unique (site_id, wrt_number),
  unique (id, site_id),
  check (updated_at >= created_at)
);

create table public.species (
  id text primary key default private.new_id() check (char_length(id) = 16),
  slug text not null unique,
  scientific_name text not null,
  common_name text not null default '',
  aliases text[] not null default '{}',
  description text not null default '',
  image_url text not null default '',
  maori_name text,
  over_5m boolean,
  threatened boolean,
  threatened_te_kakano boolean not null default false,
  register_note text,
  register_code text unique,
  created_by text not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  check (updated_at >= created_at)
);

-- Reference labels can exist before any planting history is imported.
-- Events may still use free text; the catalogue is not an allowed-value list.
create table public.seasons (
  id text primary key default private.new_id() check (char_length(id) = 16),
  name text not null unique check (name = btrim(name) and name <> ''),
  created_by text not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  check (updated_at >= created_at)
);

create table public.planting_events (
  id text primary key default private.new_id() check (char_length(id) = 16),
  site_id text not null references public.sites(id) on delete restrict,
  planting_area_id text,
  -- The precise day and kind of historical planting may be unknown.
  planting_date date,
  event_type public.planting_event_type,
  season text not null default '', -- free text, for example summer or winter
  source text not null default 'app' check (source in ('app', 'workbook')),
  notes text not null default '',
  image_url text not null default '',
  created_by text not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  foreign key (planting_area_id, site_id) references public.planting_areas(id, site_id) on delete restrict,
  check (updated_at >= created_at)
);
create table public.planting_event_species (
  id text primary key default private.new_id() check (char_length(id) = 16),
  planting_event_id text not null references public.planting_events(id) on delete restrict,
  species_id text not null references public.species(id) on delete restrict,
  quantity bigint check (quantity between 0 and 9007199254740991),
  legacy_code text unique,
  precision text check (precision in ('site', 'subsite', 'area', 'scheme', 'unknown')),
  provenance jsonb not null default '{}' check (jsonb_typeof(provenance) = 'object'),
  created_by text not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  check (updated_at >= created_at)
);
create unique index one_active_line_per_species
  on public.planting_event_species(planting_event_id, species_id) where deactivated_at is null;

create index planting_areas_site_idx on public.planting_areas(site_id);
create index planting_events_site_date_idx on public.planting_events(site_id, planting_date desc, id) where deactivated_at is null;
create index planting_events_area_idx on public.planting_events(planting_area_id);
create index planting_events_season_idx on public.planting_events(season);
create index planting_event_species_species_idx on public.planting_event_species(species_id);
-- Definer helpers read the account table without recursively invoking its RLS.
create function private.current_user_id() returns text
language sql stable security definer set search_path = '' as $$
  select id from public.users where auth_user_id = (select auth.uid()) and deactivated_at is null;
$$;
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users where auth_user_id = (select auth.uid()) and is_staff and deactivated_at is null);
$$;

create function private.track_edit() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor text;
begin
  if auth.uid() is not null then
    actor := private.current_user_id();
    if actor is null then raise exception 'An active WRT account is required' using errcode = '42501'; end if;
  else
    -- Trusted operator/service imports must supply an existing domain audit actor.
    actor := coalesce(new.updated_by, new.created_by);
  end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(actor, new.created_by);
    new.created_at := statement_timestamp();
  else
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if old.deactivated_at is not null then new.deactivated_at := old.deactivated_at; end if;
  end if;
  new.updated_by := actor;
  new.updated_at := greatest(statement_timestamp(), new.created_at);
  return new;
end;
$$;

-- Every domain table has the same edit trail. Staff never get DELETE privileges.
do $$
declare t text;
begin
  foreach t in array array['users', 'locations', 'sites', 'planting_areas', 'species', 'seasons',
    'planting_events', 'planting_event_species'] loop
    execute format('create trigger track_edit before insert or update on public.%I for each row execute function private.track_edit()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to service_role', t);
    execute format('create policy staff_read on public.%I for select to authenticated using ((select public.is_staff()))', t);
    if t <> 'users' then
      execute format('grant insert, update on public.%I to authenticated', t);
      execute format('create policy staff_insert on public.%I for insert to authenticated with check ((select public.is_staff()))', t);
      execute format('create policy staff_update on public.%I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    end if;
  end loop;
end;
$$;

create policy own_account on public.users for select to authenticated using (auth_user_id = (select auth.uid()));
create policy active_sites on public.sites for select to anon, authenticated
  using (deactivated_at is null);
create policy active_areas on public.planting_areas for select to anon, authenticated
  using (deactivated_at is null and exists (
    select 1 from public.sites s where s.id = site_id and s.deactivated_at is null));
create policy active_species on public.species for select to anon, authenticated
  using (deactivated_at is null);
create policy active_seasons on public.seasons for select to anon, authenticated
  using (deactivated_at is null);
create policy active_events on public.planting_events for select to anon, authenticated
  using (deactivated_at is null
    and exists (select 1 from public.sites s where s.id = site_id and s.deactivated_at is null)
    and (planting_area_id is null or exists (select 1 from public.planting_areas a
      where a.id = planting_area_id and a.deactivated_at is null)));
create policy active_lines on public.planting_event_species for select to anon, authenticated
  using (deactivated_at is null
    and exists (select 1 from public.planting_events e where e.id = planting_event_id and e.deactivated_at is null)
    and exists (select 1 from public.species sp where sp.id = species_id and sp.deactivated_at is null));
create policy active_locations on public.locations for select to anon, authenticated
  using (deactivated_at is null);

create function private.safe_total(value numeric) returns bigint
language plpgsql immutable set search_path = '' as $$
begin
  if value < 0 or value > 9007199254740991 then
    raise exception 'Plant total exceeds the supported integer range' using errcode = '22003';
  end if;
  return coalesce(value, 0)::bigint;
end;
$$;

create view public.totals_by_site with (security_invoker = true) as
select si.slug as site, si.name as site_name,
  private.safe_total(sum(l.quantity)) as plants,
  count(distinct sp.id)::integer as species
from public.planting_event_species l
join public.planting_events e on e.id = l.planting_event_id
join public.sites si on si.id = e.site_id
left join public.planting_areas a on a.id = e.planting_area_id
join public.species sp on sp.id = l.species_id
where l.deactivated_at is null and e.deactivated_at is null
  and si.deactivated_at is null and sp.deactivated_at is null
  and (e.planting_area_id is null or a.deactivated_at is null)
group by si.id;

create view public.totals_by_species with (security_invoker = true) as
select sp.slug as species, sp.scientific_name, sp.maori_name,
  private.safe_total(sum(l.quantity)) as plants,
  count(distinct si.id)::integer as sites
from public.planting_event_species l
join public.planting_events e on e.id = l.planting_event_id
join public.sites si on si.id = e.site_id
left join public.planting_areas a on a.id = e.planting_area_id
join public.species sp on sp.id = l.species_id
where l.deactivated_at is null and e.deactivated_at is null
  and si.deactivated_at is null and sp.deactivated_at is null
  and (e.planting_area_id is null or a.deactivated_at is null)
group by sp.id;

create view public.totals_by_season with (security_invoker = true) as
select e.season,
  private.safe_total(sum(l.quantity)) as plants,
  count(distinct si.id)::integer as sites, count(distinct sp.id)::integer as species
from public.planting_event_species l
join public.planting_events e on e.id = l.planting_event_id
join public.sites si on si.id = e.site_id
left join public.planting_areas a on a.id = e.planting_area_id
join public.species sp on sp.id = l.species_id
where l.deactivated_at is null and e.deactivated_at is null
  and si.deactivated_at is null and sp.deactivated_at is null
  and (e.planting_area_id is null or a.deactivated_at is null)
group by e.season;

create view public.area_list with (security_invoker = true) as
select a.slug as area, a.name as area_name, a.wrt_number, a.site_class,
  s.slug as site, s.name as site_name, s.is_scheme,
  (pin.geometry -> 'coordinates' ->> 1)::double precision as latitude,
  (pin.geometry -> 'coordinates' ->> 0)::double precision as longitude, pin.radius_m
from public.planting_areas a join public.sites s on s.id = a.site_id
left join public.locations pin on pin.id = coalesce(a.location_id, s.location_id) and pin.deactivated_at is null
where a.deactivated_at is null and s.deactivated_at is null;

-- Invoker RPC keeps the caller's RLS. Postgres rolls the whole call back on failure.
create function public.save_planting_day(day jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare event_id text;
begin
  if not public.is_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if jsonb_typeof(day) is distinct from 'object' or jsonb_typeof(day -> 'lines') is distinct from 'array' then
    raise exception 'Supply a planting day and its lines' using errcode = '22023';
  end if;
  if jsonb_array_length(day -> 'lines') = 0 then raise exception 'Add at least one species' using errcode = '22023'; end if;
  if nullif(day ->> 'planting_date', '') is null then raise exception 'Pick the planting date' using errcode = '22023'; end if;
  if nullif(btrim(day ->> 'season'), '') is null then raise exception 'Enter a season' using errcode = '22023'; end if;
  if not exists (select 1 from public.sites where id = day ->> 'site_id' and deactivated_at is null)
    or (day ->> 'planting_area_id' is not null and not exists (
      select 1 from public.planting_areas where id = day ->> 'planting_area_id'
        and site_id = day ->> 'site_id' and deactivated_at is null)) then
    raise exception 'Choose an active site and area' using errcode = '23514';
  end if;
  if exists (select 1 from jsonb_array_elements(day -> 'lines') l
    where not exists (select 1 from public.species where id = l ->> 'species_id' and deactivated_at is null)) then
    raise exception 'Choose active species' using errcode = '23514';
  end if;
  insert into public.planting_events(site_id, planting_area_id, season, planting_date, event_type, notes)
  values (day ->> 'site_id', day ->> 'planting_area_id', btrim(day ->> 'season'),
    (day ->> 'planting_date')::date, (day ->> 'event_type')::public.planting_event_type,
    coalesce(day ->> 'notes', ''))
  returning id into event_id;
  insert into public.planting_event_species(planting_event_id, species_id, quantity)
  select event_id, l ->> 'species_id', (l ->> 'quantity')::bigint from jsonb_array_elements(day -> 'lines') l;
  return event_id;
end;
$$;

-- Explicit object grants avoid depending on project-specific default privileges.
revoke all on function public.is_staff() from public, anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;
revoke all on function private.current_user_id() from public, anon, authenticated, service_role;
grant execute on function private.current_user_id() to authenticated, service_role;
revoke all on function private.track_edit() from public, anon, authenticated, service_role;
revoke all on function private.safe_total(numeric) from public, anon, authenticated, service_role;
grant execute on function private.safe_total(numeric) to anon, authenticated, service_role;
revoke all on function public.save_planting_day(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_planting_day(jsonb) to authenticated;
revoke all on public.totals_by_site, public.totals_by_species,
  public.totals_by_season, public.area_list from public, anon, authenticated, service_role;
grant select on public.totals_by_site, public.totals_by_species,
  public.totals_by_season, public.area_list to anon, authenticated, service_role;

commit;
