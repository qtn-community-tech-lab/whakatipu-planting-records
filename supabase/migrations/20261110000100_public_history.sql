-- Planting data remains publicly readable after deactivation, independently of
-- development access. This grants no writes and excludes the private users table.
-- Views and active selectors retain their explicit deactivated_at filters.
begin;

do $$
declare t text;
begin
  foreach t in array array[
    'species', 'sites', 'areas', 'planting_events', 'planting_lines', 'questions', 'notes'
  ] loop
    execute format('drop policy "public read live rows" on public.%I', t);
    execute format('create policy "public read history" on public.%I for select to anon using (true)', t);
  end loop;
end $$;

commit;
