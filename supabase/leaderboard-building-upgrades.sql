-- Leaderboard "Most building upgrades" (26 Sep 2026): every upgrade counts the same, 1 -> 2 as much as 9 -> 10. The number is read from
-- the farm on every save, like the other extra boards (harvest_stats_extras): the levels of the production buildings added up, each
-- minus its first level. The Farmhouse (its level is the fields) and the Family Hall (no levels) do not count. With level 10 as the
-- top and 17 production buildings, the most is 153.
alter table public.player_stats add column if not exists building_upgrades integer not null default 0;
grant select (building_upgrades) on public.player_stats to authenticated;

do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_stats_extras()'::regprocedure);before:=definition;
 definition:=replace(definition,
  $s$ if farm#>>'{login,best}' ~ whole then new.best_streak:=(farm#>>'{login,best}')::integer; end if;$s$,
  $s$ if farm#>>'{login,best}' ~ whole then new.best_streak:=(farm#>>'{login,best}')::integer; end if;
 if jsonb_typeof(farm->'buildings')='object' then
  select coalesce(sum(greatest(0,(b.value->>'level')::integer-1)),0) into new.building_upgrades
  from jsonb_each(farm->'buildings') b where b.key not in ('farmhouse','familyhall') and b.value->>'level' ~ whole;
 end if;$s$);
 if definition=before then raise exception 'harvest_stats_extras: the best_streak line was not found'; end if;
 execute definition;
end
$migration$;

-- Every farm that exists now, once (the trigger keeps it up to date from here on).
update public.player_stats s set building_upgrades=x.n
from (select f.player_id,coalesce(sum(greatest(0,(b.value->>'level')::integer-1)),0)::integer n
      from public.player_farms f, jsonb_each(f.state->'buildings') b
      where b.key not in ('farmhouse','familyhall') and b.value->>'level' ~ '^[0-9]{1,9}$' group by f.player_id) x
where x.player_id=s.player_id and s.building_upgrades is distinct from x.n;
