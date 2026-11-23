-- Run as postgres after all migrations. All fixtures and changes roll back.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;

do $$
declare
  auth_id uuid := gen_random_uuid();
  app_id uuid := gen_random_uuid();
  incorrect_id bigint;
  correct_id bigint;
  line_id bigint;
  original_event jsonb;
  original_lines jsonb;
  original_notes jsonb;
  season_before bigint;
  records_before bigint;
begin
  insert into auth.users (id, email, email_confirmed_at) values (auth_id, auth_id || '@example.org', now());
  insert into public.users (id, name, email) values (app_id, 'Event deactivation fixture', auth_id || '@example.org');
  insert into public.sites (slug, name) values ('deactivate-event-site', 'Deactivation fixture');
  insert into public.areas (slug, site, name) values ('deactivate-event-area', 'deactivate-event-site', 'Fixture riverbank');
  insert into public.species (slug, scientific_name) values ('deactivate-event-kept', 'Retained species'), ('deactivate-event-only', 'Event-only species');
  insert into public.planting_events (area, season, source, notes)
    values ('deactivate-event-area', 0, 'workbook', 'Original event note') returning id into incorrect_id;
  insert into public.planting_events (area, season, planted_on)
    values ('deactivate-event-area', 0, '2015-04-01') returning id into correct_id;
  insert into public.planting_lines (planting_event, species, quantity, legacy_code)
    values (incorrect_id, 'deactivate-event-kept', 15, 'DEACTIVATE-EVENT-KEPT') returning id into line_id;
  insert into public.planting_lines (planting_event, species, quantity) values
    (incorrect_id, 'deactivate-event-only', 25), (correct_id, 'deactivate-event-kept', 5);
  insert into public.questions (slug, question) values ('deactivate-event-review', 'Retain the original review');
  insert into public.notes (line, question, kind, text) values (line_id, 'deactivate-event-review', 'confirm', 'Original review');

  select to_jsonb(e) - array['deactivated_at', 'deactivated_by', 'updated_at', 'updated_by'] into original_event from public.planting_events e where id = incorrect_id;
  select jsonb_agg(to_jsonb(l) order by l.id) into original_lines from public.planting_lines l where l.planting_event = incorrect_id;
  select jsonb_agg(to_jsonb(n) order by n.id) into original_notes from public.notes n where n.line = line_id;
  select plants into season_before from public.totals_by_season where season = 'autumn-2015';
  select (public.read_layout_summary()->>'records')::bigint into records_before;

  -- Reference deactivation alone must never erase counted historical planting.
  update public.sites set deactivated_at = now() where slug = 'deactivate-event-site';
  update public.species set deactivated_at = now() where slug = 'deactivate-event-kept';
  perform pg_temp.assert_true((select plants = 45 from public.totals_by_site where site = 'deactivate-event-site'), 'Deactivating a site must preserve historical quantities');
  perform pg_temp.assert_true((select plants = 20 from public.totals_by_species where species = 'deactivate-event-kept'), 'Deactivating a species must preserve historical quantities');
  perform pg_temp.assert_true((select count(distinct planting_id) = 2 from public.line_details where site = 'deactivate-event-site'), 'Reference deactivation must preserve event counts');

  perform set_config('request.jwt.claims', json_build_object('sub', auth_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.planting_events set deactivated_at = now(), deactivated_by = app_id,
    updated_at = now(), updated_by = app_id where id = incorrect_id;

  perform pg_temp.assert_true((select deactivated_at is not null and deactivated_by = app_id and updated_by = app_id from public.planting_events where id = incorrect_id), 'Deactivation, deactivator and staff audit must persist');
  perform pg_temp.assert_true((select to_jsonb(e) - array['deactivated_at', 'deactivated_by', 'updated_at', 'updated_by'] = original_event from public.planting_events e where id = incorrect_id), 'Original event details, date/type, provenance and creation audit must survive');
  perform pg_temp.assert_true((select jsonb_agg(to_jsonb(l) order by l.id) = original_lines from public.planting_lines l where l.planting_event = incorrect_id), 'Every line, identity, quantity and audit field must remain unchanged');
  perform pg_temp.assert_true((select jsonb_agg(to_jsonb(n) order by n.id) = original_notes from public.notes n where n.line = line_id), 'Review notes must remain unchanged');
  perform pg_temp.assert_true(not exists (select 1 from public.line_details where planting_id = incorrect_id), 'Normal planting history must exclude the whole event');
  perform pg_temp.assert_true((select count(distinct planting_id) = 1 from public.line_details where site = 'deactivate-event-site'), 'Actual event count must exclude the event once');
  perform pg_temp.assert_true((select plants = 5 from public.totals_by_site where site = 'deactivate-event-site'), 'Site actuals must exclude 40 plants');
  perform pg_temp.assert_true((select plants = 5 from public.totals_by_area where area = 'deactivate-event-area'), 'Area actuals must exclude 40 plants');
  perform pg_temp.assert_true((select plants = 5 from public.totals_by_species where species = 'deactivate-event-kept'), 'Deactivated species must retain only other events quantities');
  perform pg_temp.assert_true(not exists (select 1 from public.totals_by_species where species = 'deactivate-event-only'), 'Species planted only in this event must have no actuals');
  perform pg_temp.assert_true((select plants = season_before - 40 from public.totals_by_season where season = 'autumn-2015'), 'Season actuals must exclude the event');
  perform pg_temp.assert_true((public.read_layout_summary()->>'records')::bigint = records_before - 2, 'Navigation and search history must exclude both lines');

  -- The same write again changes no counted quantities; no decrement operation is used.
  update public.planting_events set deactivated_at = now(), deactivated_by = app_id,
    updated_at = now(), updated_by = app_id where id = incorrect_id;
  perform pg_temp.assert_true((select plants = 5 from public.totals_by_site where site = 'deactivate-event-site'), 'Repeating deactivation must not subtract twice');
  perform pg_temp.assert_true((select plants = season_before - 40 from public.totals_by_season where season = 'autumn-2015'), 'Repeated deactivation must preserve season totals');
  perform pg_temp.assert_true((select jsonb_agg(to_jsonb(l) order by l.id) = original_lines from public.planting_lines l where l.planting_event = incorrect_id), 'Repeated deactivation must preserve stored lines');

  reset role;
  update public.users set deactivated_at = now() where id = app_id;
  set local role authenticated;
  begin
    update public.planting_events set deactivated_at = now() where id = correct_id;
    if found then raise exception 'Deactivated staff kept write access'; end if;
  exception when insufficient_privilege then null; end;
  reset role;
  set local role anon;
  begin
    update public.planting_events set deactivated_at = now() where id = correct_id;
    if found then raise exception 'Public visitor gained write access'; end if;
  exception when insufficient_privilege then null; end;
  perform pg_temp.assert_true((select deactivated_at is not null from public.planting_events where id = incorrect_id), 'A new public read must resolve the persisted deactivated record');
  perform pg_temp.assert_true((select sum(quantity) = 40 from public.planting_lines where planting_event = incorrect_id), 'Stored quantities must remain traceable after reopening');
  perform pg_temp.assert_true((select plants = 5 from public.totals_by_site where site = 'deactivate-event-site'), 'Reopened actuals must remain consistent');
  reset role;
end $$;

select 'PASS: event deactivation, retained quantities, actual totals, repeat, reopen and permissions' as result;
rollback;
