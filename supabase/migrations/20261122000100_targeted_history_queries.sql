-- Shared measures stay in PostgreSQL. The app downloads grouped presentation
-- data and bounded public review rows, never the complete historical ledger.
begin;

create or replace function public.read_history_references(profile text default 'names')
returns jsonb language sql stable security invoker set search_path = '' as $$
  with history as materialized (
    select site, area, species, season, quantity, site_original, species_original from public.line_details
  ), species_aliases as (
    select species, array_agg(distinct species_original order by species_original) as aliases
    from history where species_original is not null group by species
  ), area_aliases as (
    select area, array_agg(distinct site_original order by site_original) as aliases
    from history where site_original is not null group by area
  )
  select jsonb_build_object(
    'seasons', coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.seasons s
      where exists (select 1 from history h where h.season = s.slug)), '[]'::jsonb),
    'sites', coalesce((select jsonb_agg(jsonb_build_object(
      'slug', s.slug, 'name', s.name, 'description', s.description, 'deactivated_at', s.deactivated_at,
      'classes', coalesce((select jsonb_agg(c.class order by c.plants desc, c.class) from (
        select coalesce(a.class::text, 'unknown') as class, coalesce(sum(h.quantity), 0) as plants
        from public.areas a left join history h on h.area = a.slug
        where a.site = s.slug group by a.class
      ) c), '[]'::jsonb)
    ) order by s.name) from public.sites s), '[]'::jsonb),
    'areas', coalesce((select jsonb_agg(jsonb_build_object(
      'slug', a.slug, 'site', a.site, 'name', a.name, 'wrt_number', a.wrt_number,
      'class', a.class, 'deactivated_at', a.deactivated_at,
      'aliases', coalesce(n.aliases, '{}'::text[])
    ) order by a.name) from public.areas a left join area_aliases n on n.area = a.slug), '[]'::jsonb),
    'species', coalesce((select jsonb_agg(jsonb_build_object(
      'slug', s.slug, 'register_code', s.register_code, 'scientific_name', s.scientific_name,
      'suggested_spelling', s.suggested_spelling, 'common_name', s.common_name, 'maori_name', s.maori_name,
      'status', s.status, 'over_5m', s.over_5m, 'threatened', s.threatened,
      'threatened_te_kakano', s.threatened_te_kakano, 'contested_group', s.contested_group,
      'needs_decision', s.needs_decision, 'deactivated_at', s.deactivated_at,
      'aliases', coalesce(n.aliases, '{}'::text[]),
      'photos', case when profile in ('cards', 'full') then s.photos
        when jsonb_array_length(s.photos) > 0 then jsonb_build_array(s.photos->0) else '[]'::jsonb end
    ) || case when profile in ('cards', 'full') then jsonb_build_object(
      'summary', s.summary, 'look_for', s.look_for
    ) else '{}'::jsonb end || case when profile = 'full' then jsonb_build_object(
      'maori_name_alternatives', s.maori_name_alternatives, 'sources', s.sources, 'checked_at', s.checked_at
    ) else '{}'::jsonb end order by s.scientific_name)
    from public.species s left join species_aliases n on n.species = s.slug), '[]'::jsonb)
  );
$$;

-- Both aggregates and record pages use exactly the same filters and RLS.
create or replace function public.filter_planting_history(filters jsonb default '{}'::jsonb, show_review boolean default true)
returns setof public.line_details language sql stable security invoker set search_path = '' as $$
  select d.* from public.line_details d
  where (show_review or not d.needs_review)
    and (filters->>'site' is null or d.site = filters->>'site')
    and (filters->>'area' is null or d.area = filters->>'area')
    and (filters->>'species' is null or d.species = filters->>'species')
    and (filters->>'season' is null or d.season = filters->>'season')
    and (filters->>'year' is null or d.year = (filters->>'year')::integer)
    and (filters->>'half' is null or d.season like (filters->>'half') || '-%')
    and (filters->>'theme' is null or (d.needs_review and exists (
      select 1 from jsonb_array_elements(d.notes) n
      where n->>'kind' <> 'fyi' and n->>'question' = filters->>'theme'
    )));
$$;

create or replace function public.read_planting_summary(group_by text[] default '{}'::text[], filters jsonb default '{}'::jsonb,
  show_review boolean default true, include_group_counts boolean default true)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with history as materialized (
    select d.* from public.filter_planting_history(filters, show_review) d
  ), grouped as (
    select
      case when 'site' = any(group_by) then d.site end as site,
      case when 'area' = any(group_by) then d.area end as area,
      case when 'species' = any(group_by) then d.species end as species,
      case when 'season' = any(group_by) then d.season end as season,
      case when 'class' = any(group_by) then coalesce(d.class::text, 'unknown') end as class,
      case when 'precision' = any(group_by) then coalesce(d.precision, 'unknown') end as precision,
      case when 'confidence' = any(group_by) then coalesce(d.confidence, 'high') end as confidence,
      t.theme,
      coalesce(sum(d.quantity), 0) as total,
      coalesce(sum(d.quantity) filter (where not d.needs_review), 0) as resolved,
      coalesce(sum(d.quantity) filter (where d.needs_review), 0) as needs_review,
      count(*) as records, count(*) filter (where d.needs_review) as records_needing_review,
      count(distinct d.site) as sites, count(distinct d.species) as species_count,
      count(distinct d.season) as seasons, min(d.season_order) as first_season, max(d.season_order) as last_season
    from history d
    cross join lateral (
      select distinct n->>'question' as theme from jsonb_array_elements(d.notes) n
      where 'theme' = any(group_by) and d.needs_review and n->>'kind' <> 'fyi'
      union all
      select null::text where not ('theme' = any(group_by))
    ) t
    group by 1, 2, 3, 4, 5, 6, 7, 8
  )
  select jsonb_build_object(
    'totals', (select jsonb_build_object(
      'total', coalesce(sum(quantity), 0),
      'resolved', coalesce(sum(quantity) filter (where not needs_review), 0),
      'needsReview', coalesce(sum(quantity) filter (where needs_review), 0),
      'records', count(*), 'recordsNeedingReview', count(*) filter (where needs_review),
      'sites', count(distinct site), 'species', count(distinct species), 'seasons', count(distinct season),
      'firstSeason', min(season_order), 'lastSeason', max(season_order)
    ) from history),
    'rows', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'site', site, 'area', area, 'species', species, 'season', season,
      'class', class, 'precision', precision, 'confidence', confidence, 'theme', theme
    )) || jsonb_build_object(
      'split', jsonb_build_object('total', total, 'resolved', resolved, 'needsReview', needs_review,
        'records', records, 'recordsNeedingReview', records_needing_review)
    ) || case when include_group_counts then jsonb_build_object(
      'siteCount', sites, 'speciesCount', species_count, 'seasonCount', seasons,
      'firstSeason', first_season, 'lastSeason', last_season
    ) else '{}'::jsonb end
    order by total desc, site, area, species, season, class, precision, confidence, theme) from grouped), '[]'::jsonb)
  );
$$;

create or replace function public.read_public_review_rows(filters jsonb default '{}'::jsonb, show_review boolean default true,
  row_limit integer default 25)
returns setof public.line_details language sql stable security invoker set search_path = '' as $$
  select d.* from public.filter_planting_history(filters, show_review) d
  where d.needs_review
  order by coalesce(d.quantity, 0) desc, d.season_order, d.line_id
  limit greatest(1, least(row_limit, 25));
$$;

create or replace function public.read_site_species_leaders(show_review boolean default true, leader_count integer default 3)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with groups as (
    select value, row_number() over (partition by value->>'site'
      order by (value#>>'{split,total}')::bigint desc, value->>'species') as rank,
      count(*) over (partition by value->>'site') as species_count
    from jsonb_array_elements(public.read_planting_summary(array['site', 'species'], '{}', show_review, false)->'rows')
  )
  select coalesce(jsonb_agg(value || jsonb_build_object('speciesCount', species_count)
    order by value->>'site', rank), '[]'::jsonb)
  from groups where rank <= greatest(1, least(leader_count, 12));
$$;

create or replace function public.read_season_leaders(show_review boolean default true, leader_count integer default 3)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with species_groups as (
    select value, row_number() over (partition by value->>'season'
      order by (value#>>'{split,total}')::bigint desc, value->>'species') as rank
    from jsonb_array_elements(public.read_planting_summary(array['season', 'species'], '{}', show_review, false)->'rows')
  ), site_groups as (
    select value, row_number() over (partition by value->>'season'
      order by (value#>>'{split,total}')::bigint desc, value->>'site') as rank
    from jsonb_array_elements(public.read_planting_summary(array['season', 'site'], '{}', show_review, false)->'rows')
  )
  select jsonb_build_object(
    'species', coalesce((select jsonb_agg(value order by value->>'season', rank)
      from species_groups where rank <= greatest(1, least(leader_count, 12))), '[]'::jsonb),
    'sites', coalesce((select jsonb_agg(value order by value->>'season', rank)
      from site_groups where rank <= greatest(1, least(leader_count, 12))), '[]'::jsonb)
  );
$$;

revoke all on function public.read_history_references(text), public.filter_planting_history(jsonb, boolean),
  public.read_planting_summary(text[], jsonb, boolean, boolean), public.read_public_review_rows(jsonb, boolean, integer),
  public.read_site_species_leaders(boolean, integer), public.read_season_leaders(boolean, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.read_history_references(text), public.filter_planting_history(jsonb, boolean),
  public.read_planting_summary(text[], jsonb, boolean, boolean), public.read_public_review_rows(jsonb, boolean, integer),
  public.read_site_species_leaders(boolean, integer), public.read_season_leaders(boolean, integer)
  to anon, authenticated, service_role;

commit;
