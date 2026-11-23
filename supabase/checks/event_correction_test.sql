-- Run as postgres after all migrations. Fixtures, injected failures and edits roll back.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception '%', message; end if;
end $$;

-- Fail after the event and retained lines have already been updated.
create function pg_temp.reject_test_quantity() returns trigger language plpgsql as $$ begin
  if new.quantity = 99999 then raise exception 'Injected line failure'; end if;
  return new;
end $$;
create trigger correction_test_failure before insert on public.planting_lines
  for each row execute function pg_temp.reject_test_quantity();

do $$
declare
  auth_id uuid := gen_random_uuid();
  app_id uuid := gen_random_uuid();
  event_id bigint;
  kept_id bigint;
  removed_id bigint;
  other_event bigint;
  other_line bigint;
  before_event jsonb;
  before_lines jsonb;
  edits jsonb;
begin
  insert into auth.users (id, email, email_confirmed_at) values (auth_id, auth_id || '@example.org', now());
  insert into public.users (id, name, email) values (app_id, 'Correction fixture', auth_id || '@example.org');
  insert into public.sites (slug, name) values ('edit-story-old', 'Old site'), ('edit-story-new', 'New site');
  insert into public.areas (slug, site, name) values
    ('edit-story-old-area', 'edit-story-old', 'Old area'), ('edit-story-new-area', 'edit-story-new', 'New area');
  insert into public.species (slug, scientific_name) values
    ('edit-story-kept', 'Kept species'), ('edit-story-removed', 'Removed species'), ('edit-story-added', 'Added species');
  insert into public.planting_events (area, season, source, notes)
    values ('edit-story-old-area', 0, 'workbook', 'Original') returning id into event_id;
  insert into public.planting_events (area, season, planted_on)
    values ('edit-story-old-area', 0, '2015-04-01') returning id into other_event;
  insert into public.planting_lines (planting_event, species, quantity, legacy_code)
    values (event_id, 'edit-story-kept', 10, 'EDIT-STORY-KEPT') returning id into kept_id;
  insert into public.planting_lines (planting_event, species, quantity)
    values (event_id, 'edit-story-removed', 20) returning id into removed_id;
  insert into public.planting_lines (planting_event, species, quantity)
    values (other_event, 'edit-story-kept', 2) returning id into other_line;
  insert into public.questions (slug, question) values ('edit-story-review', 'Retain the review');
  insert into public.notes (line, question, kind, text) values (kept_id, 'edit-story-review', 'confirm', 'Original review');
  update public.species set deactivated_at = now() where slug = 'edit-story-kept';

  select to_jsonb(e) into before_event from public.planting_events e where e.id = event_id;
  select jsonb_agg(to_jsonb(l) order by l.id) into before_lines from public.planting_lines l where l.planting_event = event_id;
  edits := jsonb_build_array(jsonb_build_object('id', kept_id, 'species', 'edit-story-kept', 'quantity', 15),
    jsonb_build_object('id', null, 'species', 'edit-story-added', 'quantity', 99999));

  perform set_config('request.jwt.claims', json_build_object('sub', auth_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.update_planting_event(event_id, 'edit-story-new', null, null, null, 'Changed', edits);
    raise exception 'Failure injection did not execute';
  exception when raise_exception then
    if sqlerrm <> 'Injected line failure' then raise; end if;
  end;
  perform pg_temp.assert_true((select to_jsonb(e) = before_event from public.planting_events e where e.id = event_id), 'Failure must preserve the complete event, including audit fields');
  perform pg_temp.assert_true((select jsonb_agg(to_jsonb(l) order by l.id) = before_lines from public.planting_lines l where l.planting_event = event_id), 'Failure must preserve every line, quantity and audit field');
  perform pg_temp.assert_true(not exists (select 1 from public.areas where slug = 'edit-story-new-whole-site'), 'Failure must also roll back a new whole-site area');

  begin
    perform public.update_planting_event(event_id, 'edit-story-new', 'edit-story-old-area', null, null, 'Wrong area', edits);
    raise exception 'Cross-site area was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.update_planting_event(event_id, 'edit-story-old', 'edit-story-old-area', null, null, '',
      jsonb_build_array(jsonb_build_object('id', other_line, 'species', 'edit-story-kept', 'quantity', 12)));
    raise exception 'Another event line was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.update_planting_event(event_id, 'edit-story-old', 'edit-story-old-area', null, null, '',
      jsonb_build_array(jsonb_build_object('id', kept_id, 'species', 'edit-story-kept', 'quantity', 0)));
    raise exception 'Zero quantity was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.update_planting_event(event_id, 'edit-story-old', 'edit-story-old-area', null, null, '',
      jsonb_build_array(jsonb_build_object('id', kept_id, 'species', 'edit-story-kept', 'quantity', 1),
        jsonb_build_object('id', null, 'species', 'edit-story-kept', 'quantity', 2)));
    raise exception 'Duplicate species was accepted';
  exception when invalid_parameter_value then null; end;

  edits := jsonb_set(edits, '{1,quantity}', '7');
  perform public.update_planting_event(event_id, 'edit-story-new', 'edit-story-new-area', null, null, 'Corrected', edits);
  perform pg_temp.assert_true((select source = 'workbook' and planted_on is null and type is null and notes = 'Corrected'
    and area = 'edit-story-new-area' and updated_by = app_id
    from public.planting_events where id = event_id), 'Correction must persist without inventing historical date/type, keeping source and staff audit');
  perform pg_temp.assert_true((select quantity = 15 and legacy_code = 'EDIT-STORY-KEPT' from public.planting_lines where id = kept_id), 'Retained deactivated species must keep its identity and provenance');
  perform pg_temp.assert_true(exists (select 1 from public.notes where line = kept_id and text = 'Original review'), 'Retained review notes must survive');
  perform pg_temp.assert_true((select deactivated_at is not null from public.planting_lines where id = removed_id), 'Removed lines must be deactivated');
  perform pg_temp.assert_true((select count(*) = 2 from public.planting_lines where planting_event = event_id and deactivated_at is null), 'The event must have exactly the replacement species list');
  perform pg_temp.assert_true((select plants = 22 from public.totals_by_site where site = 'edit-story-new'), 'Destination site actuals must include corrected quantities');
  perform pg_temp.assert_true((select plants = 2 from public.totals_by_site where site = 'edit-story-old'), 'Original site actuals must exclude the moved event');
  perform pg_temp.assert_true((select plants = 22 from public.totals_by_area where area = 'edit-story-new-area'), 'Area actuals must update');
  perform pg_temp.assert_true((select plants = 17 from public.totals_by_species where species = 'edit-story-kept'), 'Deactivated species totals must retain corrected history');
  perform pg_temp.assert_true((select sum(quantity) = 22 from public.line_details where planting_id = event_id), 'Public history must reflect corrected actuals');
  perform pg_temp.assert_true((select count(*) = 2 from public.planting_events where area in ('edit-story-old-area', 'edit-story-new-area')), 'Correction must not create another event');

  -- Retry/reopen: the new list supplies the persisted IDs, with no duplicate insert.
  select jsonb_agg(jsonb_build_object('id', l.id, 'species', l.species, 'quantity', l.quantity)) into edits
    from public.planting_lines l where l.planting_event = event_id and l.deactivated_at is null;
  perform public.update_planting_event(event_id, 'edit-story-new', null, '2015-04-20', 'infill', 'Reopened', edits);
  perform pg_temp.assert_true((select area = 'edit-story-new-whole-site' and planted_on = '2015-04-20' and type = 'infill' and notes = 'Reopened'
    from public.planting_events where id = event_id), 'A subsequent correction must support a whole site, known date/type and a replacement note');
  perform pg_temp.assert_true((select plants = 22 from public.totals_by_site where site = 'edit-story-new'), 'A second correction must replace rather than duplicate totals');

  reset role;
  update public.users set deactivated_at = now() where id = app_id;
  set local role authenticated;
  begin
    perform public.update_planting_event(event_id, 'edit-story-new', null, null, null, 'Denied', edits);
    raise exception 'Deactivated staff kept edit access';
  exception when insufficient_privilege then null; end;
  reset role;
  set local role anon;
  begin
    perform public.update_planting_event(event_id, 'edit-story-new', null, null, null, 'Denied', edits);
    raise exception 'Anonymous edit was accepted';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

select 'PASS: atomic rollback, locations, validation, preserved history, actual totals, reopen and access' as result;
rollback;
