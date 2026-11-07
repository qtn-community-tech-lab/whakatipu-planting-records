-- WRT planting database: each line keeps where it came from in the workbook.
-- Run once in Supabase > SQL Editor, after seasons_page.sql, then re-run the import
-- (npx tsx scripts/import-workbook.ts --write) to fill the new columns.
begin;

alter table public.planting_lines
  add column precision        text check (precision in ('site', 'subsite', 'area', 'scheme', 'unknown')),
  add column confidence       text check (confidence in ('high', 'medium', 'low')),
  add column source_file      text,   -- workbook path
  add column source_sheet     text,   -- MASTER
  add column season_original  text,   -- the season as typed
  add column site_original    text,   -- the column header as typed
  add column species_original text;   -- the species as typed

-- line_details gains those columns, the species' register code (for its photo),
-- its Te Kākano threatened mark and the line's open notes. New columns go on the end, so existing reads are unchanged.
create or replace view public.line_details with (security_invoker = true) as
select
  l.id            as line_id,
  p.id            as planting_id,
  l.legacy_code,
  p.source,
  se.slug         as season,
  se.label        as season_label,
  se.id           as season_order,
  se.year,
  p.planted_on,
  si.slug         as site,
  si.name         as site_name,
  si.is_scheme,
  a.slug          as area,
  a.name          as area_name,
  a.wrt_number,
  a.class,
  sp.slug         as species,
  sp.scientific_name,
  sp.common_name,
  sp.maori_name,
  sp.threatened,
  sp.contested_group,
  l.quantity,
  exists (
    select 1 from public.notes n
    where n.line = l.id
      and n.kind in ('ruling', 'confirm')
      and n.resolved_at is null
      and n.retired_at is null
  ) as needs_review,
  l.source_cell,
  l.precision,
  l.confidence,
  l.source_file,
  l.source_sheet,
  l.season_original,
  l.site_original,
  l.species_original,
  sp.register_code,
  coalesce((
    select jsonb_agg(jsonb_build_object('question', n.question, 'kind', n.kind, 'text', n.text) order by n.id)
    from public.notes n
    where n.line = l.id and n.resolved_at is null and n.retired_at is null
  ), '[]'::jsonb) as notes,
  sp.threatened_te_kakano
from public.planting_lines l
join public.plantings p on p.id   = l.planting
join public.seasons  se on se.id  = p.season
join public.areas     a on a.slug = p.area
join public.sites    si on si.slug = a.site
join public.species  sp on sp.slug = l.species
where l.retired_at is null and p.retired_at is null;

commit;
