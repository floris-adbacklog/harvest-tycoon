// Writes supabase/hourly-coins.sql (20 Oct 2026, the owner, later the same day as the hourly events): the hourly events pay coins
// again, a quarter of the 6-hour events' coins. coins = (50 + 500 / 250 / 125 for the first three in a league, 25 for every other
// finisher) × the league's coins (EVENT_LEAGUES: 1 to 5, 8, 10 to 20), so a Sprout finisher gets 75 and the first in the Village
// Legends 11,000. Diamonds stay 8 / 5 / 3 and 1. The family bonus is +3 diamonds and a flat +500 coins (no league factor, as the old
// +200). All of it is in game/farm-state.js HOUR_EVENT_REWARDS, stored in each event's rewards.
// Run: node scripts/hourly-coins-sql.mjs. Never edit the file by hand.
// The file: settle pays the coins of an event's own rewards (an event without them, like the running one and every settled one, pays
// none, as before); the check accepts them; the schedule makes new events with them; the events made ahead that have not started
// get them. The running event and the settled ones keep their rewards. It can run while an event runs (settle reads each event's own
// rewards), between hh:05 and hh:50 so it never meets the cron job's hand-out at :55 or an event starting.
// It refuses when a function is not the one read live (md5 of its body). The after-check rolls everything back when anything did
// not come out as generated. The md5 of a body here is md5(prosrc) in Postgres: the exact text between the $function$ markers.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EVENT_LEAGUES,HOUR_EVENT_REWARDS} from '../public/farm-state.js';
import {HOUR_SETTLE_BODY,SCHEDULE_BODY,REWARDS_JSON as DIAMONDS_ONLY_JSON,LEGACY_LINES,NEW_MD5 as HOURLY_MD5} from './hourly-events-sql.mjs';
import {HOUR_VALIDATE_BODY} from './event-goals-sql.mjs';

const md5=text=>createHash('md5').update(text).digest('hex');
export const REWARDS_JSON=JSON.stringify(HOUR_EVENT_REWARDS);
// The keys the first hourly events lack, merged into the events made ahead (their diamonds stay as they are).
export const COIN_KEYS=Object.freeze(['coins','podiumCoins','finisherCoins','familyCoins']);
export const COINS_JSON=JSON.stringify(Object.fromEntries(COIN_KEYS.map(k=>[k,HOUR_EVENT_REWARDS[k]])));
const FACTORS=EVENT_LEAGUES.map(l=>l.coins).join(',');

// The live bodies, read with
//  select p.oid::regprocedure::text, md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
//   where n.nspname='public' and p.proname like 'harvest_event%' order by 1;
// Read live on 20 Oct 2026 at 13:25 UTC, after supabase/hourly-events.sql ran (12:08 UTC): exactly its NEW_MD5 and Part B's others.
// Read them again right before running this file; if one differs, paste it here and regenerate.
export const LIVE_MD5=Object.freeze({
 'harvest_event_board(uuid)':'c509587a78de0cdc576cd6681ba9a29f',
 'harvest_event_claim(uuid,uuid)':'de2cdc930a667bc9c80f3737fca9929c',
 'harvest_event_league(integer)':'ea594ad4aeb110d5858de5cdaf68ddbe',
 'harvest_event_league_for(integer,jsonb,smallint)':'72ba9cc06862bab8a5778cecd96fbaa7',
 'harvest_event_pause(timestamptz)':'ec48c1c17c8751f6ef231c9ac25b9f3e',
 'harvest_event_pick(bigint)':'a4354b4070af10908e1e609720cba26d',
 'harvest_event_progress()':'4681019789851e424d9a12f74f843077',
 'harvest_event_schedule()':'3d8632d66217916f3a9d18a74d340577',
 'harvest_event_settle(uuid)':'1fd63cef297e5f96636fe7da62596b13',
 'harvest_event_validate()':'15a89d91355e859133cecff10277a0fc'
});
// The bodies changed here are built from the ones hourly-events.sql made, which are the live ones.
for(const [name,body] of [['harvest_event_settle(uuid)',HOUR_SETTLE_BODY],['harvest_event_schedule()',SCHEDULE_BODY],['harvest_event_validate()',HOUR_VALIDATE_BODY]])
 if(md5(body)!==LIVE_MD5[name]||HOURLY_MD5[name]!==LIVE_MD5[name])throw Error(`${name}: the body from scripts/hourly-events-sql.mjs is not the live one`);

const swap=(text,from,to)=>{if(text.split(from).length!==2)throw Error(`The hourly body changed: ${from.slice(0,60)}`);return text.replace(from,()=>to);};

// 1. Settle: an hourly event pays (coins + the place's podiumCoins, or finisherCoins from 4th place) × the league, and its family
// bonus adds familyCoins (flat). An event without those keys pays 0 coins, as the first hourly events did. The 6-hour lines stay.
const LEGACY_FACTORS=LEGACY_LINES.coins.match(/\(array\[([0-9,]+)\]\)\[r\.league\+1\]/)?.[1];
if(LEGACY_FACTORS!==FACTORS)throw Error(`The league coins differ from settle's: ${LEGACY_FACTORS} vs ${FACTORS}`);
export const HOUR_COINS_LINE=`(coalesce((e.rewards->>'coins')::integer,0)+coalesce((e.rewards->'podiumCoins'->>(r.rank::integer-1))::integer,(e.rewards->>'finisherCoins')::integer,0))*(array[${FACTORS}])[r.league+1]`;
let settle=HOUR_SETTLE_BODY;
settle=swap(settle,` -- The prizes are the event's own (rewards, 20 Oct 2026): an hourly event carries podium and finisher diamonds and pays no
 -- coins; an older event without them keeps the rules it was made with (event-podium-2026-10-08.sql, world-two-leagues-b.sql).
`,` -- The prizes are the event's own (rewards, 20 Oct 2026): an hourly event carries its podium and finisher diamonds and coins; an
 -- older event without podium keeps the rules it was made with (event-podium-2026-10-08.sql, world-two-leagues-b.sql).
`);
settle=swap(settle,`fam_c:=case when hour then 0 else 200 end;\n`,`fam_c:=case when hour then coalesce((e.rewards->>'familyCoins')::integer,0) else 200 end;\n`);
settle=swap(settle,` -- All of that is for an event from before 20 Oct 2026. An hourly event pays the diamonds of its own rewards (podium, then finisher
 -- from 4th place on) and no coins.
`,` -- All of that is for an event from before 20 Oct 2026. An hourly event pays the diamonds of its own rewards (podium, then finisher
 -- from 4th place on), and its coins plus the place's podiumCoins (finisherCoins from 4th place on), × the league (20 Oct 2026, later;
 -- the first hourly events have no coins in their rewards and pay none).
`);
settle=swap(settle,`  coins=case when hour then 0 else ${LEGACY_LINES.coins} end,\n`,`  coins=case when hour then ${HOUR_COINS_LINE} else ${LEGACY_LINES.coins} end,\n`);
settle=swap(settle,` -- The family bonus (27 Sep 2026): fam_n or more finishers from one family in this event each get fam_d diamonds, and 200 coins on an
 -- event from before 20 Oct 2026 (+5 diamonds until 7 Oct 2026).
`,` -- The family bonus (27 Sep 2026): fam_n or more finishers from one family in this event each get fam_d diamonds, and fam_c coins:
 -- 200 on an event from before 20 Oct 2026, an hourly event's familyCoins (flat, no league factor) (+5 diamonds until 7 Oct 2026).
`);
export const SETTLE_BODY=settle;

// 2. The check: an hourly event may carry coins, with podiumCoins, finisherCoins and familyCoins together; without them its coins
// stay 0 (the first hourly events, and an event made by an older farm-api).
export const COINS_CHECK=`  -- Coins (20 Oct 2026, later): podiumCoins, finisherCoins and familyCoins together, or none of them and coins 0 (the first hourly events).
  if new.rewards ?| array['podiumCoins','finisherCoins','familyCoins'] then
   if not new.rewards ?& array['podiumCoins','finisherCoins','familyCoins'] or jsonb_typeof(new.rewards->'podiumCoins')<>'array' or jsonb_array_length(new.rewards->'podiumCoins')<>3
    or exists(select 1 from jsonb_array_elements(new.rewards->'podiumCoins') d where case when jsonb_typeof(d)='number' then d::text::numeric<>trunc(d::text::numeric) or d::text::numeric not between 0 and 2000 else true end)
    then raise exception 'Podium coins must be 3 whole numbers from 0 to 2000.'; end if;
   foreach k in array array['finisherCoins','familyCoins'] loop
    if jsonb_typeof(new.rewards->k)<>'number' or (new.rewards->>k)::numeric<>trunc((new.rewards->>k)::numeric) then raise exception 'Reward settings must be whole numbers.'; end if;
   end loop;
   if (new.rewards->>'finisherCoins')::integer not between 0 and 200 or (new.rewards->>'familyCoins')::integer not between 0 and 1000 then raise exception 'Reward settings exceed safe limits.'; end if;
  elsif (new.rewards->>'coins')::integer<>0 then raise exception 'Reward settings exceed safe limits.';
  end if;
`;
export const VALIDATE_BODY=swap(HOUR_VALIDATE_BODY,`   or (new.rewards->>'familyDiamonds')::integer not between 0 and 5 or (new.rewards->>'coins')::integer<>0
   then raise exception 'Reward settings exceed safe limits.'; end if;
`,`   or (new.rewards->>'familyDiamonds')::integer not between 0 and 5
   then raise exception 'Reward settings exceed safe limits.'; end if;
${COINS_CHECK}`);

// 3. Schedule: new events carry the coins.
export const NEW_SCHEDULE_BODY=swap(SCHEDULE_BODY,`rewards constant jsonb:='${DIAMONDS_ONLY_JSON}';`,`rewards constant jsonb:='${REWARDS_JSON}';`);

const SETTLE_HEAD='public.harvest_event_settle(p_event uuid)\n returns void language plpgsql set search_path to \'\'';
const SCHEDULE_HEAD='public.harvest_event_schedule()\n returns void language plpgsql set search_path to \'\'';
const VALIDATE_HEAD='public.harvest_event_validate()\n returns trigger language plpgsql set search_path to \'\'';
const define=(head,body)=>`create or replace function ${head} as $function$${body}$function$;`;
export const NEW_MD5=Object.freeze({'harvest_event_validate()':md5(VALIDATE_BODY),'harvest_event_settle(uuid)':md5(SETTLE_BODY),'harvest_event_schedule()':md5(NEW_SCHEDULE_BODY)});
// The guard: each function as read live, or already as this file makes it (a second run).
const guardWant=JSON.stringify(Object.fromEntries(Object.entries(LIVE_MD5).map(([name,live])=>[name,[...new Set([live,...(NEW_MD5[name]?[NEW_MD5[name]]:[])])]])));
const afterWant=JSON.stringify(NEW_MD5);
const keptWant=JSON.stringify(Object.fromEntries(Object.entries(LIVE_MD5).filter(([name])=>!NEW_MD5[name])));
const R=HOUR_EVENT_REWARDS,L=EVENT_LEAGUES;

const SQL=`-- Generated by scripts/hourly-coins-sql.mjs. Do not edit by hand.
-- Hourly events pay coins again (20 Oct 2026, the owner): a quarter of the 6-hour events' coins, (${R.coins} + ${R.podiumCoins.join(' / ')} for the first three in a
-- league, ${R.finisherCoins} for every other finisher) × the league's coins (${L[0].name} ×${L[0].coins} up to ${L.at(-1).name} ×${L.at(-1).coins}): a ${L[0].name.split(' ')[0]} finisher
-- gets ${(R.coins+R.finisherCoins)*L[0].coins}, the first in the ${L.at(-1).name} ${((R.coins+R.podiumCoins[0])*L.at(-1).coins).toLocaleString('en-US')}. Diamonds stay ${R.podium.join(' / ')} and ${R.finisher}. The family bonus: +${R.familyDiamonds} diamonds and a flat +${R.familyCoins} coins.
-- Run it after the site and farm-api of this change are live, between hh:05 and hh:50 UTC (an event may run). Save the
-- harvest_event_% definitions and the live_events rows that have not started first (no PITR). One transaction: any failed check
-- rolls all of it back. Running it twice changes nothing. The running event and every settled one keep their rewards.
begin;
set local lock_timeout='5s';
do $guard$
declare want jsonb:='${guardWant}';
 fname text; have text;
begin
 -- Not in the cron job's hand-out (:55) and not when an event starts (:00).
 if extract(minute from now()) not between 5 and 50 then raise exception 'Run this between hh:05 and hh:50 UTC.'; end if;
 for fname in select jsonb_object_keys(want) loop
  select md5(prosrc) into have from pg_proc where oid=to_regprocedure('public.'||fname);
  if have is null or not (want->fname ? have) then raise exception 'public.% is not the one this file expects (md5 %); read the live definition first', fname, have; end if;
 end loop;
end $guard$;
-- The rewards of every event that has started, to check they stayed as they were.
create temp table hourly_coins_started on commit drop as select id,rewards from public.live_events where starts_at<=now();

-- 1. The check accepts an hourly event's coins (first: the events made ahead get them in step 4).
${define(VALIDATE_HEAD,VALIDATE_BODY)}

-- 2. Settle pays them: (coins + the place's coins) × the league, and the family bonus's flat coins.
${define(SETTLE_HEAD,SETTLE_BODY)}

-- 3. Schedule: new events carry the coins.
${define(SCHEDULE_HEAD,NEW_SCHEDULE_BODY)}

-- 4. The hourly events made ahead that have not started get the coins; their diamonds stay. Not the running one, nor a settled one.
update public.live_events set rewards=rewards||'${COINS_JSON}'::jsonb
 where starts_at>now() and settled_at is null and rewards ? 'podium' and not rewards ? 'podiumCoins';

-- 5. After-check, in the same transaction.
do $after$ declare fname text; want jsonb:='${afterWant}'; kept jsonb:='${keptWant}'; begin
 for fname in select jsonb_object_keys(want) loop
  -- is distinct from: a missing function (NULL) fails too.
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||fname)) is distinct from want->>fname then raise exception 'public.% did not come out as generated',fname; end if;
 end loop;
 for fname in select jsonb_object_keys(kept) loop
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||fname)) is distinct from kept->>fname then raise exception 'public.% changed',fname; end if;
 end loop;
 -- The headers and grants of the three as live: not security definer, volatile, search_path '', only postgres and service_role.
 if exists(select 1 from unnest(array['harvest_event_settle(uuid)','harvest_event_schedule()','harvest_event_validate()']) as replaced(sig)
    left join pg_proc p on p.oid=to_regprocedure('public.'||replaced.sig)
    where p.oid is null or p.prosecdef or p.provolatile<>'v' or p.proconfig is distinct from array['search_path=""']
     or p.proacl::text is distinct from '{postgres=X/postgres,service_role=X/postgres}')
  then raise exception 'a function header or grant changed'; end if;
 -- Every hourly event that has not started has the coins; the automatic ones exactly the new rewards.
 if exists(select 1 from public.live_events e where e.starts_at>now() and e.settled_at is null and e.rewards ? 'podium'
    and (not e.rewards @> '${COINS_JSON}'::jsonb or (e.created_by is null and e.rewards<>'${REWARDS_JSON}'::jsonb)))
  then raise exception 'an hourly event made ahead has no coins'; end if;
 -- The events that had started keep their rewards.
 if exists(select 1 from hourly_coins_started s left join public.live_events e on e.id=s.id where e.rewards is distinct from s.rewards)
  then raise exception 'the rewards of an event that had started changed'; end if;
 -- The check accepts every event settle and the schedule still have to write (the running one without coins, the ones ahead with).
 begin
  update public.live_events set rewards=rewards where settled_at is null;
  raise exception using errcode='HC001';
 exception when sqlstate 'HC001' then null;
 end;
end $after$;
commit;
`;
export function hourlyCoinsSql(){return SQL;}
if(import.meta.url===`file://${process.argv[1]}`){
 writeFileSync(new URL('../supabase/hourly-coins.sql',import.meta.url),SQL);
 console.log('supabase/hourly-coins.sql',SQL.length,'characters');
 for(const [name,hash] of Object.entries(NEW_MD5))console.log(name,LIVE_MD5[name],'->',hash);
}
