-- Navigation needs counts and search names, not the complete planting ledger.
-- One statement keeps the reference names and their scoped totals consistent.
begin;

create function public.read_layout_summary(show_review boolean default true)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with history as materialized (
    select season, site, species, quantity, needs_review, site_original, species_original
    from public.line_details
  ), scoped as materialized (
    select * from history where show_review or not needs_review
  ), season_totals as (
    select season, coalesce(sum(quantity), 0) as plants,
      coalesce(sum(quantity) filter (where needs_review), 0) as plants_needs_review,
      count(*) as lines
    from scoped group by season
  ), site_totals as (
    select site, coalesce(sum(quantity), 0) as plants
    from scoped group by site
  ), species_totals as (
    select species, coalesce(sum(quantity), 0) as plants
    from scoped group by species
  ), site_terms as (
    select site, array_agg(distinct term order by term) as terms
    from (
      select site, name as term from public.areas
      union all
      select site, site_original from history where site_original is not null
    ) names group by site
  ), species_terms as (
    select species, array_agg(distinct species_original order by species_original) as terms
    from history where species_original is not null group by species
  )
  select jsonb_build_object(
    'siteCount', (select count(*) from public.sites where deactivated_at is null),
    'speciesCount', (select count(*) from public.species where deactivated_at is null),
    'records', (select count(*) from scoped),
    'seasons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', s.slug, 'label', s.label, 'year', s.year, 'half', s.half,
        'total', coalesce(t.plants, 0), 'needsReview', coalesce(t.plants_needs_review, 0),
        'records', coalesce(t.lines, 0)
      ) order by s.id)
      from public.seasons s
      left join season_totals t on t.season = s.slug
      where exists (select 1 from history h where h.season = s.slug)
    ), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', s.slug, 'name', s.name, 'total', t.plants,
        'terms', coalesce(n.terms, '{}'::text[])
      ))
      from public.sites s
      join site_totals t on t.site = s.slug
      left join site_terms n on n.site = s.slug
    ), '[]'::jsonb),
    'species', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', s.slug, 'scientificName', s.scientific_name,
        'suggestedSpelling', s.suggested_spelling, 'commonName', s.common_name,
        'maoriName', s.maori_name, 'total', coalesce(t.plants, 0),
        'terms', coalesce(n.terms, '{}'::text[])
      ))
      from public.species s
      left join species_totals t on t.species = s.slug
      left join species_terms n on n.species = s.slug
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.read_layout_summary(boolean) from public, anon, authenticated, service_role;
grant execute on function public.read_layout_summary(boolean) to anon, authenticated, service_role;

commit;
