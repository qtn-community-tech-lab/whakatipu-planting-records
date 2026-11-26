-- Signed-in reads require explicit grants on projects without Supabase's default privileges.
-- Existing row-level security policies govern which rows are visible.
begin;

grant select on
  public.sites, public.areas, public.species, public.seasons,
  public.planting_events, public.planting_lines, public.questions, public.notes,
  public.users
  to authenticated;

grant select on
  public.line_details, public.totals_by_area, public.totals_by_season,
  public.totals_by_site, public.totals_by_species
  to authenticated;

commit;
