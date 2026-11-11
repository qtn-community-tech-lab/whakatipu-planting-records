-- Early development only: anonymous CRUD on the seven app tables below.
-- Applies wherever this migration runs, including hosted deployments.
-- In particular, anonymous callers can read users and change is_staff.
-- Remove these grants and policies before exposing real data publicly.
begin;

do $$
declare t text;
begin
  foreach t in array array[
    'species', 'sites', 'areas', 'planting_events', 'planting_lines', 'seasons', 'users'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to anon', t);
    execute format(
      'create policy "dev anonymous CRUD" on public.%I for all to anon
         using (true) with check (true)', t);
  end loop;
end $$;

-- New events and lines allocate their own IDs. Other tables take explicit keys.
grant usage on sequence public.planting_events_id_seq, public.planting_lines_id_seq to anon;

commit;
