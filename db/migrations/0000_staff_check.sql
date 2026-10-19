-- Custom migration: runs before the tables exist, because every access rule calls it.
-- plpgsql, so the body is only checked when it runs (after profiles exists).
-- security definer, so it can read profiles without tripping profiles' own access rules.
create or replace function public.is_staff() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and is_staff and deactivated_at is null
  );
end
$$;
