-- WRT planting database: the explorer is public.
-- Run once in Supabase > SQL Editor, after access_rules.sql.
--
-- Signed-out visitors now read what a signed-in volunteer reads: live rows of
-- every table except users, and every totals view. Nobody signed out can write.
-- A full security review comes before sign-in and staff editing go live.
begin;

grant select on public.sites, public.areas, public.species, public.seasons,
  public.plantings, public.planting_lines, public.questions, public.notes,
  public.line_details, public.totals_by_site, public.totals_by_area,
  public.totals_by_species, public.totals_by_season
  to anon;

create policy "public read" on public.seasons for select to anon using (true);

do $$
declare t text;
begin
  foreach t in array array['sites', 'areas', 'species', 'plantings', 'planting_lines', 'questions', 'notes'] loop
    execute format(
      'create policy "public read live rows" on public.%I for select to anon using (retired_at is null)', t);
  end loop;
end $$;

commit;
