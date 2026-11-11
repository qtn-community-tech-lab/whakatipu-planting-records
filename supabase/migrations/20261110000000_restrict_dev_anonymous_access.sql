-- Also tighten databases that already ran the original development CRUD grants.
begin;

revoke all on public.users from anon;
drop policy if exists "dev anonymous CRUD" on public.users;

do $$
declare t text;
begin
  foreach t in array array[
    'species', 'sites', 'areas', 'planting_events', 'planting_lines', 'seasons'
  ] loop
    execute format('revoke delete on public.%I from anon', t);
    execute format('drop policy if exists "dev anonymous CRUD" on public.%I', t);
    execute format('drop policy if exists "dev anonymous read" on public.%I', t);
    execute format('drop policy if exists "dev anonymous insert" on public.%I', t);
    execute format('drop policy if exists "dev anonymous update" on public.%I', t);
    execute format('create policy "dev anonymous read" on public.%I for select to anon using (true)', t);
    execute format('create policy "dev anonymous insert" on public.%I for insert to anon with check (true)', t);
    execute format('create policy "dev anonymous update" on public.%I for update to anon using (true) with check (true)', t);
  end loop;
end $$;

commit;
