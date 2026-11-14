-- Active approved users can manage the private user allowlist.
begin;

grant insert (name, email) on public.users to authenticated;
grant update (name, email, deactivated_at) on public.users to authenticated;

drop policy if exists "read self" on public.users;
create policy "active users read all users" on public.users for select to authenticated
  using ((select public.current_app_user_id()) is not null);

create policy "active users add users" on public.users for insert to authenticated
  with check ((select public.current_app_user_id()) is not null);

create policy "active users edit users" on public.users for update to authenticated
  using ((select public.current_app_user_id()) is not null)
  with check ((select public.current_app_user_id()) is not null);

create trigger guard_deactivated before update on public.users
  for each row execute function public.guard_deactivated();

commit;
