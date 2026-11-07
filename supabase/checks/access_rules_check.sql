-- WRT planting database: access-rule check.
-- Run in Supabase > SQL Editor after all three migrations. It acts as signed out, as a volunteer
-- and as your staff account, tries each thing, and lists PASS or FAIL.
-- It changes nothing: the one test site it adds is removed at the end.

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

-- Signed out ---------------------------------------------------------------
set role anon;
select pg_temp.try(1, 'Signed out', 'read sites',          'blocked', 'select 1 from public.sites');
select pg_temp.try(2, 'Signed out', 'read season totals',  'blocked', 'select 1 from public.totals_by_season');
select pg_temp.try(3, 'Signed out', 'add a site',          'blocked', $$insert into public.sites (slug, name) values ('rls-check', 'x')$$);
reset role;

-- Signed in, not staff -----------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', false);
set role authenticated;
select pg_temp.try(4, 'Volunteer', 'read seasons',         'allowed', 'select 1 from public.seasons');
select pg_temp.try(5, 'Volunteer', 'read season totals',   'allowed', 'select 1 from public.totals_by_season');
select pg_temp.try(6, 'Volunteer', 'add a site',           'blocked', $$insert into public.sites (slug, name) values ('rls-check', 'x')$$);
select pg_temp.try(7, 'Volunteer', 'change a season',      'blocked', $$update public.seasons set label = 'x'$$);
select pg_temp.try(8, 'Volunteer', 'delete a planting event', 'blocked', 'delete from public.planting_events');
select pg_temp.try(9, 'Volunteer', 'make themselves staff','blocked', 'update public.users set is_staff = true');
reset role;

-- Staff: the first live staff row in users -------------------------------
select set_config('request.jwt.claims', coalesce(
  (select json_build_object('sub', id, 'role', 'authenticated')::text
     from public.users where is_staff and deactivated_at is null limit 1),
  '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}'), false);
set role authenticated;
select pg_temp.try(10, 'Staff', 'add a site',              'allowed', $$insert into public.sites (slug, name) values ('rls-check', 'RLS check')$$);
select pg_temp.try(11, 'Staff', 'deactivate it',           'allowed', $$update public.sites set deactivated_at = now() where slug = 'rls-check'$$);
select pg_temp.try(12, 'Staff', 'reactivate it',           'blocked', $$update public.sites set deactivated_at = null where slug = 'rls-check'$$);
select pg_temp.try(13, 'Staff', 'delete it',               'blocked', $$delete from public.sites where slug = 'rls-check'$$);
select pg_temp.try(14, 'Staff', 'add a spreadsheet planting event', 'blocked', $$insert into public.planting_events (area, season, source) values ('nowhere', 0, 'workbook')$$);
select pg_temp.try(15, 'Staff', 'make someone staff',      'blocked', 'update public.users set is_staff = true');
select pg_temp.try(16, 'Staff', 'change a season',         'blocked', $$update public.seasons set label = 'x'$$);
reset role;
select set_config('request.jwt.claims', '', false);

-- Tidy up and report -------------------------------------------------------
delete from public.sites where slug = 'rls-check';

select n, who, test, expected, got,
       case when expected = got then 'PASS' else 'FAIL' end as result
from rls_check order by n;
