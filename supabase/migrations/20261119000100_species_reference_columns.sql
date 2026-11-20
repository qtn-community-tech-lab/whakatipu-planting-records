-- Species names are stored once; the profile is built from these names and reference fields.
begin;

alter table public.species
  add column maori_name_alternatives text[] not null default '{}',
  add column name_note text,
  add column summary text,
  add column look_for text,
  add column sources jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sources) = 'array'),
  add column checked_at date;

-- This changes storage only; preserve the original audit timestamps and users.
alter table public.species disable trigger touch;

update public.species
set maori_name_alternatives = array(
      select name from jsonb_array_elements_text(profile -> 'maoriNames') as names(name)
      where name is distinct from maori_name
    ),
    name_note = profile ->> 'nameNote',
    summary = profile ->> 'summary',
    look_for = profile ->> 'lookFor',
    sources = profile -> 'sources',
    checked_at = (profile ->> 'checkedAt')::date
where profile <> '{}'::jsonb;

alter table public.species enable trigger touch;
alter table public.species drop column profile;

commit;
