CREATE VIEW "public"."area_list" WITH (security_invoker = true) AS (
  select a.slug as area, a.name as area_name, a.wrt_number, a.site_class,
    si.slug as site, si.name as site_name, si.is_scheme,
    pin.latitude, pin.longitude, pin.radius_m
  from public.site_areas a
  join public.sites si on si.id = a.site_id
  left join public.site_locations pin on pin.site_area_id = a.id and pin.deactivated_at is null
  where a.deactivated_at is null and si.deactivated_at is null);