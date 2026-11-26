-- Make the existing staff write policies usable without Supabase's default grants.
begin;

grant insert, update, delete on
  public.sites, public.areas, public.species, public.planting_events,
  public.planting_lines, public.questions, public.notes
  to authenticated;

commit;
