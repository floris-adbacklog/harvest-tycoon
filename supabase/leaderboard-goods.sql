-- Leaderboard: one board per good, like the crops (25 Sep 2026). player_stats.goods_made holds how many of each good a farmer has
-- collected ({"bread":74,…}: the farm's own made_* statistics, the numbers the farm journal shows), kept up to date on every save by
-- the extras trigger. src/leaderboard.js orders a good's board by goods_made->good. The rest of the trigger is the live function.
alter table public.player_stats add column if not exists goods_made jsonb not null default '{}'::jsonb;

do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_stats_extras()'::regprocedure);
 before:=definition;
 definition:=replace(definition,
  ' if farm#>>''{login,best}'' ~ whole then new.best_streak:=(farm#>>''{login,best}'')::integer; end if;',
  ' if farm#>>''{login,best}'' ~ whole then new.best_streak:=(farm#>>''{login,best}'')::integer; end if;
 if jsonb_typeof(farm->''stats'')=''object'' then
  select coalesce(jsonb_object_agg(substr(s.key,6),(s.value#>>''{}'')::integer),''{}''::jsonb) into new.goods_made
  from jsonb_each(farm->''stats'') s where s.key like ''made\_%'' and s.value#>>''{}'' ~ whole;
 end if;');
 if definition=before then raise exception 'harvest_stats_extras: the streak line was not found'; end if;
 execute definition;
end
$migration$;

-- Filled once for every farmer (the trigger works it out from the farm), without changing when their stats were last updated.
alter table public.player_stats disable trigger player_stats_updated_at;
update public.player_stats set goods_made=goods_made;
alter table public.player_stats enable trigger player_stats_updated_at;
