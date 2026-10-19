-- Custom migration: keep updated_at / updated_by current on every table with an edit trail.
-- In the database, not the app, so edits from the dashboard and scripts are tracked too.
-- updated_by is null for the history import, which has no signed-in user.
create or replace function public.touch_edit_trail() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$$;
--> statement-breakpoint
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'updated_by'
  loop
    execute format(
      'create trigger touch_edit_trail before update on public.%I for each row execute function public.touch_edit_trail()', t);
  end loop;
end
$$;
