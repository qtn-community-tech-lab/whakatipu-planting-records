-- Explicit access for the server-only historical seed importer.
-- A secret key bypasses RLS, but still needs table and sequence privileges.
begin;

grant usage on schema public to service_role;

grant select, insert on
  public.sites, public.areas, public.species, public.questions, public.seasons,
  public.planting_events, public.planting_lines, public.notes
to service_role;

grant usage on sequence
  public.planting_events_id_seq, public.planting_lines_id_seq, public.notes_id_seq
to service_role;

-- The post-import season check reads this security-invoker view and its input.
grant select on public.line_details, public.totals_by_season to service_role;

commit;
