-- The server-only magic-link precheck reads the approved staff list with a secret key.
begin;

grant select (id, email, deactivated_at) on public.users to service_role;

commit;
