-- User management permits active approved users to restore allowlist access.
-- The existing UPDATE policy continues to enforce that permission.
begin;

drop trigger if exists guard_deactivated on public.users;

commit;
