-- A minimum level for an open family or one taking requests (1 Oct 2026, farm-state.js familyMinLevel). Empty is no minimum: the
-- level Farm Families open at. harvest_family_commit saves it with the family: the live function (read on 1 Oct 2026) is kept as it
-- is and only gets min_level beside join_mode, so nothing else in it changes.
alter table public.families add column if not exists min_level integer check (min_level is null or min_level between 1 and 999);

do $do$
declare def text;
begin
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='harvest_family_commit';
 if def is null then raise exception 'harvest_family_commit not found'; end if;
 if position('min_level=excluded.min_level' in def)=0 then
  if (length(def)-length(replace(def,'join_mode=excluded.join_mode;','')))/length('join_mode=excluded.join_mode;')<>1 then
   raise exception 'harvest_family_commit changed: save join_mode once, as on 1 Oct 2026';
  end if;
  execute replace(def,'join_mode=excluded.join_mode;','join_mode=excluded.join_mode,min_level=excluded.min_level;');
 end if;
end $do$;
