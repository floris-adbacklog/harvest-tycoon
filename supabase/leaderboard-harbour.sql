-- World III's leaderboards (29 Oct 2026, the owner: "Heeft Wereld III wel aparte leaderboard ... zoals village", then "Doe alle 3"):
-- under Harbour (src/leaderboard.js, from level 200) Ships sent, Harbour events and one board per harbour good.
-- 1. player_stats.ships_sent, read from the farm on every save like Villagers helped (harvest_stats_extras): stats.ships_sent.
-- 2. player_stats.harbour_events_finished, recounted with the other event columns when an event is settled (harvest_event_settle):
--    the events finished in a harbour league (12-16, game/farm-state.js EVENT_LEAGUES). They count in events_finished too.
-- 3. The harbour goods need nothing new: goods_made holds every stats.made_* already. The harbour's places stay out of "Most building
--    upgrades", like the village's (supabase/leaderboard-world-two.sql): those boards are the farm's.
-- Both functions are checked against the live ones of 29 Oct 2026 first and changed in place; the rest of each stays as it is.
-- Run before the site release. Safe to run again (it stops at the check once it has run).
alter table public.player_stats add column if not exists ships_sent integer not null default 0;
alter table public.player_stats add column if not exists harbour_events_finished integer not null default 0;
grant select (ships_sent, harbour_events_finished) on public.player_stats to authenticated;
create index if not exists player_stats_ships_sent_ranking on public.player_stats (ships_sent desc, player_id);
create index if not exists player_stats_harbour_events_finished_ranking on public.player_stats (harbour_events_finished desc, player_id);

do $migration$
declare definition text; before text;
begin
 -- 1 and 3: the extras trigger.
 definition:=pg_get_functiondef('public.harvest_stats_extras()'::regprocedure);
 if md5(definition)<>'24a6de2db303384a982420bd16406073' then raise exception 'harvest_stats_extras changed since 29 Oct 2026: check it first'; end if;
 before:=definition;
 definition:=replace(definition,' if farm#>>''{stats,village_requests}'' ~ whole then new.villagers_helped:=(farm#>>''{stats,village_requests}'')::integer; end if;',' if farm#>>''{stats,village_requests}'' ~ whole then new.villagers_helped:=(farm#>>''{stats,village_requests}'')::integer; end if;
 if farm#>>''{stats,ships_sent}'' ~ whole then new.ships_sent:=(farm#>>''{stats,ships_sent}'')::integer; end if;');
 if definition=before then raise exception 'harvest_stats_extras: the villagers line was not found'; end if;
 before:=definition;
 definition:=replace(definition,'''soapmaker'',''pier'',''jeweller'')','''soapmaker'',''pier'',''jeweller'',''ropewalk'',''cooperage'',''galley'',''harbourforge'',''chandlery'',''paintshop'',''instruments'',''cannery'',''tradinghouse'',''boatyard'')');
 if definition=before then raise exception 'harvest_stats_extras: the village place list was not found'; end if;
 execute definition;

 -- 2: the settle's recount.
 definition:=pg_get_functiondef('public.harvest_event_settle(uuid)'::regprocedure);
 if md5(definition)<>'87fd41b8abcdb841be58fac7861aff63' then raise exception 'harvest_event_settle changed since 29 Oct 2026: check it first'; end if;
 before:=definition;
 definition:=replace(definition,' -- A harbour league''s (29 Oct 2026) counts in events_finished only.',' -- A harbour league''s (29 Oct 2026) counts in harbour_events_finished too (the Harbour events board, 29 Oct 2026).');
 definition:=replace(definition,'  village_events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified and lp.league between 6 and 11)
','  village_events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified and lp.league between 6 and 11),
  harbour_events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified and lp.league between 12 and 16)
');
 if definition=before or position('harbour_events_finished=' in definition)=0 then raise exception 'harvest_event_settle: the village recount was not found'; end if;
 execute definition;
end
$migration$;

-- Fill the two columns once for every farm (the trigger sets ships_sent on every save from now on); updated_at stays as it was.
alter table public.player_stats disable trigger player_stats_updated_at;
update public.player_stats set ships_sent=ships_sent;
update public.player_stats s set harbour_events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified and lp.league between 12 and 16)
 where exists(select 1 from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified and lp.league between 12 and 16);
alter table public.player_stats enable trigger player_stats_updated_at;

-- After-check: both functions carry the new lines, and the settle keeps its header and grants.
do $after$
begin
 if position('new.ships_sent:=' in pg_get_functiondef('public.harvest_stats_extras()'::regprocedure))=0 then raise exception 'harvest_stats_extras did not change'; end if;
 if position('harbour_events_finished=(select count(*)' in pg_get_functiondef('public.harvest_event_settle(uuid)'::regprocedure))=0 then raise exception 'harvest_event_settle did not change'; end if;
 if (select proacl::text from pg_proc where oid='public.harvest_event_settle(uuid)'::regprocedure) is distinct from '{postgres=X/postgres,service_role=X/postgres}' then raise exception 'harvest_event_settle grants changed'; end if;
end
$after$;
