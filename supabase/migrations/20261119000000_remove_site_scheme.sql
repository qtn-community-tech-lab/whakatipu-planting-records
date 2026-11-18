-- Views expose the flag, so PostgreSQL requires rebuilding them around the drop.
-- Capture their definitions and grants rather than duplicating the reporting SQL.
begin;

create temporary table scheme_views on commit drop as
select v.name, v.position, pg_get_viewdef(c.oid, true) as definition,
  (select string_agg(format('grant %s on public.%I to %I%s;',
    a.privilege_type, c.relname, r.rolname,
    case when a.is_grantable then ' with grant option' else '' end), E'\n')
   from aclexplode(c.relacl) a join pg_roles r on r.oid = a.grantee
   where a.grantee <> c.relowner) as grants
from unnest(array[
  'line_details', 'site_area_species', 'site_area_seasons',
  'totals_by_season', 'totals_by_site', 'totals_by_area',
  'totals_by_species', 'season_species', 'season_sites', 'totals_by_question'
]) with ordinality v(name, position)
join pg_class c on c.oid = to_regclass(format('public.%I', v.name));

do $$
declare v record;
begin
  for v in select * from scheme_views order by position desc loop
    execute format('drop view public.%I', v.name);
  end loop;

  alter table public.sites drop column is_scheme;

  for v in select * from scheme_views order by position loop
    if v.name in ('line_details', 'totals_by_site') then
      v.definition := replace(replace(replace(v.definition,
        'si.is_scheme,', ''), 'is_scheme,', ''), ', is_scheme', '');
    end if;
    execute format('create view public.%I with (security_invoker = true) as %s',
      v.name, v.definition);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', v.name);
    if v.grants is not null then execute v.grants; end if;
  end loop;
end $$;

commit;
