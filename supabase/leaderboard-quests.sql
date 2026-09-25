-- Leaderboard "Most quests done" (25 Sep 2026): the quests a farmer has claimed. Read from the farm on every save, like the other
-- extra boards (harvest_stats_extras): the distinct quest numbers in state.claimed. The farmer profile shows the same number.
alter table public.player_stats add column if not exists quests_done integer not null default 0;
grant select (quests_done) on public.player_stats to authenticated;

do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_stats_extras()'::regprocedure);before:=definition;
 definition:=replace(definition,
  $s$ if farm#>>'{login,best}' ~ whole then new.best_streak:=(farm#>>'{login,best}')::integer; end if;$s$,
  $s$ if farm#>>'{login,best}' ~ whole then new.best_streak:=(farm#>>'{login,best}')::integer; end if;
 if jsonb_typeof(farm->'claimed')='array' then
  select count(distinct q.value) into new.quests_done from jsonb_array_elements(farm->'claimed') q where q.value#>>'{}' ~ whole;
 end if;$s$);
 if definition=before then raise exception 'harvest_stats_extras: the best_streak line was not found'; end if;
 execute definition;
end
$migration$;

-- Every farm that exists now, once (the trigger keeps it up to date from here on).
update public.player_stats s set quests_done=x.n
from (select f.player_id,count(distinct q.value)::integer n
      from public.player_farms f, jsonb_array_elements(f.state->'claimed') q
      where jsonb_typeof(f.state->'claimed')='array' and q.value#>>'{}' ~ '^[0-9]{1,9}$' group by f.player_id) x
where x.player_id=s.player_id and s.quests_done is distinct from x.n;
