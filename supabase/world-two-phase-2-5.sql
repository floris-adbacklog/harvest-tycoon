-- World II, levels 110-200 (Oct 2026): the leaderboard "Villagers helped" (Village chip, src/leaderboard.js), read from the farm on every
-- save like the other extra boards (harvest_stats_extras): stats.village_requests, the villagers helped at the market square. The seven
-- new village places (the Village Fields, the Miners' Canteen, the Potter's Kiln, the Linen Loft, the Soap Maker, the Pier and the
-- Jeweller) stay out of "Most building upgrades", like the first four (supabase/leaderboard-world-two.sql). The 13 new village goods get
-- no board of their own (noBoard in game/farm-state.js), so goods_made needs no change. Run before the farm-api and site release.
alter table public.player_stats add column if not exists villagers_helped integer not null default 0;
grant select (villagers_helped) on public.player_stats to authenticated;

do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_stats_extras()'::regprocedure);before:=definition;
 definition:=replace(definition,'''smithy'',''villagemill'')','''smithy'',''villagemill'',''villagefields'',''canteen'',''kiln'',''linenloft'',''soapmaker'',''pier'',''jeweller'')');
 if definition=before then raise exception 'harvest_stats_extras: the village place list was not found'; end if;
 before:=definition;
 definition:=replace(definition,' if farm#>>''{login,best}'' ~ whole then new.best_streak:=(farm#>>''{login,best}'')::integer; end if;',' if farm#>>''{login,best}'' ~ whole then new.best_streak:=(farm#>>''{login,best}'')::integer; end if;
 if farm#>>''{stats,village_requests}'' ~ whole then new.villagers_helped:=(farm#>>''{stats,village_requests}'')::integer; end if;');
 if definition=before then raise exception 'harvest_stats_extras: the streak line was not found'; end if;
 execute definition;
end
$migration$;

-- Fill the new column once for every farm (the trigger above sets it on every save from now on); updated_at stays as it was.
alter table public.player_stats disable trigger player_stats_updated_at;
update public.player_stats set villagers_helped=villagers_helped;
alter table public.player_stats enable trigger player_stats_updated_at;
