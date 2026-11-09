-- Species retirement changes future selection, never counted planting history.
begin;

create function public.guard_active_species() returns trigger
language plpgsql set search_path = '' as $$
declare
  species_deactivated_at timestamptz;
begin
  -- Existing lines remain valid, including edits that keep their species.
  if tg_op = 'UPDATE' then
    if new.species is not distinct from old.species then
      return new;
    end if;
  end if;

  -- SHARE conflicts with retirement's row update. If retirement wins the lock,
  -- this read sees the retired state; if the line wins, it precedes retirement.
  select deactivated_at into species_deactivated_at
  from public.species where slug = new.species for share;
  if not found or species_deactivated_at is not null then
    raise exception 'Choose an active species for a new planting line'
      using errcode = '23514';
  end if;
  return new;
end $$;

revoke execute on function public.guard_active_species() from public;
grant execute on function public.guard_active_species() to anon, authenticated;
create trigger guard_active_species before insert or update of species
  on public.planting_lines for each row
  execute function public.guard_active_species();

commit;
