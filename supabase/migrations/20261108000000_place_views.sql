-- WRT planting database: what the record sheet's place overview needs.
-- Run once in Supabase > SQL Editor, after naming.sql.
--
-- Both views hold a row per site and a row per area of it: whole-site rows have no
-- area (area, area_name and wrt_number are null), so one read serves a site or a part.
begin;

-- Species at each site and each area, ranked by plants. Rank 1 is the most planted.
create view public.place_species with (security_invoker = true) as
select d.site, d.area, d.wrt_number, d.species, d.register_code, d.scientific_name, d.common_name, d.maori_name,
  coalesce(sum(d.quantity), 0) as plants,
  row_number() over (partition by d.site, d.area order by coalesce(sum(d.quantity), 0) desc, d.species) as rank
from public.line_details d
group by grouping sets (
  (d.site, d.species, d.register_code, d.scientific_name, d.common_name, d.maori_name),
  (d.site, d.area, d.wrt_number, d.species, d.register_code, d.scientific_name, d.common_name, d.maori_name)
);

-- Plants in each season at each site and each area.
create view public.place_seasons with (security_invoker = true) as
select d.site, d.area, d.wrt_number, d.season, d.season_label, d.season_order,
  coalesce(sum(d.quantity), 0) as plants
from public.line_details d
group by grouping sets (
  (d.site, d.season, d.season_label, d.season_order),
  (d.site, d.area, d.wrt_number, d.season, d.season_label, d.season_order)
);

grant select on public.place_species, public.place_seasons to anon, authenticated;

commit;
