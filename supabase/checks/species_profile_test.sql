-- Local regression test after all migrations. Every fixture rolls back.
-- Run with psql -v ON_ERROR_STOP=1 -f this_file.sql.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;

select pg_temp.assert_true(
  not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'species'
      and (column_name in ('profile', 'name_note') or starts_with(column_name, 'profile_'))),
  'Legacy and duplicate profile columns must be removed');

insert into public.species (slug, scientific_name)
  values ('profile-test-empty', 'Register name');
select pg_temp.assert_true(
  (select maori_name_alternatives = '{}'::text[]
    and summary is null and look_for is null
    and sources = '[]'::jsonb and checked_at is null
   from public.species where slug = 'profile-test-empty'),
  'New species must default to empty reference fields');

insert into public.species (
  slug, scientific_name, common_name, maori_name,
  maori_name_alternatives,
  summary, look_for, sources, checked_at
) values (
  'profile-test-filled', 'Register spelling', 'Register common name', 'Register Māori name',
  array['First Māori alternative', 'Second Māori alternative'],
  'Sourced summary.', 'Identification features.',
  '[{"label":"First source","url":"https://example.com/first"},
    {"label":"Second source","url":"https://example.com/second"}]', '2026-11-19'
);

do $$
begin
  begin
    update public.species set sources = '{}'::jsonb where slug = 'profile-test-filled';
    raise exception 'Object-shaped sources must be rejected';
  exception when check_violation then null;
  end;
  begin
    update public.species set checked_at = 'not-a-date' where slug = 'profile-test-filled';
    raise exception 'Invalid profile dates must be rejected';
  exception when invalid_datetime_format then null;
  end;
end $$;

set local role anon;
select pg_temp.assert_true(
  (select scientific_name = 'Register spelling' and common_name = 'Register common name'
    and maori_name = 'Register Māori name'
    and maori_name_alternatives = array['First Māori alternative', 'Second Māori alternative']
    and summary = 'Sourced summary.'
    and look_for = 'Identification features.'
    and sources -> 0 ->> 'label' = 'First source'
    and sources -> 1 ->> 'label' = 'Second source'
    and checked_at = date '2026-11-19'
   from public.species where slug = 'profile-test-filled'),
  'Public readers must receive the saved profile, preserving register names, Māori names and source order');

rollback;
