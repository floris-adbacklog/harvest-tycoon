-- Changing family (2 Oct 2026): leaving or being removed no longer keeps a farmer out of every family for 48 hours. They can join
-- another family at once; only the family that removed them stays closed to them for 48 hours (game/farm-state.js familyMutate:
-- blocked_family and cooldown_until on their member row).
alter table public.family_members add column if not exists blocked_family uuid;

-- harvest_family_commit writes a member that already has a row with a fixed list of columns: blocked_family joins that list. The
-- live function is changed in place (only this list), so nothing else in it can go back to an older copy; it stops if the list is
-- not as expected.
do $patch$
declare d text;
begin
 select pg_get_functiondef(p.oid) into strict d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='harvest_family_commit';
 if position('blocked_family=excluded.blocked_family' in d)>0 then return; end if;
 if (length(d)-length(replace(d,'cooldown_until=excluded.cooldown_until;','')))/length('cooldown_until=excluded.cooldown_until;')<>1 then
  raise exception 'harvest_family_commit is not as expected: add blocked_family to its family_members update by hand';
 end if;
 execute replace(d,'cooldown_until=excluded.cooldown_until;','cooldown_until=excluded.cooldown_until,blocked_family=excluded.blocked_family;');
end $patch$;

-- Farmers waiting under the old rule can join again now (which family removed them was not kept).
update public.family_members set cooldown_until=null where cooldown_until is not null and blocked_family is null;
