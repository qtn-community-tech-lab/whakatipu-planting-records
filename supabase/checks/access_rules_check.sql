-- Run as postgres after all migrations. It rolls back its test rows.
-- Active-user cases need one confirmed Auth identity linked to a public.users profile.
begin;

create temp table rls_check (n int, who text, test text, expected text, got text);
grant all on rls_check to anon, authenticated;

create function pg_temp.try(n int, who text, test text, expected text, stmt text)
returns void language plpgsql as $f$
begin
  execute stmt;
  insert into pg_temp.rls_check values (n, who, test, expected, 'allowed');
exception when insufficient_privilege then
  insert into pg_temp.rls_check values (n, who, test, expected, 'blocked');
end $f$;

create function pg_temp.try_visible(n int, who text, test text, expected text, stmt text)
returns void language plpgsql as $f$
declare visible boolean;
begin
  execute 'select exists (' || stmt || ')' into visible;
  insert into pg_temp.rls_check values (
    n, who, test, expected, case when visible then 'allowed' else 'blocked' end
  );
exception when insufficient_privilege then
  insert into pg_temp.rls_check values (n, who, test, expected, 'blocked');
end $f$;

insert into public.sites (slug, name) values ('rls-check-staff', 'RLS check');
insert into public.areas (slug, site, name) values ('rls-check-staff', 'rls-check-staff', 'RLS check');
insert into public.sites (slug, name, deactivated_at)
  values ('rls-check-history', 'RLS history check', now());

-- Signed out: history stays readable, the private allowlist and all writes are blocked.
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select pg_temp.try(1, 'Public', 'read sites', 'allowed', 'select 1 from public.sites');
select pg_temp.try_visible(2, 'Public', 'read deactivated history', 'allowed',
  $$select 1 from public.sites where slug = 'rls-check-history'$$);
select pg_temp.try(3, 'Public', 'read season totals', 'allowed', 'select 1 from public.totals_by_season');
select pg_temp.try(4, 'Public', 'read user profiles', 'blocked', 'select 1 from public.users');
select pg_temp.try(5, 'Public', 'add a site', 'blocked',
  $$insert into public.sites (slug, name) values ('rls-check-anon', 'x')$$);
select pg_temp.try(6, 'Public', 'change a site', 'blocked',
  $$update public.sites set name = name where slug = 'rls-check-staff'$$);
select pg_temp.try(7, 'Public', 'delete a site', 'blocked',
  $$delete from public.sites where slug = 'rls-check-staff'$$);
reset role;

-- A signed-in identity with no approved profile can read active public data, not write it.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.try_visible(8, 'Unapproved identity', 'read deactivated public history', 'allowed',
  $$select 1 from public.sites where slug = 'rls-check-history'$$);
select pg_temp.try(9, 'Unapproved identity', 'add a site', 'blocked',
  $$insert into public.sites (slug, name) values ('rls-check-unapproved', 'x')$$);
select pg_temp.try(10, 'Unapproved identity', 'update a season', 'blocked',
  'update public.seasons set label = label where false');
select pg_temp.try(11, 'Unapproved identity', 'edit user profile', 'blocked',
  'update public.users set name = name where auth_user_id = auth.uid()');
select pg_temp.try(12, 'Unapproved identity', 'delete a site', 'blocked',
  $$delete from public.sites where slug = 'rls-check-staff'$$);
reset role;

-- Use a linked active profile, preferring one whose app ID differs from its Auth ID.
select set_config('request.jwt.claims', coalesce((
  select json_build_object('sub', auth_user.id, 'role', 'authenticated')::text
  from public.users as app_user
  join auth.users as auth_user on auth_user.id = app_user.auth_user_id
  where app_user.deactivated_at is null
    and auth_user.email_confirmed_at is not null
    and lower(app_user.email) = lower(auth_user.email)
  order by (app_user.id <> auth_user.id) desc
  limit 1
), '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}'), true);
select set_config('authcheck.app_user_id', coalesce((
  select app_user.id::text
  from public.users as app_user
  join auth.users as auth_user on auth_user.id = app_user.auth_user_id
  where app_user.deactivated_at is null
    and auth_user.email_confirmed_at is not null
    and lower(app_user.email) = lower(auth_user.email)
  order by (app_user.id <> auth_user.id) desc
  limit 1
), ''), true);
set local role authenticated;
select pg_temp.try(13, 'Active user', 'add a site', 'allowed',
  $$insert into public.sites (slug, name) values ('rls-check-created', 'RLS check')$$);
select pg_temp.try(14, 'Active user', 'deactivate a site', 'allowed',
  $$update public.sites set deactivated_at = now() where slug = 'rls-check-created'$$);
select pg_temp.try(15, 'Active user', 'reactivate a site', 'blocked',
  $$update public.sites set deactivated_at = null where slug = 'rls-check-created'$$);
select pg_temp.try(16, 'Active user', 'delete a site', 'blocked',
  $$delete from public.sites where slug = 'rls-check-created'$$);
select pg_temp.try(17, 'Active user', 'change a season', 'blocked',
  'update public.seasons set label = label where false');
select pg_temp.try(18, 'Active user', 'edit own profile', 'allowed',
  'update public.users set name = name where auth_user_id = auth.uid()');
select pg_temp.try_visible(19, 'Active user', 'read the user list', 'allowed',
  'select 1 from public.users');
select pg_temp.try(20, 'Active user', 'add a user', 'allowed',
  $$insert into public.users (name, email)
    values ('RLS check user', 'rls-check-' || current_setting('authcheck.app_user_id') || '@example.org')$$);
select pg_temp.try(21, 'Active user', 'edit another profile', 'allowed',
  $$update public.users set name = 'Updated RLS check user'
    where email = 'rls-check-' || current_setting('authcheck.app_user_id') || '@example.org'$$);
select pg_temp.try(22, 'Active user', 'change an app user ID', 'blocked',
  $$update public.users set id = gen_random_uuid()
    where email = 'rls-check-' || current_setting('authcheck.app_user_id') || '@example.org'$$);
select pg_temp.try(23, 'Active user', 'change an Auth identity link', 'blocked',
  $$update public.users set auth_user_id = auth.uid()
    where email = 'rls-check-' || current_setting('authcheck.app_user_id') || '@example.org'$$);
select pg_temp.try(24, 'Active user', 'deactivate a user', 'allowed',
  $$update public.users set deactivated_at = now()
    where email = 'rls-check-' || current_setting('authcheck.app_user_id') || '@example.org'$$);
select pg_temp.try(25, 'Active user', 'reactivate a user', 'blocked',
  $$update public.users set deactivated_at = null
    where email = 'rls-check-' || current_setting('authcheck.app_user_id') || '@example.org'$$);
reset role;

-- touch_row must write the stable public.users ID, even when it differs from auth.uid().
select case
  when current_setting('authcheck.app_user_id') <> ''
   and exists (
     select 1 from public.sites
     where slug = 'rls-check-created'
       and created_by::text = current_setting('authcheck.app_user_id')
   )
  then 'PASS' else 'FAIL' end as audit_uses_application_user_id;

select n, who, test, expected, got,
       case when expected = got then 'PASS' else 'FAIL' end as result
from rls_check order by n;

rollback;
