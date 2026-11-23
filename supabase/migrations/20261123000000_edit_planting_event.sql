-- Corrections keep event and retained line identities, provenance and review notes.
-- A single RPC makes the event, location and line writes one transaction under RLS.
begin;

alter table public.planting_events add column image_url text;

create function public.update_planting_event(
  event_id bigint, site_slug text, area_slug text, planted_on date,
  planting_type public.planting_type, image_url text, notes text, lines jsonb
) returns table (id bigint)
language plpgsql security invoker set search_path = '' as $$
declare
  previous public.planting_events%rowtype;
  previous_site text;
  selected_area text := area_slug;
  site_name text;
  line jsonb;
  line_id bigint;
begin
  if public.current_app_user_id() is null then
    raise exception 'Staff sign-in required' using errcode = '42501';
  end if;

  select * into strict previous from public.planting_events p where p.id = event_id for update;
  select a.site into previous_site from public.areas a where a.slug = previous.area;

  select s.name into site_name from public.sites s
  where s.slug = site_slug and (s.deactivated_at is null or s.slug = previous_site);
  if site_name is null then
    raise exception 'Choose an active site' using errcode = '22023', detail = 'site';
  end if;
  if selected_area is not null then
    if not exists (select 1 from public.areas a where a.slug = selected_area and a.site = site_slug
      and (a.deactivated_at is null or a.slug = previous.area)) then
      raise exception 'Choose an area belonging to this site' using errcode = '22023', detail = 'area';
    end if;
  else
    selected_area := site_slug || '-whole-site';
    insert into public.areas (slug, site, name)
    values (selected_area, site_slug, site_name || ', whole site') on conflict (slug) do nothing;
    if not exists (select 1 from public.areas a where a.slug = selected_area and a.site = site_slug
      and a.deactivated_at is null) then
      raise exception 'Choose an active area belonging to this site' using errcode = '22023', detail = 'area';
    end if;
  end if;

  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 200 then
    raise exception 'Keep between 1 and 200 species' using errcode = '22023', detail = 'lines';
  end if;
  if (select count(*) <> count(distinct l->>'species') from jsonb_array_elements(lines) l) then
    raise exception 'Each species can only be listed once' using errcode = '22023', detail = 'lines';
  end if;
  if (select count(l->>'id') <> count(distinct l->>'id') from jsonb_array_elements(lines) l) then
    raise exception 'Each line can only be listed once' using errcode = '22023', detail = 'lines';
  end if;

  for line in select * from jsonb_array_elements(lines) loop
    if jsonb_typeof(line->'quantity') is distinct from 'number'
      or (line->>'quantity')::numeric <> trunc((line->>'quantity')::numeric)
      or (line->>'quantity')::numeric not between 1 and 100000 then
      raise exception 'Use a whole quantity between 1 and 100,000' using errcode = '22023', detail = 'lines';
    end if;
    line_id := (line->>'id')::bigint;
    if line_id is not null then
      if not exists (select 1 from public.planting_lines l where l.id = line_id
        and l.planting_event = event_id and l.species = line->>'species' and l.deactivated_at is null) then
        raise exception 'A line does not belong to this event and species' using errcode = '22023', detail = 'lines';
      end if;
    elsif not exists (select 1 from public.species s where s.slug = line->>'species' and s.deactivated_at is null) then
      raise exception 'Choose an active species' using errcode = '22023', detail = 'lines';
    end if;
  end loop;

  update public.planting_events p set area = selected_area,
    planted_on = update_planting_event.planted_on, type = planting_type,
    image_url = update_planting_event.image_url, notes = update_planting_event.notes
  where p.id = event_id;

  update public.planting_lines l set deactivated_at = now()
  where l.planting_event = event_id and l.deactivated_at is null
    and not exists (select 1 from jsonb_array_elements(lines) x where (x->>'id')::bigint = l.id);

  for line in select * from jsonb_array_elements(lines) loop
    line_id := (line->>'id')::bigint;
    if line_id is null then
      insert into public.planting_lines (planting_event, species, quantity)
      values (event_id, line->>'species', (line->>'quantity')::integer);
    else
      update public.planting_lines l set quantity = (line->>'quantity')::integer where l.id = line_id;
    end if;
  end loop;
  return query select event_id;
end;
$$;

revoke all on function public.update_planting_event(bigint, text, text, date, public.planting_type, text, text, jsonb) from public, anon;
grant execute on function public.update_planting_event(bigint, text, text, date, public.planting_type, text, text, jsonb) to authenticated;

commit;
