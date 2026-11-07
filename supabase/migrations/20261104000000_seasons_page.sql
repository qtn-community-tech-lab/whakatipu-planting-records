-- WRT planting database: what the seasons page needs.
-- Run once in Supabase > SQL Editor, after public_reads.sql.
begin;

-- Season totals gain the season's year and half, its workbook cell, and how many
-- lines need review. New columns go on the end, so existing reads are unchanged.
create or replace view public.totals_by_season with (security_invoker = true) as
select se.id as season_order, se.slug as season, se.label as season_label,
  se.workbook_total,
  sum(d.quantity)                                   as plants,
  sum(d.quantity) filter (where not d.needs_review) as plants_confirmed,
  sum(d.quantity) filter (where d.needs_review)     as plants_needs_review,
  count(d.line_id)                                  as lines,
  count(distinct d.site)                            as sites,
  count(distinct d.species)                         as species,
  se.year,
  se.half,
  se.workbook_cell,
  count(d.line_id) filter (where d.needs_review)    as lines_needs_review
from public.seasons se
left join public.line_details d on d.season = se.slug
group by se.id, se.slug, se.label, se.workbook_total, se.year, se.half, se.workbook_cell;

-- Species in each season, ranked by plants. Rank 1 is the most planted.
create view public.season_species with (security_invoker = true) as
select d.season, d.species, sp.register_code, d.scientific_name, d.common_name, d.maori_name,
  coalesce(sum(d.quantity), 0) as plants,
  row_number() over (partition by d.season order by coalesce(sum(d.quantity), 0) desc, d.species) as rank
from public.line_details d
join public.species sp on sp.slug = d.species
group by d.season, d.species, sp.register_code, d.scientific_name, d.common_name, d.maori_name;

-- Sites in each season, ranked by plants. Rank 1 is the most planted.
create view public.season_sites with (security_invoker = true) as
select d.season, d.site, d.site_name,
  coalesce(sum(d.quantity), 0) as plants,
  row_number() over (partition by d.season order by coalesce(sum(d.quantity), 0) desc, d.site) as rank
from public.line_details d
group by d.season, d.site, d.site_name;

-- Plants still waiting on each question. A line can sit under two questions.
create view public.totals_by_question with (security_invoker = true) as
select n.question, count(distinct d.line_id) as lines, coalesce(sum(d.quantity), 0) as plants
from public.notes n
join public.line_details d on d.line_id = n.line
where n.kind in ('ruling', 'confirm') and n.resolved_at is null and n.retired_at is null
group by n.question;

grant select on public.season_species, public.season_sites, public.totals_by_question to anon, authenticated;

commit;
