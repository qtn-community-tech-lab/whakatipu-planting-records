-- Named-area geometry belongs to the area, independently of planting records.
begin;

alter table public.areas
  add column boundary jsonb,
  add constraint areas_boundary_polygon check (
    boundary is null or (boundary @> '{"type":"Polygon"}' and jsonb_typeof(boundary -> 'coordinates') = 'array') is true
  );

commit;
