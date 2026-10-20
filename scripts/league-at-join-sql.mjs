// Writes supabase/league-at-join.sql (20 Oct 2026, the owner: "doe 1"): your league is set when you join an event (your first action
// that counts), and you finish that event in that league. Levelling up during the event never changes it. A player's report: "I was
// first place in event. then lvled up, changed league and couldnt get my prize." Until now settle set the league from the level when
// the event ended, and progress used the league of the level at each action, so a farmer who finished their league's goal and then
// levelled into the next league was judged on that league's goal and lost the prize.
// - harvest_event_progress stores the league on the row when it first writes it (live_event_players.league, next to world) and uses
//   that league's goals for the row from then on. A farmer who joins below level 100 is stored in a farm league, so the rule that a
//   farmer who reaches 100 mid-event finishes in the Valley Legends (world 1, harvest_event_league_for) is one case of this one.
// - harvest_event_settle no longer overwrites a stored league; it fills only a NULL one, the old way (the level at the end).
// - harvest_event_board is not replaced: it already shows coalesce(league, the level's league).
// A row written before this file ran (an event in flight, or an older one) has no league and keeps today's rules to the end.
// Run: node scripts/league-at-join-sql.mjs. Never edit the file by hand.
// It runs while an event runs, between hh:05 and hh:50 UTC (not in the cron job's hand-out at :55, not when an event starts at :00).
// It refuses when a function is not the one read live (md5 of its body). The after-check rolls everything back when anything did
// not come out as generated. The md5 of a body here is md5(prosrc) in Postgres: the exact text between the $function$ markers.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PROGRESS_BODY as LIVE_PROGRESS,NEW_MD5 as PART_B_MD5} from './world-two-leagues-sql.mjs';
import {SETTLE_BODY as LIVE_SETTLE,NEW_MD5 as COINS_MD5} from './hourly-coins-sql.mjs';

const md5=text=>createHash('md5').update(text).digest('hex');

// The live bodies, read with
//  select p.oid::regprocedure::text, md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
//   where n.nspname='public' and p.proname like 'harvest_event%' order by 1;
// Read live on 20 Oct 2026 at 17:10 UTC, after supabase/hourly-coins.sql ran: settle, schedule and validate as hourly-coins.sql made
// them, progress, board, league and league_for as World 2 leagues Part B made them, pick and pause as hourly-events.sql made them.
// Read them again right before running this file; if one differs, paste it here and regenerate.
export const LIVE_MD5=Object.freeze({
 'harvest_event_board(uuid)':'c509587a78de0cdc576cd6681ba9a29f',
 'harvest_event_claim(uuid,uuid)':'de2cdc930a667bc9c80f3737fca9929c',
 'harvest_event_league(integer)':'ea594ad4aeb110d5858de5cdaf68ddbe',
 'harvest_event_league_for(integer,jsonb,smallint)':'72ba9cc06862bab8a5778cecd96fbaa7',
 'harvest_event_pause(timestamptz)':'ec48c1c17c8751f6ef231c9ac25b9f3e',
 'harvest_event_pick(bigint)':'a4354b4070af10908e1e609720cba26d',
 'harvest_event_progress()':'4681019789851e424d9a12f74f843077',
 'harvest_event_schedule()':'f8478e0aad67d7042618a8ed31dc5f9a',
 'harvest_event_settle(uuid)':'6ea64827b008b9f954039e09af376e30',
 'harvest_event_validate()':'d4df362a2159670d745901819c9d4aa6'
});
// The two bodies changed here are built from the generators that made the live ones.
for(const [name,body,made] of [['harvest_event_progress()',LIVE_PROGRESS,PART_B_MD5],['harvest_event_settle(uuid)',LIVE_SETTLE,COINS_MD5]])
 if(md5(body)!==LIVE_MD5[name]||made[name]!==LIVE_MD5[name])throw Error(`${name}: the body from its generator is not the live one`);

const swap=(text,from,to)=>{if(text.split(from).length!==2)throw Error(`The live body changed: ${from.slice(0,60)}`);return text.replace(from,()=>to);};

// 1. Progress: the league is stored with the row's first write, next to the world, and the row's goals are that league's.
let progress=LIVE_PROGRESS;
progress=swap(progress,`  -- The world the farmer first counts in (20 Oct 2026): 1 below level 100, 2 from 100. Written once, with the first progress.
  if fresh then p.progress:='{}';p.actions:=0;p.joined_at:=now();p.last_at:=now()-interval '1 day';p.baseline:=null;
   p.world:=case when public.harvest_event_league(lv)>=6 then 2 else 1 end;end if;
  -- The farmer's league in this event: within the leagues it was made with, at most the Valley Legends for world 1.
  lg:=public.harvest_event_league_for(lv,e.leagues,p.world);
`,`  -- The world the farmer first counts in (20 Oct 2026): 1 below level 100, 2 from 100. Written once, with the first progress.
  -- The league too (20 Oct 2026, the owner): set when the farmer joins (the first action that counts), within the leagues the event
  -- was made with, and kept to the end, also when they level up. Below level 100 that is a farm league, so world 1 stays true.
  if fresh then p.progress:='{}';p.actions:=0;p.joined_at:=now();p.last_at:=now()-interval '1 day';p.baseline:=null;
   p.world:=case when public.harvest_event_league(lv)>=6 then 2 else 1 end;p.league:=public.harvest_event_league_for(lv,e.leagues,p.world);end if;
  -- The farmer's league in this event: the one stored when they joined. A row from before 20 Oct 2026 has none and keeps the old
  -- rule: the level's, within the leagues the event was made with, at most the Valley Legends for world 1.
  lg:=coalesce(p.league,public.harvest_event_league_for(lv,e.leagues,p.world));
`);
progress=swap(progress,`  -- Start from the stats before this action; a row from before this change keeps the progress it already has. The same for a goal
  -- the baseline lacks (11 Oct 2026: a farmer who levels into the next league mid-event gets that league's goals).
`,`  -- Start from the stats before this action; a row from before this change keeps the progress it already has. The same for a goal
  -- the baseline lacks (11 Oct 2026: a farmer who levels into the next league mid-event gets that league's goals; since 20 Oct 2026
  -- only a row without a stored league, as its league never changes).
`);
progress=swap(progress,`   insert into public.live_event_players(event_id,player_id,progress,actions,joined_at,last_at,baseline,world)
    values(e.id,new.player_id,p.progress,p.actions+(case when p.last_at<=now()-interval '10 seconds' then 1 else 0 end),p.joined_at,now(),p.baseline,p.world)
`,`   -- The league is written with the row and never updated here (on conflict leaves it): a row from before keeps NULL.
   insert into public.live_event_players(event_id,player_id,progress,actions,joined_at,last_at,baseline,world,league)
    values(e.id,new.player_id,p.progress,p.actions+(case when p.last_at<=now()-interval '10 seconds' then 1 else 0 end),p.joined_at,now(),p.baseline,p.world,p.league)
`);
export const PROGRESS_BODY=progress;

// 2. Settle: a stored league stays; only a row without one gets the league of the level at the end, as before.
export const SETTLE_BODY=swap(LIVE_SETTLE,` -- The league of every farmer in the event, by their level now (1 Oct 2026), and then whether they finished their league's goals
 -- (live-event-league-goals.sql; an event without per-league goals uses its own for everyone). Within the leagues the event was made
 -- with, and at most the Valley Legends for a farmer who first counted below level 100 (world 1; 20 Oct 2026).
 update public.live_event_players p set league=public.harvest_event_league_for(s.level,e.leagues,p.world)
  from public.player_stats s where p.event_id=p_event and s.player_id=p.player_id;
`,` -- The league of every farmer in the event, and then whether they finished their league's goals (live-event-league-goals.sql; an
 -- event without per-league goals uses its own for everyone). Since 20 Oct 2026 (the owner) the league is the one stored when the
 -- farmer joined (harvest_event_progress), and it stays. Only a row without one (written before that) gets the league of the level
 -- now (1 Oct 2026), within the leagues the event was made with, and at most the Valley Legends for world 1.
 update public.live_event_players p set league=public.harvest_event_league_for(s.level,e.leagues,p.world)
  from public.player_stats s where p.event_id=p_event and s.player_id=p.player_id and p.league is null;
`);

const PROGRESS_HEAD='public.harvest_event_progress()\n returns trigger language plpgsql set search_path to \'\'';
const SETTLE_HEAD='public.harvest_event_settle(p_event uuid)\n returns void language plpgsql set search_path to \'\'';
const define=(head,body)=>`create or replace function ${head} as $function$${body}$function$;`;
export const NEW_MD5=Object.freeze({'harvest_event_progress()':md5(PROGRESS_BODY),'harvest_event_settle(uuid)':md5(SETTLE_BODY)});
// The guard: each function as read live, or already as this file makes it (a second run).
const guardWant=JSON.stringify(Object.fromEntries(Object.entries(LIVE_MD5).map(([name,live])=>[name,[...new Set([live,...(NEW_MD5[name]?[NEW_MD5[name]]:[])])]])));
const afterWant=JSON.stringify(NEW_MD5);
const keptWant=JSON.stringify(Object.fromEntries(Object.entries(LIVE_MD5).filter(([name])=>!NEW_MD5[name])));

const SQL=`-- Generated by scripts/league-at-join-sql.mjs. Do not edit by hand.
-- Your league is set when you join an event (20 Oct 2026, the owner): the first action that counts stores it on the row, and you
-- finish that event in that league, also when you level up during it. Progress stores it and uses its goals; settle keeps it and
-- fills only a NULL one (a row written before this file) by the level at the end, as before. The board already shows the stored one.
-- Run it after the site and farm-api of this change are live, between hh:05 and hh:50 UTC (an event may run). Save the
-- harvest_event_% definitions first (no PITR). One transaction: any failed check rolls all of it back. Running it twice changes nothing.
begin;
set local lock_timeout='5s';
do $guard$
declare want jsonb:='${guardWant}';
 fname text; have text;
begin
 -- Not in the cron job's hand-out (:55) and not when an event starts (:00).
 if extract(minute from now()) not between 5 and 50 then raise exception 'Run this between hh:05 and hh:50 UTC.'; end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='live_event_players' and column_name='league')
  or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='live_event_players' and column_name='world') then
  raise exception 'live_event_players has no league or world column.'; end if;
 for fname in select jsonb_object_keys(want) loop
  select md5(prosrc) into have from pg_proc where oid=to_regprocedure('public.'||fname);
  if have is null or not (want->fname ? have) then raise exception 'public.% is not the one this file expects (md5 %); read the live definition first', fname, have; end if;
 end loop;
end $guard$;

-- 1. Progress: the league is stored when the farmer joins, and the row's goals are that league's to the end.
${define(PROGRESS_HEAD,PROGRESS_BODY)}

-- 2. Settle: a stored league stays; a row without one gets the league of the level at the end, as before.
${define(SETTLE_HEAD,SETTLE_BODY)}

-- 3. After-check, in the same transaction.
do $after$ declare fname text; want jsonb:='${afterWant}'; kept jsonb:='${keptWant}'; begin
 for fname in select jsonb_object_keys(want) loop
  -- is distinct from: a missing function (NULL) fails too.
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||fname)) is distinct from want->>fname then raise exception 'public.% did not come out as generated',fname; end if;
 end loop;
 for fname in select jsonb_object_keys(kept) loop
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||fname)) is distinct from kept->>fname then raise exception 'public.% changed',fname; end if;
 end loop;
 -- The headers and grants of the two as live: not security definer, volatile, search_path '', only postgres and service_role.
 if exists(select 1 from unnest(array['harvest_event_progress()','harvest_event_settle(uuid)']) as replaced(sig)
    left join pg_proc p on p.oid=to_regprocedure('public.'||replaced.sig)
    where p.oid is null or p.prosecdef or p.provolatile<>'v' or p.proconfig is distinct from array['search_path=""']
     or p.proacl::text is distinct from '{postgres=X/postgres,service_role=X/postgres}')
  then raise exception 'a function header or grant changed'; end if;
 -- Progress still runs as the trigger on player_farms.
 if not exists(select 1 from pg_trigger t where t.tgrelid='public.player_farms'::regclass and not t.tgisinternal and t.tgenabled<>'D'
    and t.tgfoid='public.harvest_event_progress()'::regprocedure) then raise exception 'harvest_event_progress is no longer a trigger on player_farms'; end if;
 -- Last: still before the hand-out by the clock (now() is when the transaction began).
 if extract(minute from clock_timestamp()) not between 5 and 54 then raise exception 'This ran into the hand-out; run it again between hh:05 and hh:50.'; end if;
end $after$;
commit;
`;
export function leagueAtJoinSql(){return SQL;}
if(import.meta.url===`file://${process.argv[1]}`){
 writeFileSync(new URL('../supabase/league-at-join.sql',import.meta.url),SQL);
 console.log('supabase/league-at-join.sql',SQL.length,'characters');
 for(const [name,hash] of Object.entries(NEW_MD5))console.log(name,LIVE_MD5[name],'->',hash);
}
