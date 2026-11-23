-- Run as postgres after all migrations. All fixtures and edits roll back.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;

do $$
declare
  creator_auth uuid := gen_random_uuid();
  creator uuid := gen_random_uuid();
  editor_auth uuid := gen_random_uuid();
  editor uuid := gen_random_uuid();
  managed_user uuid;
  event_id bigint;
  line_id bigint;
  note_id bigint;
  fixture record;
  audited boolean;
  created_on timestamptz := now() - interval '1 hour';
begin
  insert into auth.users (id, email, email_confirmed_at) values
    (creator_auth, creator_auth || '@example.org', now()),
    (editor_auth, editor_auth || '@example.org', now());
  insert into public.users (id, name, email) values
    (creator, 'Audit creator', creator_auth || '@example.org'),
    (editor, 'Audit editor', editor_auth || '@example.org');

  perform set_config('request.jwt.claims', json_build_object('sub', creator_auth, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.users (name, email, created_at, created_by, updated_at, updated_by)
    values ('Audit managed user', creator || '-managed@example.org', created_on, creator, created_on, creator)
    returning id into managed_user;
  perform pg_temp.assert_true((select created_at = created_on and updated_at = created_on
    from public.users where id = managed_user), 'User creation must accept the explicitly supplied audit timestamp');
  insert into public.sites (slug, name, created_by, updated_by)
    values ('audit-site', 'Audit site', editor, editor);
  insert into public.areas (slug, site, name) values ('audit-area', 'audit-site', 'Audit area');
  insert into public.species (slug, scientific_name) values ('audit-species', 'Audit species');
  insert into public.questions (slug, question) values ('audit-question', 'Audit question');
  insert into public.planting_events (area, season, planted_on)
    values ('audit-area', 0, '2015-04-01') returning id into event_id;
  insert into public.planting_lines (planting_event, species, quantity)
    values (event_id, 'audit-species', 12) returning id into line_id;
  insert into public.notes (line, question, kind)
    values (line_id, 'audit-question', 'fyi') returning id into note_id;

  for fixture in select * from (values
    ('users', 'id', managed_user::text),
    ('sites', 'slug', 'audit-site'),
    ('areas', 'slug', 'audit-area'),
    ('species', 'slug', 'audit-species'),
    ('planting_events', 'id', event_id::text),
    ('planting_lines', 'id', line_id::text),
    ('questions', 'slug', 'audit-question'),
    ('notes', 'id', note_id::text)
  ) as fixtures(table_name, key_name, key_value) loop
    execute format('select created_by = $1 and updated_by = $1 and deactivated_by is null
      from public.%I where %I::text = $2', fixture.table_name, fixture.key_name)
      into audited using creator, fixture.key_value;
    perform pg_temp.assert_true(audited, fixture.table_name || ': insert must record the app creator');

    perform set_config('request.jwt.claims', json_build_object('sub', editor_auth, 'role', 'authenticated')::text, true);
    execute format('update public.%I set updated_at = now(), updated_by = $1 where %I::text = $2', fixture.table_name, fixture.key_name)
      using editor, fixture.key_value;
    execute format('select created_by = $1 and updated_by = $2 from public.%I where %I::text = $3',
      fixture.table_name, fixture.key_name) into audited using creator, editor, fixture.key_value;
    perform pg_temp.assert_true(audited, fixture.table_name || ': edit must preserve the creator and use the current editor');

    execute format('update public.%I set deactivated_at = now(), deactivated_by = $1, updated_at = now(), updated_by = $1
      where %I::text = $2', fixture.table_name, fixture.key_name) using editor, fixture.key_value;
    execute format('select created_by = $1 and updated_by = $2 and deactivated_by = $2
      and deactivated_at = updated_at from public.%I where %I::text = $3', fixture.table_name, fixture.key_name)
      into audited using creator, editor, fixture.key_value;
    perform pg_temp.assert_true(audited, fixture.table_name || ': deactivation must record the current editor and deactivator');

    perform set_config('request.jwt.claims', json_build_object('sub', creator_auth, 'role', 'authenticated')::text, true);
    execute format('update public.%I set updated_at = now(), updated_by = $1 where %I::text = $2',
      fixture.table_name, fixture.key_name) using creator, fixture.key_value;
    execute format('select created_by = $1 and updated_by = $1 and deactivated_by = $2
      from public.%I where %I::text = $3', fixture.table_name, fixture.key_name)
      into audited using creator, editor, fixture.key_value;
    perform pg_temp.assert_true(audited, fixture.table_name || ': a later edit must preserve the original deactivator');
  end loop;

  update public.users set deactivated_at = null, deactivated_by = null, updated_at = now(), updated_by = creator where id = managed_user;
  perform pg_temp.assert_true((select deactivated_by is null and created_by = creator and updated_by = creator
    and created_at = created_on and updated_at = now()
    from public.users where id = managed_user), 'Reactivation must clear the deactivator and record the current editor');
  perform pg_temp.assert_true((select quantity = 12 from public.planting_lines where id = line_id),
    'Audit writes must preserve historical quantities');
  reset role;
end $$;

select 'PASS: explicit audit timestamps, creator, editor, deactivator, reactivation and preserved history' as result;
rollback;
