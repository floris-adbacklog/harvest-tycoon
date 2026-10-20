// Writes supabase/world-two-leagues-a.sql and supabase/world-two-leagues-b.sql (20 Oct 2026, the owner): the World 2 event leagues.
// From level 100 a farmer's event league is one of six village leagues (game/farm-state.js EVENT_LEAGUES 6..11), with goals in the
// village (public/event-goals.js VILLAGE_KINDS) and coins ×10 to ×20. A farmer who first counted in an event below level 100 finishes
// that event in the Valley Legends (the owner's answer to question 6: live_event_players.world, harvest_event_league_for).
// Run: node scripts/world-two-leagues-sql.mjs. Never edit the two files by hand: the pools alone are about 80 KB.
// - File a (Part A) adds the wider league check and the two columns, and changes nothing in how events work. Run it first.
// - File b (Part B) is the switch: run it in the break between two events, after farm-api (v231+) and the site are live. It refuses
//   while an event runs, without Part A, before farm-api saves a lake cast as an event action, and when a function is not the one
//   read on 20 Oct 2026 (md5 of its body). The after-check rolls everything back when anything did not come out as generated.
// The md5 of a body here is md5(prosrc) in Postgres: the exact text between the $function$ markers.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EVENT_LEAGUES,eventLeague} from '../public/farm-state.js';
import {PICK_SQL,PICK_BODY,VALIDATE_SQL,VALIDATE_BODY} from './event-goals-sql.mjs';

const md5=text=>createHash('md5').update(text).digest('hex');
// Everything below that depends on the leagues comes from EVENT_LEAGUES.
const LAST=EVENT_LEAGUES.length-1,LAST_FARM=EVENT_LEAGUES.filter(l=>l.world===1).length-1,VILLAGE=EVENT_LEAGUES.findIndex(l=>l.world===2);
const COINS=EVENT_LEAGUES.map(l=>l.coins).join(',');
const eventLeagueIndex=level=>eventLeague(level).index;
// The levels the after-check asks harvest_event_league for: every league's edges.
const CHECK_LEVELS=[14,15,29,30,89,90,99,100,120,121,140,141,160,161,180,181,200,201,999];
export const LEAGUE_CASE='case '+EVENT_LEAGUES.slice(1).reverse().map((l,i)=>`when ${i?'p_level':'coalesce(p_level,0)'}>=${l.from} then ${l.index}`).join(' ')+' else 0 end';
// The live bodies as read on 20 Oct 2026 (md5(prosrc)). harvest_event_schedule is not replaced and not checked: on 20 Oct 2026 it was
// paused (events stopped until the hourly events ship; ~/Harvest Tycoon/db-backups/events-pause-2026-10-20), so its body changed.
export const OLD_MD5=Object.freeze({
 'harvest_event_league(integer)':'70e2346a39150c74e63c49150982785c',
 'harvest_event_settle(uuid)':'f8d03d497d753939a49932b6e0b8f5a6',
 'harvest_event_progress()':'c686226418b81f335a5b2c50f915157d',
 'harvest_event_pick(bigint)':'a3fceccd063225a1c1a35a7f8cc6260c',
 'harvest_event_validate()':'3cef65028f1e6c1a94ac38b9dd51b5c0',
 'harvest_event_board(uuid)':'49e11423295f02123ada627558bd5ade'
});

// 1. The league by level: 0..11.
const LEAGUE_BODY=`
 select (${LEAGUE_CASE})::smallint
`;
// The league within an event: only the leagues the event was made with (6 for an event made before Part B, or none), and at most the
// Valley Legends for a farmer who first counted in the event below level 100 (p_world 1). The same rule as eventLeagueFor.
const LEAGUE_FOR_BODY=`
 select least(public.harvest_event_league(p_level),(case when jsonb_typeof(p_leagues)='array' and jsonb_array_length(p_leagues)>0 then jsonb_array_length(p_leagues) else ${LAST_FARM+1} end)-1,case when p_world=1 then ${LAST_FARM} else ${LAST} end)::smallint
`;
// 2. Settle: the live body (supabase/event-podium-2026-10-08.sql) with the league from harvest_event_league_for, the coins of all
// twelve leagues and the Village events counter.
const SETTLE_BODY=String.raw`
declare e public.live_events; n integer; per_player integer; budget integer;
begin
 select * into e from public.live_events where id=p_event for update;
 if not found or e.ends_at>now() or e.settled_at is not null then return; end if;
 -- The league of every farmer in the event, by their level now (1 Oct 2026), and then whether they finished their league's goals
 -- (live-event-league-goals.sql; an event without per-league goals uses its own for everyone). Within the leagues the event was made
 -- with, and at most the Valley Legends for a farmer who first counted below level 100 (world 1; 20 Oct 2026).
 update public.live_event_players p set league=public.harvest_event_league_for(s.level,e.leagues,p.world)
  from public.player_stats s where p.event_id=p_event and s.player_id=p.player_id;
 update public.live_event_players set league=0 where event_id=p_event and league is null;
 update public.live_event_players p set qualified=(not exists(select 1 from jsonb_array_elements(coalesce(e.leagues->p.league->'objectives',e.objectives)) o where coalesce((p.progress->>(o->>'stat'))::integer,0)<(o->>'target')::integer)) where event_id=p_event;
 select count(*) into n from public.live_event_players where event_id=p_event and qualified;
 per_player:=least((e.rewards->>'diamondMax')::integer,(e.rewards->>'diamondMin')::integer+floor(sqrt(n::numeric/(e.rewards->>'participantStep')::integer))::integer);
 budget:=least((e.rewards->>'poolCap')::integer,n*per_player);
 -- Completed players are ordered by completion time within their league, UUID as deterministic tie-break. The first three of each
 -- league also win a podium prize on top (+2000, +1000, +500 coins) and every later finisher +100 coins; the event's coins and the
 -- podium coins are × the league's number (1–5), 8 for the Valley Legends, 10–20 for the village leagues. Diamonds are a fixed 25, 15, 10 and 3 in every league
 -- (7 Oct 2026; 50, 30, 20 and 5 before), however many finished in the league (8 Oct 2026; on 7 Oct only with 4 or more).
 with ranked as (select player_id,league,row_number() over(partition by league order by last_at,player_id) as rank from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=((e.rewards->>'coins')::integer+(case r.rank when 1 then 2000 when 2 then 1000 when 3 then 500 else 100 end))*(array[${COINS}])[r.league+1],
  diamonds=(case r.rank when 1 then 25 when 2 then 15 when 3 then 10 else 3 end)
  from ranked r where p.event_id=p_event and p.player_id=r.player_id;
 -- The family bonus (27 Sep 2026): 3 or more finishers from one family each get +200 coins and +3 diamonds (+5 until 7 Oct 2026).
 with fam as (select m.family_id,lp.player_id from public.live_event_players lp
   join public.family_members m on m.player_id=lp.player_id and m.left_at is null
   join public.families f on f.id=m.family_id and f.deleted_at is null
   where lp.event_id=p_event and lp.qualified),
  big as (select family_id from fam group by family_id having count(*)>=3)
 update public.live_event_players p set coins=p.coins+200,diamonds=p.diamonds+3
  from fam where fam.family_id in (select family_id from big) and p.event_id=p_event and p.player_id=fam.player_id;
 update public.live_events set settled_at=now(),participants=(select count(*) from public.live_event_players where event_id=p_event),qualified=n,diamond_pool=budget where id=p_event;
 -- Village events (20 Oct 2026): the events finished in a village league count in village_events_finished too. Both are recounts.
 update public.player_stats s set events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified),
  village_events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified and lp.league>=${VILLAGE})
  where s.player_id in (select player_id from public.live_event_players where event_id=p_event and qualified);
end `;
// 3. Progress: the live body (supabase/live-events-league-change.sql) with the league per event, the row's world and the village goals.
const PROGRESS_BODY=String.raw`
declare e public.live_events; p public.live_event_players; o jsonb; receipt jsonb; action text; stat text;
 before_v integer; after_v integer; value integer; changed boolean; moved boolean; fresh boolean; mapped boolean; base jsonb;
 lg smallint; objs jsonb; extended boolean; lv integer;
begin
 receipt:=new.receipts->-1;action:=receipt->>'eventAction';
 if receipt is null or receipt->>'id' is not distinct from old.receipts->-1->>'id' or action is null then
  -- Not an event action: whatever it added to the stats must not count later on.
  if new.state->'stats' is distinct from old.state->'stats' then
   for p in select lp.* from public.live_event_players lp join public.live_events le on le.id=lp.event_id
    where lp.player_id=new.player_id and lp.baseline is not null and le.active and le.starts_at<=now() and le.ends_at>now() and le.settled_at is null loop
    base:=p.baseline;
    for stat in select jsonb_object_keys(p.baseline) loop
     base:=jsonb_set(base,array[stat],to_jsonb(coalesce((base->>stat)::integer,0)+greatest(0,coalesce((new.state#>>array['stats',stat])::integer,0)-coalesce((old.state#>>array['stats',stat])::integer,0))));
    end loop;
    if base is distinct from p.baseline then update public.live_event_players set baseline=base where event_id=p.event_id and player_id=p.player_id; end if;
   end loop;
  end if;
  return new;
 end if;
 select s.level into lv from public.player_stats s where s.player_id=new.player_id and s.level>=15;
 if not found then return new; end if;
 for e in select * from public.live_events where active and starts_at<=now() and ends_at>now() and settled_at is null order by id for share loop
  select * into p from public.live_event_players where event_id=e.id and player_id=new.player_id;
  fresh:=not found;
  -- The world the farmer first counts in (20 Oct 2026): 1 below level 100, 2 from 100. Written once, with the first progress.
  if fresh then p.progress:='{}';p.actions:=0;p.joined_at:=now();p.last_at:=now()-interval '1 day';p.baseline:=null;
   p.world:=case when public.harvest_event_league(lv)>=${VILLAGE} then 2 else 1 end;end if;
  -- The farmer's league in this event: within the leagues it was made with, at most the Valley Legends for world 1.
  lg:=public.harvest_event_league_for(lv,e.leagues,p.world);
  objs:=coalesce(e.leagues->lg->'objectives',e.objectives);
  -- Start from the stats before this action; a row from before this change keeps the progress it already has. The same for a goal
  -- the baseline lacks (11 Oct 2026: a farmer who levels into the next league mid-event gets that league's goals).
  base:=coalesce(p.baseline,'{}');extended:=false;
  for o in select * from jsonb_array_elements(objs) loop
   stat:=o->>'stat';
   if not base ? stat then
    base:=jsonb_set(base,array[stat],to_jsonb(coalesce((old.state#>>array['stats',stat])::integer,0)-coalesce((p.progress->>stat)::integer,0)));
    extended:=p.baseline is not null;
   end if;
  end loop;
  p.baseline:=base;
  -- Freeze the qualifying completion time so further play never worsens reward priority.
  if not fresh and not exists(select 1 from jsonb_array_elements(objs) obj where coalesce((p.progress->>(obj->>'stat'))::integer,0)<(obj->>'target')::integer) then continue; end if;
  changed:=false;moved:=false;
  for o in select * from jsonb_array_elements(objs) loop
   stat:=o->>'stat';
   before_v:=coalesce((old.state#>>array['stats',stat])::integer,0);after_v:=coalesce((new.state#>>array['stats',stat])::integer,0);
   mapped:=(stat in ('harvested','watered','tended','planted') and action in ('field','fields','tractor','collect_all')) or (stat='produced' and action in ('collect','collect_all')) or (stat='chores' and action='chore') or (stat='deliveries' and action='delivery')
    or (stat like 'harvest\_%' and action in ('field','fields','tractor')) or (stat like 'made\_%' and action in ('collect','collect_all'))
    or stat in ('sold','sold_wheat','earned','coins_spent','diamonds_spent') or (stat in ('activities','activity_rounds') and action='activity_work') or (stat='upgrades' and action='upgrade')
    or (stat='fertilized' and action='fertilize') or (stat='parallel_batches' and action='produce') or (stat='boosts_used' and action='buy_boost')
    or (stat='glasshouse_batches' and action in ('collect','collect_all')) or (stat='valley_baskets' and action='valley_sell')
    or (stat='tractor' and action='tractor') or (stat like 'sold\_%' and action='sell')
    or (stat='village_batches' and action in ('collect','collect_all')) or (stat='village_requests' and action='village_deliver')
    or (stat='lake_fish' and action='lake_fish') or (stat='boat_trips' and action='boat_load');
   if not mapped then
    if after_v>before_v then p.baseline:=jsonb_set(p.baseline,array[stat],to_jsonb(coalesce((p.baseline->>stat)::integer,0)+after_v-before_v));moved:=true;end if;
    continue;
   end if;
   value:=least((o->>'target')::integer,greatest(0,after_v-coalesce((p.baseline->>stat)::integer,before_v)));
   if value>coalesce((p.progress->>stat)::integer,0) then changed:=true;p.progress:=jsonb_set(p.progress,array[stat],to_jsonb(value));end if;
  end loop;
  if changed then
   -- A save counts as a separate contribution at most once every 10 seconds; progress itself always counts.
   insert into public.live_event_players(event_id,player_id,progress,actions,joined_at,last_at,baseline,world)
    values(e.id,new.player_id,p.progress,p.actions+(case when p.last_at<=now()-interval '10 seconds' then 1 else 0 end),p.joined_at,now(),p.baseline,p.world)
    on conflict(event_id,player_id) do update set progress=excluded.progress,actions=excluded.actions,last_at=excluded.last_at,baseline=excluded.baseline;
  elsif (moved or extended) and not fresh then
   update public.live_event_players set baseline=p.baseline where event_id=e.id and player_id=new.player_id;
  end if;
 end loop;
 return new;
end `;
// 4. Board: the league of a row without one (still running) by harvest_event_league_for, with the event's leagues and the row's world.
const BOARD_BODY=String.raw`
 select lp.player_id,lp.progress,lp.actions,lp.joined_at,lp.last_at,lp.qualified,lp.coins,lp.diamonds,coalesce(lp.league,public.harvest_event_league_for(s.level,e.leagues,lp.world))
 from public.live_event_players lp join public.live_events e on e.id=lp.event_id left join public.player_stats s on s.player_id=lp.player_id
 where lp.event_id=p_event
`;

// The full headers as live (pg_get_functiondef, 20 Oct 2026): create or replace takes security definer, volatility and search_path from
// here, and keeps the grants.
const fn=(head,body)=>`create or replace function ${head} as $function$${body}$function$;`;
const FUNCTIONS=[
 ['harvest_event_league(integer)','public.harvest_event_league(p_level integer)\n returns smallint language sql immutable set search_path to \'\'',LEAGUE_BODY],
 ['harvest_event_league_for(integer,jsonb,smallint)','public.harvest_event_league_for(p_level integer, p_leagues jsonb, p_world smallint default null)\n returns smallint language sql immutable set search_path to \'\'',LEAGUE_FOR_BODY],
 ['harvest_event_settle(uuid)','public.harvest_event_settle(p_event uuid)\n returns void language plpgsql set search_path to \'\'',SETTLE_BODY],
 ['harvest_event_progress()','public.harvest_event_progress()\n returns trigger language plpgsql set search_path to \'\'',PROGRESS_BODY],
 ['harvest_event_board(uuid)','public.harvest_event_board(p_event uuid)\n returns table(player_id uuid, progress jsonb, actions integer, joined_at timestamptz, last_at timestamptz, qualified boolean, coins integer, diamonds integer, league smallint)\n language sql stable security definer set search_path to \'\'',BOARD_BODY]
];
export const NEW_MD5=Object.freeze({
 ...Object.fromEntries(FUNCTIONS.map(([name,,body])=>[name,md5(body)])),
 'harvest_event_pick(bigint)':md5(PICK_BODY),'harvest_event_validate()':md5(VALIDATE_BODY)
});
// For the guard: each function as it is today, or already as this file makes it (a second run).
const guardWant=JSON.stringify(Object.fromEntries(Object.entries(OLD_MD5).map(([name,old])=>[name,[...new Set([old,NEW_MD5[name]])]])));
const afterWant=JSON.stringify(NEW_MD5);
const BREAKS='05:05-05:55, 11:05-11:55, 17:05-17:55 or 23:05-23:55 UTC';

const A=`-- Generated by scripts/world-two-leagues-sql.mjs. Do not edit by hand.
-- World 2 event leagues, PART A (20 Oct 2026): run first, any time. It changes nothing in how events work: the wider league check
-- (0..${LAST}), live_event_players.world and player_stats.village_events_finished. farm-api and the site read the two columns, so this
-- runs before both. No backfill: no row has a league above ${LAST_FARM}, and a NULL world means no cap (today's rule).
-- Running it twice does nothing. Part B is its own file (supabase/world-two-leagues-b.sql), run at step 4 of the release.
begin;
set local lock_timeout='5s';
alter table public.live_event_players drop constraint if exists live_event_players_league_check;
alter table public.live_event_players add constraint live_event_players_league_check check (league is null or league between 0 and ${LAST});
-- The world a farmer first counted in, per event (20 Oct 2026): 1 below level 100, 2 from 100. A farmer of world 1 who reaches 100
-- during the event finishes it in the Valley Legends (harvest_event_league_for). Written once, by harvest_event_progress; NULL on older rows.
alter table public.live_event_players add column if not exists world smallint check (world in (1,2));
-- Village events (20 Oct 2026): finished events in a village league (league >= ${VILLAGE}). harvest_event_settle recounts it, as events_finished.
alter table public.player_stats add column if not exists village_events_finished integer not null default 0;
grant select (village_events_finished) on public.player_stats to authenticated;
create index if not exists player_stats_village_events_finished_ranking on public.player_stats (village_events_finished desc, player_id);
commit;
`;

const B=`-- Generated by scripts/world-two-leagues-sql.mjs. Do not edit by hand.
-- World 2 event leagues, PART B (20 Oct 2026): the switch. Run it in the break between two events (${BREAKS}), after Part A
-- (supabase/world-two-leagues-a.sql), farm-api v231 or later and the site are live. Save the future live_events rows and the
-- harvest_event_% definitions first (no PITR). One transaction: any failed check rolls all of it back.
-- From level 100 a farmer races in one of six village leagues (${EVENT_LEAGUES.filter(l=>l.world===2).map(l=>`${l.index} ${l.name}`).join(', ')}), with village
-- goals and coins ×${EVENT_LEAGUES[VILLAGE].coins} to ×${EVENT_LEAGUES[LAST].coins}. An event made with the ${LAST_FARM+1} farm leagues keeps a farmer of 100+ in the Valley Legends, and so does
-- an event the farmer first counted in below level 100 (live_event_players.world 1). Running it twice changes nothing.
begin;
set local lock_timeout='5s';
do $guard$
declare want jsonb:='${guardWant}';
 fn text; have text;
begin
 -- Only in the break: nothing is running, so no event ever mixes the old and the new rules.
 if exists(select 1 from public.live_events where active and starts_at<=now() and ends_at>now()) then
  raise exception 'An event is running. Run part B in the break: ${BREAKS}.'; end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='player_stats' and column_name='village_events_finished')
  or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='live_event_players' and column_name='world')
  or not exists(select 1 from pg_constraint where conname='live_event_players_league_check' and pg_get_constraintdef(oid) like '%${LAST}%') then
  raise exception 'Run part A first.'; end if;
 -- farm-api v231 or later is live: v230 saves a lake cast as no event action (eventAction null), v231 as 'lake_fish'. Receipts keep a
 -- farm's last 100 actions; live on 20 Oct 2026 no farm has one (0 of 7,507), and the scan takes about 0.5 s.
 if not exists(select 1 from public.player_farms where receipts @> '[{"eventAction":"lake_fish"}]') then
  raise exception 'Deploy farm-api (step 2) first, then catch one fish at the village lake.'; end if;
 for fn in select jsonb_object_keys(want) loop
  select md5(prosrc) into have from pg_proc where oid=to_regprocedure('public.'||fn);
  if have is null or not (want->fn ? have) then raise exception 'public.% is not the one this file expects (md5 %); read the live definition first', fn, have; end if;
 end loop;
 -- Events that have ended are settled first, with the functions as they are now.
 perform public.harvest_event_settle(id) from public.live_events where ends_at<=now() and settled_at is null;
end $guard$;

-- 1. League by level (0..${LAST}), and the league within an event.
${fn(FUNCTIONS[0][1],FUNCTIONS[0][2])}
-- An event only has the leagues it was made with (20 Oct 2026): one made with the ${LAST_FARM+1} farm leagues (or none) keeps 100+ in
-- league ${LAST_FARM}, the Valley Legends, with their goals and coins. A farmer who first counted in the event below level 100 (p_world 1) also
-- stays at most in league ${LAST_FARM} until it ends. Used by progress, settle and board, the same rule as eventLeagueFor in game/farm-state.js.
${fn(FUNCTIONS[1][1],FUNCTIONS[1][2])}

-- 2. Settle: the league via harvest_event_league_for, the coins of every league, and the Village events counter.
${fn(FUNCTIONS[2][1],FUNCTIONS[2][2])}

-- 3. Progress: the league per event, the row's world (written once), and the village goals' actions.
${fn(FUNCTIONS[3][1],FUNCTIONS[3][2])}

-- 4. Board: the event's leagues and the row's world for a row that has no league yet.
${fn(FUNCTIONS[4][1],FUNCTIONS[4][2])}
revoke all on function public.harvest_event_board(uuid) from public, anon, authenticated;
grant execute on function public.harvest_event_board(uuid) to service_role;

-- 5. The pick with ${EVENT_LEAGUES.length} pools, and the check with the village goals (scripts/event-goals-sql.mjs). harvest_event_schedule is not replaced.
${PICK_SQL}

${VALIDATE_SQL}

-- 6. Self-check of the pick: 500 slots from now, every one with ${EVENT_LEAGUES.length} leagues of 3 goals and a title.
do $check$ declare n bigint; t jsonb; s bigint:=floor(extract(epoch from now())/21600)::bigint; begin
 for n in s..s+500 loop t:=public.harvest_event_pick(n);
  if jsonb_array_length(t->'leagues')<>${EVENT_LEAGUES.length} or exists(select 1 from jsonb_array_elements(t->'leagues') l where jsonb_array_length(l->'objectives')<>3 or coalesce(l->>'title','')='') then raise exception 'pick %',n; end if;
 end loop; end $check$;

-- 7. The automatic events made ahead get the village leagues. The pick is the same for the farm leagues, so only ${VILLAGE}..${LAST} are
-- added; a row whose first ${LAST_FARM+1} leagues would change is left alone (and the after-check then refuses).
update public.live_events e set leagues=x.l
 from (select id, public.harvest_event_pick(floor(extract(epoch from starts_at)/21600)::bigint)->'leagues' l from public.live_events
       where created_by is null and settled_at is null and starts_at>now() and jsonb_array_length(leagues)=${LAST_FARM+1}) x
 where e.id=x.id and (select jsonb_agg(v order by i) from jsonb_array_elements(x.l) with ordinality t(v,i) where i<=${LAST_FARM+1})=e.leagues;

-- 8. After-check, in the same transaction.
do $after$ declare fn text; want jsonb:='${afterWant}'; begin
 for fn in select jsonb_object_keys(want) loop
  -- is distinct from: a missing function (NULL) fails too.
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||fn)) is distinct from want->>fn then raise exception 'public.% did not come out as generated',fn; end if;
 end loop;
 -- The headers as live: security definer, volatility and search_path, then the grants.
 if exists(select 1 from (values ('harvest_event_board(uuid)',true,'s'),('harvest_event_settle(uuid)',false,'v'),('harvest_event_progress()',false,'v'),
    ('harvest_event_validate()',false,'v'),('harvest_event_pick(bigint)',false,'s'),('harvest_event_league(integer)',false,'i'),
    ('harvest_event_league_for(integer,jsonb,smallint)',false,'i')) w(fn,secdef,vol)
   left join pg_proc p on p.oid=to_regprocedure('public.'||w.fn)
   where p.oid is null or p.prosecdef is distinct from w.secdef or p.provolatile::text is distinct from w.vol or p.proconfig is distinct from array['search_path=""'])
  then raise exception 'a function header changed (security definer, volatility or search_path)'; end if;
 if exists(select 1 from unnest(array['harvest_event_board(uuid)','harvest_event_settle(uuid)','harvest_event_progress()','harvest_event_validate()','harvest_event_pick(bigint)']) fn
    where (select proacl::text from pg_proc where oid=to_regprocedure('public.'||fn)) is distinct from '{postgres=X/postgres,service_role=X/postgres}')
  or (select proacl::text from pg_proc where oid='public.harvest_event_league(integer)'::regprocedure) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}'
  or not has_function_privilege('service_role','public.harvest_event_league_for(integer,jsonb,smallint)','execute')
  then raise exception 'the grants of a harvest_event function changed'; end if;
 if array(select public.harvest_event_league(l) from unnest(array[${CHECK_LEVELS.join(',')}]) l)
   <>array[${CHECK_LEVELS.map(l=>eventLeagueIndex(l)).join(',')}]::smallint[] then raise exception 'harvest_event_league'; end if;
 if public.harvest_event_league_for(150,'[${Array(LAST_FARM+1).fill('{}').join(',')}]')<>${LAST_FARM} or public.harvest_event_league_for(150,null)<>${LAST_FARM}
   or public.harvest_event_league_for(150,(select jsonb_agg(x) from generate_series(1,${EVENT_LEAGUES.length}) x))<>${eventLeagueIndex(150)}
   or public.harvest_event_league_for(150,(select jsonb_agg(x) from generate_series(1,${EVENT_LEAGUES.length}) x),1::smallint)<>${LAST_FARM}
   or public.harvest_event_league_for(150,(select jsonb_agg(x) from generate_series(1,${EVENT_LEAGUES.length}) x),2::smallint)<>${eventLeagueIndex(150)}
   or public.harvest_event_league_for(95,(select jsonb_agg(x) from generate_series(1,${EVENT_LEAGUES.length}) x),1::smallint)<>${LAST_FARM} then raise exception 'harvest_event_league_for'; end if;
 if exists(select 1 from public.live_events where created_by is null and settled_at is null and starts_at>now() and jsonb_array_length(leagues)<>${EVENT_LEAGUES.length})
  then raise exception 'an automatic event that has not started still has ${LAST_FARM+1} leagues'; end if;
 if not exists(select 1 from public.live_events where created_by is null and starts_at>now()) then raise notice 'no future event yet; the next cron run makes it with ${EVENT_LEAGUES.length} leagues'; end if;
 -- Last: still in the break by the clock. now() is the time the transaction began, so a Part B started at :5x that runs past :00
 -- would have changed the leagues and rules of an event that already started. Roll everything back instead.
 if exists(select 1 from public.live_events where active and starts_at<=clock_timestamp() and ends_at>clock_timestamp()) then
  raise exception 'Part B ran into the next event; run it again in the next break.'; end if;
end $after$;
commit;
`;
export function worldTwoLeaguesSql(){return {a:A,b:B};}
if(import.meta.url===`file://${process.argv[1]}`){
 writeFileSync(new URL('../supabase/world-two-leagues-a.sql',import.meta.url),A);
 writeFileSync(new URL('../supabase/world-two-leagues-b.sql',import.meta.url),B);
 console.log('supabase/world-two-leagues-a.sql',A.length,'characters; supabase/world-two-leagues-b.sql',B.length,'characters,',EVENT_LEAGUES.length,'leagues');
 for(const [name,hash] of Object.entries(NEW_MD5))console.log(name,OLD_MD5[name]??'(new)','->',hash);
}
