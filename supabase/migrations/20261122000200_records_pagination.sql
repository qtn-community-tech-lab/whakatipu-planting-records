-- Records shares the existing aggregates, adding review/text filters and a
-- fixed-size row page. All reads continue to apply caller permissions and RLS.
begin;

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
    and (coalesce(filters->>'review', 'all') = 'all'
      or (filters->>'review' = 'needs-review' and d.needs_review)
      or (filters->>'review' = 'resolved' and not d.needs_review))
    and (filters->>'theme' is null or (d.needs_review and exists (
      select 1 from jsonb_array_elements(d.notes) n
      where n->>'kind' <> 'fyi' and n->>'question' = filters->>'theme'
    )))
    and (not (filters ? 'textSites')
      or (filters->'textSites') ? d.site
      or (filters->'textSpecies') ? d.species
      or (filters->'textAreas') ? d.area);
$$;

-- Match the existing en-NZ name ordering, including Māori names with macrons.
create collation public.records_name_order (provider = icu, locale = 'en-NZ');

create function public.read_records_page(filters jsonb default '{}'::jsonb, show_review boolean default true,
  sort_by text default 'season', page_number integer default 1)
returns setof public.line_details language sql stable security invoker set search_path = '' as $$
  select d.* from public.filter_planting_history(filters, show_review) d
  order by
    case when sort_by = 'plants' then coalesce(d.quantity, 0) end desc,
    case when sort_by = 'site' then d.site_name end collate public.records_name_order,
    case when sort_by = 'site' then d.area_name end collate public.records_name_order,
    case when sort_by = 'species' then coalesce(d.maori_name, d.common_name, d.scientific_name) end collate public.records_name_order,
    d.season_order,
    case when sort_by in ('season', 'plants', 'species') then d.site_name end collate public.records_name_order,
    case when sort_by in ('season', 'plants', 'species') then d.area_name end collate public.records_name_order,
    case when sort_by = 'site' then coalesce(d.maori_name, d.common_name, d.scientific_name) end collate public.records_name_order,
    case when sort_by = 'season' then coalesce(d.quantity, 0) end desc,
    coalesce(d.legacy_code, 'line-' || d.line_id::text) collate public.records_name_order,
    d.line_id
  limit 50 offset (greatest(1, page_number) - 1)::bigint * 50;
$$;

revoke all on function public.read_records_page(jsonb, boolean, text, integer) from public, anon, authenticated, service_role;
grant execute on function public.read_records_page(jsonb, boolean, text, integer) to authenticated, service_role;

commit;
