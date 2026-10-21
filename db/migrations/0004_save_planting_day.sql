-- Custom migration: the one database function. Saving a planting day writes an event and
-- all its lines; they must land together or not at all, which a single call from the
-- browser cannot promise. Everything else in the app is a plain query.
--
-- security invoker: it runs as the signed-in person, so the staff access rules apply to
-- both inserts. created_by / updated_by come from the edit trail, not from the caller.
-- The table checks still hold: a new event needs a date, one line per species, no negative counts.
create or replace function public.save_planting_day(
  p_site_area_id integer,
  p_season_id integer,
  p_planting_date date,
  p_event_type public.event_type,
  p_notes text,
  p_is_public boolean,
  p_lines jsonb
) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  new_event_id integer;
  line_count integer;
begin
  insert into public.planting_events (site_area_id, season_id, planting_date, event_type, notes, is_public, source)
  values (p_site_area_id, p_season_id, p_planting_date, p_event_type, coalesce(p_notes, ''), coalesce(p_is_public, false), 'app')
  returning id into new_event_id;

  insert into public.planting_lines (event_id, species_id, quantity)
  select new_event_id, line.species_id, line.quantity
  from jsonb_to_recordset(p_lines) as line(species_id integer, quantity integer);
  get diagnostics line_count = row_count;

  raise log 'save_planting_day: event % with % lines', new_event_id, line_count;
  return new_event_id;
end
$$;
--> statement-breakpoint
revoke execute on function public.save_planting_day(integer, integer, date, public.event_type, text, boolean, jsonb) from public, anon;
--> statement-breakpoint
grant execute on function public.save_planting_day(integer, integer, date, public.event_type, text, boolean, jsonb) to authenticated;
