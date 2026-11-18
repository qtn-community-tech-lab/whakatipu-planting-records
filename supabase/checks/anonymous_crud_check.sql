-- Run as postgres after all migrations. Public history stays readable while
-- anonymous writes and user-profile access stay blocked. All checks roll back.
begin;

create temp table access_check (n int, test text, expected text, got text);
grant all on access_check to anon;

create function pg_temp.try(n int, test text, expected text, stmt text)
returns void language plpgsql as $f$
begin
  execute stmt;
  insert into pg_temp.access_check values (n, test, expected, 'allowed');
exception when insufficient_privilege then
  insert into pg_temp.access_check values (n, test, expected, 'blocked');
end $f$;

insert into public.sites (slug, name, deactivated_at)
values ('anonymous-history-check', 'Anonymous history check', now());

set local role anon;
select pg_temp.try(1, 'read deactivated site history', 'allowed',
  $$select 1 from public.sites where slug = 'anonymous-history-check'$$);
select pg_temp.try(2, 'read species', 'allowed', 'select 1 from public.species');
select pg_temp.try(3, 'read seasons', 'allowed', 'select 1 from public.seasons');
select pg_temp.try(4, 'read totals', 'allowed', 'select 1 from public.totals_by_season');
select pg_temp.try(5, 'read private user profiles', 'blocked', 'select 1 from public.users');
select pg_temp.try(6, 'insert site', 'blocked',
  $$insert into public.sites (slug, name) values ('anonymous-write-check', 'x')$$);
select pg_temp.try(7, 'update site', 'blocked',
  $$update public.sites set name = name where slug = 'anonymous-history-check'$$);
select pg_temp.try(8, 'delete site', 'blocked',
  $$delete from public.sites where slug = 'anonymous-history-check'$$);
select pg_temp.try(9, 'write seasons', 'blocked', $$update public.seasons set label = label where false$$);
reset role;

select n, test, expected, got,
       case when expected = got then 'PASS' else 'FAIL' end as result
from access_check order by n;

rollback;
