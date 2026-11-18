-- Email allowlist authentication. Planting history remains public; app writes
-- require an active, verified identity linked to an approved public.users row.
begin;

alter table public.users
  add column email text,
  add column auth_user_id uuid references auth.users (id) on delete set null;

update public.users as app_user
set email = auth_user.email,
    auth_user_id = auth_user.id
from auth.users as auth_user
where auth_user.id = app_user.id;

update public.users set email = lower(btrim(email));

alter table public.users
  alter column id set default gen_random_uuid(),
  alter column email set not null,
  drop constraint users_id_fkey,
  drop column is_staff;

create unique index users_email_lower_key on public.users (lower(email));
create unique index users_auth_user_id_key on public.users (auth_user_id);

create function public.authorize_staff_signup(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  candidate_email text := lower(btrim(event #>> '{user,email}'));
begin
  if candidate_email is null or candidate_email = '' or not exists (
    select 1 from public.users as app_user
    where lower(app_user.email) = candidate_email
      and app_user.deactivated_at is null
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This email address is not approved to sign in.'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.authorize_staff_signup(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.authorize_staff_signup(jsonb) to supabase_auth_admin;

create function public.link_auth_user_to_staff() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;

  update public.users as app_user
  set auth_user_id = new.id
  where lower(app_user.email) = lower(new.email)
    and app_user.deactivated_at is null
    and app_user.auth_user_id is null
    and not exists (
      select 1 from public.users as linked
      where linked.auth_user_id = new.id
    );

  return new;
end;
$$;

create trigger link_auth_user_to_staff
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.link_auth_user_to_staff();

create function public.link_existing_auth_user_to_staff() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := lower(btrim(new.email));
  if tg_op = 'UPDATE' then
    if new.email is distinct from lower(btrim(old.email)) then
      new.auth_user_id := null;
    end if;
  end if;
  if new.auth_user_id is null then
    select auth_user.id into new.auth_user_id
    from auth.users as auth_user
    where lower(auth_user.email) = lower(new.email)
      and auth_user.email_confirmed_at is not null
    limit 1;
  end if;
  return new;
end;
$$;

create trigger link_existing_auth_user_to_staff
  before insert or update of email on public.users
  for each row execute function public.link_existing_auth_user_to_staff();

create or replace function public.current_app_user_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select app_user.id
  from public.users as app_user
  join auth.users as auth_user on auth_user.id = app_user.auth_user_id
  where app_user.auth_user_id = (select auth.uid())
    and app_user.deactivated_at is null
    and auth_user.email_confirmed_at is not null
    and lower(auth_user.email) = lower(app_user.email)
  limit 1;
$$;
revoke all on function public.current_app_user_id() from public, anon;
grant execute on function public.current_app_user_id() to authenticated;

create or replace function public.touch_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce((select public.current_app_user_id()), new.created_by);
    new.updated_by := new.created_by;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_by := coalesce(
      (select public.current_app_user_id()),
      case when new.updated_by is distinct from old.updated_by then new.updated_by end
    );
  end if;
  return new;
end;
$$;

-- Public data is readable, but the early-development grants also allowed writes.
revoke insert, update, delete, truncate, references, trigger
  on public.species, public.sites, public.areas, public.planting_events,
     public.planting_lines, public.seasons, public.questions, public.notes
  from anon;
revoke all on all sequences in schema public from anon;
revoke all on public.users from anon;
drop policy if exists "dev anonymous CRUD" on public.users;
drop policy if exists "dev anonymous read" on public.users;
drop policy if exists "dev anonymous insert" on public.users;
drop policy if exists "dev anonymous update" on public.users;
drop policy if exists "dev anonymous CRUD" on public.seasons;
drop policy if exists "dev anonymous read" on public.seasons;
drop policy if exists "dev anonymous insert" on public.seasons;
drop policy if exists "dev anonymous update" on public.seasons;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'species', 'sites', 'areas', 'planting_events', 'planting_lines', 'questions', 'notes'
  ] loop
    execute format('drop policy if exists "dev anonymous CRUD" on public.%I', table_name);
    execute format('drop policy if exists "dev anonymous read" on public.%I', table_name);
    execute format('drop policy if exists "dev anonymous insert" on public.%I', table_name);
    execute format('drop policy if exists "dev anonymous update" on public.%I', table_name);
    execute format('drop policy if exists "read live rows, staff read all" on public.%I', table_name);
    execute format('drop policy if exists "read species history" on public.%I', table_name);
    execute format('drop policy if exists "public read species history" on public.%I', table_name);
    execute format('drop policy if exists "staff add" on public.%I', table_name);
    execute format('drop policy if exists "staff edit" on public.%I', table_name);
    execute format(
      'create policy "authenticated public history" on public.%I for select to authenticated
         using (true)', table_name);
    execute format(
      'create policy "staff add" on public.%I for insert to authenticated
         with check ((select public.current_app_user_id()) is not null)', table_name);
    execute format(
      'create policy "staff edit" on public.%I for update to authenticated
         using ((select public.current_app_user_id()) is not null)
         with check ((select public.current_app_user_id()) is not null)', table_name);
  end loop;
end $$;

drop policy if exists "read self or staff" on public.users;
create policy "read self" on public.users for select to authenticated
  using (auth_user_id = (select auth.uid()));

-- The old role helper references the removed is_staff column and is no longer used.
drop function if exists public.is_staff();

-- Initial users all have full app access. Existing profiles are left unchanged.
-- Use the email as the display name where no name was supplied.
insert into public.users (name, email)
values
  ('James Bayly', 'bayly.james@gmail.com'),
  ('Pradeesh Parameswaran', 'pradeesh@prasys.info'),
  ('Sararose Brown', 'volunteer@wrtqt.org.nz'),
  ('clarkjj@gmail.com', 'clarkjj@gmail.com'),
  ('dre.cavalcanti@gmail.com', 'dre.cavalcanti@gmail.com'),
  ('Anna Amos', 'field@wrtqt.org.nz'),
  ('Kyle Grattan', 'ktgcreative@gmail.com'),
  ('Giovanni Stephens', 'stephens.giovanni@gmail.com'),
  ('jessa.swedin@gmail.com', 'jessa.swedin@gmail.com')
on conflict (lower(email)) do nothing;

commit;
