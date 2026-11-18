-- Run as postgres after all migrations. Fixtures and their changes are rolled back.
begin;

do $$
declare
  app_id uuid := gen_random_uuid();
  original_id uuid := gen_random_uuid();
  replacement_id uuid := gen_random_uuid();
  existing_id uuid := gen_random_uuid();
  original_email text := app_id::text || '-old@example.org';
  replacement_email text := app_id::text || '-new@example.org';
  existing_email text := app_id::text || '-existing@example.org';
  site_slug text := 'auth-check-' || app_id::text;
begin
  insert into auth.users (id, email, email_confirmed_at)
    values (original_id, original_email, now()), (existing_id, existing_email, now());
  insert into public.users (id, name, email)
    values (app_id, 'Auth regression fixture', original_email);
  if (select auth_user_id from public.users where id = app_id) is distinct from original_id then
    raise exception 'Existing confirmed identity was not linked';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', original_id, 'role', 'authenticated')::text, true);
  if public.current_app_user_id() is distinct from app_id then
    raise exception 'Approved identity did not resolve';
  end if;
  insert into public.sites (slug, name) values (site_slug, 'Auth regression fixture');

  update public.users set email = '  ' || upper(original_email) || '  ' where id = app_id;
  if (select auth_user_id from public.users where id = app_id) is distinct from original_id then
    raise exception 'Formatting-only email change unlinked the identity';
  end if;

  update public.users set email = replacement_email where id = app_id;
  if (select auth_user_id from public.users where id = app_id) is not null then
    raise exception 'Changed email retained the original identity';
  end if;
  if public.current_app_user_id() is not null then
    raise exception 'Original identity kept access after email change';
  end if;

  -- A new address links only after it is confirmed, as in the magic-link flow.
  insert into auth.users (id, email) values (replacement_id, replacement_email);
  if (select auth_user_id from public.users where id = app_id) is not null then
    raise exception 'Unconfirmed replacement identity was linked';
  end if;
  update auth.users set email_confirmed_at = now() where id = replacement_id;
  perform set_config('request.jwt.claims', json_build_object('sub', replacement_id, 'role', 'authenticated')::text, true);
  if public.current_app_user_id() is distinct from app_id then
    raise exception 'Replacement identity did not regain access with the same application ID';
  end if;
  update public.sites set name = 'Updated auth fixture' where slug = site_slug;
  if not exists (select 1 from public.sites where slug = site_slug and created_by = app_id and updated_by = app_id) then
    raise exception 'Audit attribution did not retain the application ID';
  end if;

  update public.users set email = existing_email where id = app_id;
  if (select auth_user_id from public.users where id = app_id) is distinct from existing_id then
    raise exception 'Changed email did not relink an already confirmed identity';
  end if;
  if public.current_app_user_id() is not null then
    raise exception 'Replacement identity kept access after a second email change';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', existing_id, 'role', 'authenticated')::text, true);
  if public.current_app_user_id() is distinct from app_id then
    raise exception 'Existing identity did not receive access';
  end if;
  update public.users set deactivated_at = now() where id = app_id;
  if public.current_app_user_id() is not null then
    raise exception 'Deactivated account retained access';
  end if;
end;
$$;

select 'PASS: normalized email, replacement and existing identities, revoked access, stable audit IDs, deactivation' as result;
rollback;
