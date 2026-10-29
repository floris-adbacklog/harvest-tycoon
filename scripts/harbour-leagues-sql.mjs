// Writes supabase/harbour-leagues.sql (29 Oct 2026, the owner: "sql is akkoord", "nu maken"): the harbour's five event leagues in
// the live events. From level 221 a farmer's event league is one of the harbour's (game/farm-state.js EVENT_LEAGUES 12..16: the Quay
// League to the Harbour Legends), with goals in the harbour (public/event-goals.js HARBOUR_KINDS) and coins ×22 to ×30. Diamonds stay
// the same in every league. A finished harbour event counts in events_finished only, not in village_events_finished.
// What changes, each from the body read live on 29 Oct 2026 (md5(prosrc), the text between the $function$ markers):
// - the league check on live_event_players (0..16) and its world check (1, 2 or 3);
// - harvest_event_league: 221+ the harbour's leagues;
// - harvest_event_league_for: a farmer who joined in the harbour (world 3) can be in its leagues; worlds 1 and 2 and a row without
//   one (NULL, from before 20 Oct 2026) as before;
// - harvest_event_pick: the hour pools of all 17 leagues (the first 12 exactly as they run);
// - harvest_event_progress: world 3 when the farmer joins in a harbour league, and the harbour's goals count for their own actions
//   (ship loads, harbour batches, harbour sales, harbour upgrades, seal pats; the made_* goods already count on collect);
// - harvest_event_settle: the coins ×22..×30 for the harbour's leagues, and village_events_finished only for the village's (6..11).
// Not touched: harvest_event_schedule, _validate (it checks the event's own goals, the Sprout League's), _board and _claim.
// An event made before this file ran has 12 leagues, so a farmer of 221+ races it in the Village Legends, as today.
// Run: node scripts/harbour-leagues-sql.mjs. Never edit the SQL file by hand. Any time: a running event keeps its leagues and goals.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EVENT_LEAGUES} from '../game/farm-state.js';
import {EVENT_HOUR_POOLS} from '../public/event-goals.js';
import {HOUR_PICK_BODY_ONE_CROP,HOUR_PICK_BODY_HARBOUR} from './event-goals-sql.mjs';
import {PROGRESS_BODY as LIVE_PROGRESS,NEW_MD5 as FERTILIZE_MD5} from './tractor-fertilize-events-sql.mjs';
import {SETTLE_BODY as LIVE_SETTLE,NEW_MD5 as LEAGUE_AT_JOIN_MD5} from './league-at-join-sql.mjs';

const md5=text=>createHash('md5').update(text).digest('hex');
const swap=(body,from,to)=>{if(body.split(from).length!==2)throw Error(`Not exactly once: ${from.slice(0,80)}`);return body.replace(from,()=>to);};
const LAST=EVENT_LEAGUES.length-1,FIRST_HARBOUR=EVENT_LEAGUES.findIndex(l=>l.world===3),LAST_VILLAGE=FIRST_HARBOUR-1;
if(LAST!==16||FIRST_HARBOUR!==12)throw Error('EVENT_LEAGUES changed: 17 leagues, the harbour from 12, expected');

// The live bodies (read 29 Oct 2026). The two small ones as read; the three big ones from the generators that made them.
const leagueCase=leagues=>'case '+leagues.slice(1).reverse().map((l,i)=>`when ${i?'p_level':'coalesce(p_level,0)'}>=${l.from} then ${l.index}`).join(' ')+' else 0 end';
const leagueBody=leagues=>`\n select (${leagueCase(leagues)})::smallint\n`;
const LIVE_LEAGUE=leagueBody(EVENT_LEAGUES.slice(0,FIRST_HARBOUR));
const LIVE_LEAGUE_FOR=`\n select least(public.harvest_event_league(p_level),(case when jsonb_typeof(p_leagues)='array' and jsonb_array_length(p_leagues)>0 then jsonb_array_length(p_leagues) else 6 end)-1,case when p_world=1 then 5 else 11 end)::smallint\n`;
export const LIVE_MD5=Object.freeze({
 'harvest_event_league(integer)':'ea594ad4aeb110d5858de5cdaf68ddbe',
 'harvest_event_league_for(integer,jsonb,smallint)':'72ba9cc06862bab8a5778cecd96fbaa7',
 'harvest_event_pick(bigint)':'f2998fc6536299b3c248254eec3c9e33',
 'harvest_event_progress()':'bc6993b96e0a611798e3eecf1dddb439',
 'harvest_event_settle(uuid)':'00f76feae437a07cbf80cc6619fb7b14'
});
const have={'harvest_event_league(integer)':LIVE_LEAGUE,'harvest_event_league_for(integer,jsonb,smallint)':LIVE_LEAGUE_FOR,'harvest_event_pick(bigint)':HOUR_PICK_BODY_ONE_CROP,'harvest_event_progress()':LIVE_PROGRESS,'harvest_event_settle(uuid)':LIVE_SETTLE};
for(const [name,body] of Object.entries(have))if(md5(body)!==LIVE_MD5[name])throw Error(`${name}: the body from its generator is not the live one`);
if(FERTILIZE_MD5!==LIVE_MD5['harvest_event_progress()']||LEAGUE_AT_JOIN_MD5['harvest_event_settle(uuid)']!==LIVE_MD5['harvest_event_settle(uuid)'])throw Error('A generator no longer matches the live body');

// The new bodies.
export const LEAGUE_BODY=leagueBody(EVENT_LEAGUES);
export const LEAGUE_FOR_BODY=swap(LIVE_LEAGUE_FOR,'case when p_world=1 then 5 else 11 end',`case when p_world=1 then 5 when p_world=3 then ${LAST} else ${LAST_VILLAGE} end`);
export const PICK_BODY=HOUR_PICK_BODY_HARBOUR;
// The harbour's goals and the actions that move them (farm-state.js: shipLoad, collect of a harbour place, the Harbour market's sell,
// an upgrade of a harbour place, sealPat). Every stat of the harbour's hour pools is either here or a made_* good (counted on collect).
export const HARBOUR_MAPPED=Object.freeze({ship_loads:['ship_load'],ships_sent:['ship_load'],harbour_batches:['collect','collect_all'],harbour_sold:['sell'],harbour_upgrades:['upgrade'],seal_pats:['seal_pat']});
const mappedLine=Object.entries(HARBOUR_MAPPED).map(([stat,actions])=>`(stat='${stat}' and action${actions.length>1?` in (${actions.map(a=>`'${a}'`).join(',')})`:`='${actions[0]}'`})`).join(' or ');
export const PROGRESS_BODY=[
 [`  -- The world the farmer first counts in (20 Oct 2026): 1 below level 100, 2 from 100. Written once, with the first progress.`,
  `  -- The world the farmer first counts in (20 Oct 2026): 1 below level 100, 2 from 100, 3 in a harbour league (29 Oct 2026). Written once, with the first progress.`],
 [`p.world:=case when public.harvest_event_league(lv)>=6 then 2 else 1 end;`,`p.world:=case when public.harvest_event_league(lv)>=${FIRST_HARBOUR} then 3 when public.harvest_event_league(lv)>=6 then 2 else 1 end;`],
 [`or (stat='lake_fish' and action='lake_fish') or (stat='boat_trips' and action='boat_load');`,`or (stat='lake_fish' and action='lake_fish') or (stat='boat_trips' and action='boat_load')\n    or ${mappedLine};`]
].reduce((body,[from,to])=>swap(body,from,to),LIVE_PROGRESS);
const LIVE_COINS='array[1,2,3,4,5,8,10,12,14,16,18,20]',COINS=`array[${EVENT_LEAGUES.map(l=>l.coins).join(',')}]`;
if(LIVE_SETTLE.split(LIVE_COINS).length!==3)throw Error('The live settle changed: two coin arrays expected');
export const SETTLE_BODY=[
 [`× the league's number (1–5), 8 for the Valley Legends, 10–20 for the village leagues.`,`× the league's number (1–5), 8 for the Valley Legends, 10–20 for the village leagues, 22–30 for the harbour's (29 Oct 2026).`],
 [` -- Village events (20 Oct 2026): the events finished in a village league count in village_events_finished too. Both are recounts.`,
  ` -- Village events (20 Oct 2026): the events finished in a village league count in village_events_finished too. Both are recounts.\n -- A harbour league's (29 Oct 2026) counts in events_finished only.`],
 [`lp.qualified and lp.league>=6)`,`lp.qualified and lp.league between 6 and ${LAST_VILLAGE})`]
].reduce((body,[from,to])=>swap(body,from,to),LIVE_SETTLE).replaceAll(LIVE_COINS,COINS);
export const NEW_MD5=Object.freeze({
 'harvest_event_league(integer)':md5(LEAGUE_BODY),'harvest_event_league_for(integer,jsonb,smallint)':md5(LEAGUE_FOR_BODY),
 'harvest_event_pick(bigint)':md5(PICK_BODY),'harvest_event_progress()':md5(PROGRESS_BODY),'harvest_event_settle(uuid)':md5(SETTLE_BODY)
});
// Every stat a harbour league's hour can ask for is counted (mapped above, or a made_* good on collect).
const harbourStats=[...new Set(EVENT_HOUR_POOLS.slice(FIRST_HARBOUR).flat(2).map(g=>g.stat))];
const unmapped=harbourStats.filter(s=>!HARBOUR_MAPPED[s]&&!s.startsWith('made_'));
if(unmapped.length)throw Error(`Harbour goals no action counts: ${unmapped}`);
export const HARBOUR_HOUR_STATS=Object.freeze(harbourStats);

const HEADS={
 'harvest_event_league(integer)':`public.harvest_event_league(p_level integer)\n returns smallint language sql immutable set search_path to ''`,
 'harvest_event_league_for(integer,jsonb,smallint)':`public.harvest_event_league_for(p_level integer, p_leagues jsonb, p_world smallint default null::smallint)\n returns smallint language sql immutable set search_path to ''`,
 'harvest_event_pick(bigint)':`public.harvest_event_pick(n bigint)\n returns jsonb language plpgsql stable set search_path to ''`,
 'harvest_event_progress()':`public.harvest_event_progress()\n returns trigger language plpgsql set search_path to ''`,
 'harvest_event_settle(uuid)':`public.harvest_event_settle(p_event uuid)\n returns void language plpgsql set search_path to ''`
};
const BODIES={'harvest_event_league(integer)':LEAGUE_BODY,'harvest_event_league_for(integer,jsonb,smallint)':LEAGUE_FOR_BODY,'harvest_event_pick(bigint)':PICK_BODY,'harvest_event_progress()':PROGRESS_BODY,'harvest_event_settle(uuid)':SETTLE_BODY};
// The guard: each function as it runs today, or already as this file makes it (a second run).
const guardWant=JSON.stringify(Object.fromEntries(Object.keys(LIVE_MD5).map(name=>[name,[...new Set([LIVE_MD5[name],NEW_MD5[name]])]])));
const afterWant=JSON.stringify(NEW_MD5);
// The levels the after-check asks harvest_event_league for: every league's edges.
const CHECK=EVENT_LEAGUES.flatMap(l=>[l.from-1,l.from]).filter(n=>n>0).concat(999).map(level=>[level,EVENT_LEAGUES.reduce((found,l)=>level>=l.from?l.index:found,0)]);
const ACL_PRIVATE='{postgres=X/postgres,service_role=X/postgres}',ACL_PUBLIC='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}';
const ACL={'harvest_event_league(integer)':ACL_PUBLIC,'harvest_event_league_for(integer,jsonb,smallint)':ACL_PUBLIC,'harvest_event_pick(bigint)':ACL_PRIVATE,'harvest_event_progress()':ACL_PRIVATE,'harvest_event_settle(uuid)':ACL_PRIVATE};

const SQL=`-- Generated by scripts/harbour-leagues-sql.mjs. Do not edit by hand.
-- The harbour's five event leagues (29 Oct 2026): from level 221 the Quay League (221-240), Crane League (241-260), Anchor League
-- (261-280), Flagship League (281-299) and Harbour Legends (300), with harbour goals and coins ×22 to ×30. Diamonds as in every league.
-- Run it any time: a running event keeps the leagues and goals it was made with (an event made before this has 12 leagues, so a
-- farmer of 221+ races it in the Village Legends). Save the five function definitions first (no PITR). One transaction: any failed
-- check rolls all of it back. Running it twice changes nothing. Afterwards game/farm-state.js LIVE_EVENT_LEAGUES goes to 17.
begin;
set local lock_timeout='5s';
do $guard$ declare want jsonb:='${guardWant}'; k text; have text; begin
 for k in select jsonb_object_keys(want) loop
  select md5(prosrc) into have from pg_proc where oid=to_regprocedure('public.'||k);
  if have is null or not (want->k) ? have then raise exception 'public.% is not the one this file expects (md5 %); read the live definition first', k, have; end if;
 end loop;
end $guard$;

-- The wider checks: leagues 0..${LAST}, and world 3 for a farmer who joined in a harbour league.
alter table public.live_event_players drop constraint if exists live_event_players_league_check;
alter table public.live_event_players add constraint live_event_players_league_check check (league is null or league between 0 and ${LAST});
alter table public.live_event_players drop constraint if exists live_event_players_world_check;
alter table public.live_event_players add constraint live_event_players_world_check check (world = any (array[1,2,3]));

${Object.keys(HEADS).map(name=>`create or replace function ${HEADS[name]} as $function$${BODIES[name]}$function$;`).join('\n\n')}

-- After-check, in the same transaction.
do $after$ declare want jsonb:='${afterWant}'; k text; t jsonb; lv int; lg int; o jsonb; begin
 for k in select jsonb_object_keys(want) loop
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||k)) is distinct from want->>k then raise exception 'public.% did not come out as generated', k; end if;
 end loop;
 -- The headers and grants as they were: none security definer, the same volatility and search_path, the same grants.
 if exists(select 1 from (values ${Object.entries(ACL).map(([name,acl])=>`('${name}','${acl}')`).join(',')}) w(sig,acl) join pg_proc p on p.oid=to_regprocedure('public.'||w.sig)
    where p.prosecdef or p.proconfig is distinct from array['search_path=""'] or p.proacl::text is distinct from w.acl) then raise exception 'a function header or grant changed'; end if;
 if (select provolatile from pg_proc where oid='public.harvest_event_league(integer)'::regprocedure)<>'i' or (select provolatile from pg_proc where oid='public.harvest_event_pick(bigint)'::regprocedure)<>'s' then raise exception 'a volatility changed'; end if;
 -- Every league's edges.
 for lv,lg in select * from (values ${CHECK.map(([l,i])=>`(${l},${i})`).join(',')}) c(lv,lg) loop
  if public.harvest_event_league(lv)<>lg then raise exception 'harvest_event_league(%) is not %', lv, lg; end if;
 end loop;
 -- The worlds: 1 stays in the farm's leagues, 2 (and none) in the village's, 3 reaches the harbour's; an event of 12 leagues stops at 11.
 if public.harvest_event_league_for(300,'[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]'::jsonb,1::smallint)<>5 or public.harvest_event_league_for(300,'[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]'::jsonb,2::smallint)<>${LAST_VILLAGE}
  or public.harvest_event_league_for(300,'[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]'::jsonb,3::smallint)<>${LAST} or public.harvest_event_league_for(300,'[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]'::jsonb)<>${LAST_VILLAGE} or public.harvest_event_league_for(230,'[1,2,3,4,5,6,7,8,9,10,11,12]'::jsonb,3::smallint)<>${LAST_VILLAGE}
  then raise exception 'harvest_event_league_for is not as expected'; end if;
 -- The pick: ${LAST+1} leagues of one goal each, and the harbour's goals are harbour goals.
 t:=public.harvest_event_pick(floor(extract(epoch from now())/3600)::bigint+3);
 if jsonb_array_length(t->'leagues')<>${LAST+1} then raise exception 'harvest_event_pick does not make % leagues', ${LAST+1}; end if;
 for lg in ${FIRST_HARBOUR}..${LAST} loop
  o:=t->'leagues'->lg->'objectives'->0;
  if jsonb_array_length(t->'leagues'->lg->'objectives')<>1 or not (o->>'stat')=any(array[${HARBOUR_HOUR_STATS.map(s=>`'${s}'`).join(',')}]) or (o->>'target')::int<1 then raise exception 'league % of the pick is not a harbour goal: %', lg, o; end if;
 end loop;
 -- Still the trigger on player_farms, and the checks in place.
 if not exists(select 1 from pg_trigger tg where tg.tgrelid='public.player_farms'::regclass and not tg.tgisinternal and tg.tgenabled<>'D'
    and tg.tgfoid='public.harvest_event_progress()'::regprocedure) then raise exception 'harvest_event_progress is no longer a trigger on player_farms'; end if;
 if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.live_event_players'::regclass and conname='live_event_players_league_check') not like '%${LAST}%' then raise exception 'the league check is not 0..${LAST}'; end if;
end $after$;
commit;
`;
export function harbourLeaguesSql(){return SQL;}
if(import.meta.url===`file://${process.argv[1]}`){
 writeFileSync(new URL('../supabase/harbour-leagues.sql',import.meta.url),SQL);
 console.log('supabase/harbour-leagues.sql',SQL.length,'characters');
 for(const name of Object.keys(LIVE_MD5))console.log(name,LIVE_MD5[name],'->',NEW_MD5[name]);
}
