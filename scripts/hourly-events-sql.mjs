// Writes supabase/hourly-events.sql (20 Oct 2026, the owner): hourly events. A new event every hour, on the hour: 55 minutes of
// play, then 5 minutes in which the cron job hands out the prizes. One goal per league, about a fifth of the 5-hour medium goal
// (public/event-goals.js EVENT_HOUR_POOLS). Diamonds only: 8 / 5 / 3 for the first three in a league, 1 for every other finisher,
// and 3 more each when 3 or more of one Farm family finish (game/farm-state.js HOUR_EVENT_REWARDS, stored in each event's rewards).
// They count in events_finished, as before. A pause switch (harvest_event_pause) frees an hour for a release.
// Run: node scripts/hourly-events-sql.mjs. Never edit the file by hand: the hour pools alone are about 40 KB.
// The file is the switch: run it after the site and farm-api of this change are live, while no event runs (events are paused since
// 20 Oct 2026, so any time; best at hh:00-hh:04, so the first hourly event starts at once). It refuses while an event runs, without
// World 2 leagues Part B (supabase/world-two-leagues-b.sql), and when a function is not the one read live (md5 of its body). The
// after-check rolls everything back when anything did not come out as generated.
// The md5 of a body here is md5(prosrc) in Postgres: the exact text between the $function$ markers.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EVENT_LEAGUES as ALL_LEAGUES,HOUR_EVENT_REWARDS} from '../public/farm-state.js';
const EVENT_LEAGUES=ALL_LEAGUES.filter(l=>l.world<=2);   // the live leagues, 0..11 (the harbour's five, 27 Oct 2026, come with their own patch)
import {LAKE_FISH_PER_HOUR} from '../public/event-goals.js';
import {HOUR_PICK_SQL,HOUR_PICK_BODY,HOUR_VALIDATE_SQL,HOUR_VALIDATE_BODY,HOUR_STATS} from './event-goals-sql.mjs';
import {NEW_MD5 as PART_B_MD5,SETTLE_BODY as PART_B_SETTLE} from './world-two-leagues-sql.mjs';

const md5=text=>createHash('md5').update(text).digest('hex');
const LEAGUES=EVENT_LEAGUES.length;
// The rewards of the first hourly events, as this file ran on 20 Oct 2026 (diamonds only). Frozen here: HOUR_EVENT_REWARDS has the
// coins since (scripts/hourly-coins-sql.mjs), and this file must keep generating byte for byte what ran.
export const REWARDS_JSON='{"coins":0,"diamondMin":1,"diamondMax":1,"participantStep":25,"poolCap":50,"podium":[8,5,3],"finisher":1,"familyFinishers":3,"familyDiamonds":3}';

// The live bodies, read with
//  select p.oid::regprocedure::text, md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
//   where n.nspname='public' and p.proname like 'harvest_event%' order by 1;
// Read live on 20 Oct 2026 at 11:04 UTC, after Part B ran: exactly Part B's NEW_MD5 (scripts/world-two-leagues-sql.mjs) and the
// paused schedule. Read them again right before running this file; if one differs, paste it here and regenerate.
// harvest_event_schedule: the paused body (no new events, 20 Oct 2026), or the 6-hour body if someone restored it.
// harvest_event_claim is checked, not replaced: the payout relies on it paying p.coins + p.diamonds.
export const LIVE_MD5=Object.freeze({
 'harvest_event_board(uuid)':'c509587a78de0cdc576cd6681ba9a29f',
 'harvest_event_claim(uuid,uuid)':'de2cdc930a667bc9c80f3737fca9929c',
 'harvest_event_league(integer)':'ea594ad4aeb110d5858de5cdaf68ddbe',
 'harvest_event_league_for(integer,jsonb,smallint)':'72ba9cc06862bab8a5778cecd96fbaa7',
 'harvest_event_pick(bigint)':'56d9b813f0b9223c59251ff07d0bbc28',
 'harvest_event_progress()':'4681019789851e424d9a12f74f843077',
 'harvest_event_schedule()':['d280ae236ddae469437e80ef2bade5d9','aecdec923a2d0ef6fd71eb320e1b3482'],
 'harvest_event_settle(uuid)':'b73dea6778379f0bc6503f7bccad1870',
 'harvest_event_validate()':'588cad3b5889d187cfcff6f0f05182fe'
});

// Settle: Part B's body with the event's own prizes. An event whose rewards have podium (every hourly event) pays the podium and
// finisher diamonds and no coins, and its own family bonus; any other event (the 6-hour ones) is paid exactly as Part B does.
const swap=(text,from,to)=>{if(text.split(from).length!==2)throw Error(`Part B's settle changed: ${from.slice(0,60)}`);return text.replace(from,()=>to);};
let settle=PART_B_SETTLE;
settle=swap(settle,'declare e public.live_events; n integer; per_player integer; budget integer;\n',
 'declare e public.live_events; n integer; per_player integer; budget integer; hour boolean; fam_n integer; fam_d integer; fam_c integer;\n');
settle=swap(settle,' if not found or e.ends_at>now() or e.settled_at is not null then return; end if;\n',
 ` if not found or e.ends_at>now() or e.settled_at is not null then return; end if;
 -- The prizes are the event's own (rewards, 20 Oct 2026): an hourly event carries podium and finisher diamonds and pays no
 -- coins; an older event without them keeps the rules it was made with (event-podium-2026-10-08.sql, world-two-leagues-b.sql).
 hour:=e.rewards ? 'podium';
 fam_n:=coalesce((e.rewards->>'familyFinishers')::integer,3);fam_d:=coalesce((e.rewards->>'familyDiamonds')::integer,3);fam_c:=case when hour then 0 else 200 end;
`);
const LEGACY_COINS=PART_B_SETTLE.match(/ update public\.live_event_players p set coins=(\(\(e\.rewards->>'coins'\)::integer\+\(case r\.rank when 1 then 2000 when 2 then 1000 when 3 then 500 else 100 end\)\)\*\(array\[[0-9,]+\]\)\[r\.league\+1\]),\n/)?.[1];
if(!LEGACY_COINS)throw Error('Part B\'s settle changed: the coins line');
export const LEGACY_LINES=Object.freeze({coins:LEGACY_COINS,diamonds:'(case r.rank when 1 then 25 when 2 then 15 when 3 then 10 else 3 end)'});
settle=swap(settle,` update public.live_event_players p set coins=${LEGACY_COINS},\n  diamonds=${LEGACY_LINES.diamonds}\n`,
 ` update public.live_event_players p set
  coins=case when hour then 0 else ${LEGACY_COINS} end,
  diamonds=case when hour then coalesce((e.rewards->'podium'->>(r.rank::integer-1))::integer,(e.rewards->>'finisher')::integer)
   else ${LEGACY_LINES.diamonds} end
`);
settle=swap(settle,' -- (7 Oct 2026; 50, 30, 20 and 5 before), however many finished in the league (8 Oct 2026; on 7 Oct only with 4 or more).\n',
 ' -- (7 Oct 2026; 50, 30, 20 and 5 before), however many finished in the league (8 Oct 2026; on 7 Oct only with 4 or more).\n -- All of that is for an event from before 20 Oct 2026. An hourly event pays the diamonds of its own rewards (podium, then finisher\n -- from 4th place on) and no coins.\n');
settle=swap(settle,' -- The family bonus (27 Sep 2026): 3 or more finishers from one family each get +200 coins and +3 diamonds (+5 until 7 Oct 2026).\n',
 ' -- The family bonus (27 Sep 2026): fam_n or more finishers from one family in this event each get fam_d diamonds, and 200 coins on an\n -- event from before 20 Oct 2026 (+5 diamonds until 7 Oct 2026).\n');
settle=swap(settle,'  big as (select family_id from fam group by family_id having count(*)>=3)\n','  big as (select family_id from fam group by family_id having count(*)>=fam_n)\n');
settle=swap(settle,' update public.live_event_players p set coins=p.coins+200,diamonds=p.diamonds+3\n',' update public.live_event_players p set coins=p.coins+fam_c,diamonds=p.diamonds+fam_d\n');
export const HOUR_SETTLE_BODY=settle;

// Schedule: an event every hour (slots of 3600 s), the current hour and 2 ahead, never inside a pause, never one with under 50
// minutes to play.
export const SCHEDULE_BODY=`
declare
 rewards constant jsonb:='${REWARDS_JSON}';
 slot bigint:=floor(extract(epoch from now())/3600)::bigint;
 paused timestamptz; ended uuid; n bigint; starts timestamptz; event_id uuid; t jsonb;
begin
 for ended in select e.id from public.live_events e where e.ends_at<=now() and e.settled_at is null loop
  perform public.harvest_event_settle(ended);
 end loop;
 select c.paused_until into paused from public.event_config c where c.id;
 -- Automatic events nobody has a row in that have not started: the 6-hour ones from before 20 Oct 2026, and hourly ones inside a pause.
 delete from public.live_events e where e.created_by is null and e.settled_at is null and e.starts_at>now()
  and (e.ends_at-e.starts_at>interval '55 minutes' or e.starts_at<paused)
  and not exists(select 1 from public.live_event_players lp where lp.event_id=e.id);
 for n in slot..slot+2 loop
  starts:=to_timestamp(n*3600);
  -- Never an event with under 50 minutes to play (after a pause or a late run), never inside a pause.
  continue when starts<now()-interval '5 minutes' or starts<paused;
  event_id:=md5('harvest-hour-event:'||n)::uuid;
  continue when exists(select 1 from public.live_events e where e.id=event_id);
  t:=public.harvest_event_pick(n);
  begin
   insert into public.live_events(id,title,description,starts_at,ends_at,active,objectives,rewards,created_by,leagues)
   values(event_id,t->>'title',t->>'description',starts,starts+interval '55 minutes',true,t->'objectives',rewards,null,t->'leagues');
  exception
   -- An operator's own active event already holds this time, or a parallel run just created the same slot.
   when raise_exception or unique_violation then null;
  end;
 end loop;
end `;

// The pause switch: no event starts before p_until (null ends the pause, 'infinity' stops events). A running event still ends and pays.
export const PAUSE_BODY=`
declare removed integer; running timestamptz;
begin
 if p_until is not null and p_until<=now() then raise exception 'Give a time in the future, or null to end the pause.'; end if;
 update public.event_config set paused_until=p_until,updated_at=now() where id;
 -- Events made ahead inside the pause go now (none has a row: progress only counts started events).
 delete from public.live_events e where e.created_by is null and e.settled_at is null and e.starts_at>now() and e.starts_at<p_until
  and not exists(select 1 from public.live_event_players lp where lp.event_id=e.id);
 get diagnostics removed=row_count;
 select max(ends_at) into running from public.live_events where active and starts_at<=now() and ends_at>now();
 if p_until is null then perform public.harvest_event_schedule(); end if;
 return case when p_until is null then 'Events are on again. The next one starts on the hour.'
  else format('No event starts before %s UTC. %s event(s) made ahead removed.%s',to_char(p_until at time zone 'UTC','YYYY-MM-DD HH24:MI'),removed,
   case when running is null then '' else format(' The running event ends at %s UTC.',to_char(running at time zone 'UTC','HH24:MI')) end) end;
end `;

// For any later switch file that must run while no event runs (copy it into its guard, like world-two-leagues-b.sql):
export const RELEASE_GUARD_SQL=`if exists(select 1 from public.live_events where active and starts_at<=now() and ends_at>now()) then
 raise exception 'An event is running. Pause events first (harvest_event_pause) and run this in the empty hour.'; end if;
if not exists(select 1 from public.event_config where id and paused_until>clock_timestamp()+interval '10 minutes') then
 raise exception 'Pause events first: select public.harvest_event_pause(date_trunc(''hour'',now())+interval ''2 hours'');'; end if;`;

const SETTLE_HEAD='public.harvest_event_settle(p_event uuid)\n returns void language plpgsql set search_path to \'\'';
const SCHEDULE_HEAD='public.harvest_event_schedule()\n returns void language plpgsql set search_path to \'\'';
const PAUSE_HEAD='public.harvest_event_pause(p_until timestamptz)\n returns text language plpgsql set search_path to \'\'';
const fn=(head,body)=>`create or replace function ${head} as $function$${body}$function$;`;
export const NEW_MD5=Object.freeze({
 'harvest_event_pick(bigint)':md5(HOUR_PICK_BODY),'harvest_event_validate()':md5(HOUR_VALIDATE_BODY),'harvest_event_settle(uuid)':md5(HOUR_SETTLE_BODY),
 'harvest_event_schedule()':md5(SCHEDULE_BODY),'harvest_event_pause(timestamptz)':md5(PAUSE_BODY)
});
// The guard: each function as read live, or already as this file makes it (a second run).
const list=v=>Array.isArray(v)?v:[v];
const guardWant=JSON.stringify(Object.fromEntries(Object.entries(LIVE_MD5).map(([name,live])=>[name,[...new Set([...list(live),...(NEW_MD5[name]?[NEW_MD5[name]]:[])])]])));
// The after-check: the replaced ones as generated, the others still as read live.
const afterWant=JSON.stringify(NEW_MD5);
const keptWant=JSON.stringify(Object.fromEntries(Object.entries(LIVE_MD5).filter(([name])=>!NEW_MD5[name]).map(([name,live])=>[name,list(live)])));
const statList=HOUR_STATS.map(s=>`'${s}'`).join(',');

const SQL=`-- Generated by scripts/hourly-events-sql.mjs. Do not edit by hand.
-- Hourly events (20 Oct 2026, the owner): the switch. A new event every hour, on the hour: 55 minutes of play, then 5 minutes in which
-- the prizes are handed out. One goal per league, about a fifth of the 5-hour medium goal. Diamonds only: ${HOUR_EVENT_REWARDS.podium.join(' / ')} for the first
-- three in a league, ${HOUR_EVENT_REWARDS.finisher} for every other finisher, +${HOUR_EVENT_REWARDS.familyDiamonds} each when ${HOUR_EVENT_REWARDS.familyFinishers} or more of one Farm family finish. They count in events_finished.
-- Run it after the site and farm-api of this change are live, while no event runs; best at hh:00-hh:04 so the first event starts at
-- once. Save the harvest_event_% definitions and today's live_events rows first (no PITR). One transaction: any failed check rolls
-- all of it back. Running it twice changes nothing.
-- Pause for a release:  select public.harvest_event_pause(date_trunc('hour',now())+interval '2 hours');   (run during hh:xx: the next
-- hour has no event)    End the pause:  select public.harvest_event_pause(null);    Stop events:  select public.harvest_event_pause('infinity');
begin;
set local lock_timeout='5s';
do $guard$
declare want jsonb:='${guardWant}';
 fn text; have text;
begin
 -- Only while nothing runs: no event ever mixes the old and the new rules.
 if exists(select 1 from public.live_events where active and starts_at<=now() and ends_at>now()) then
  raise exception 'An event is running. Run this file while no event runs.'; end if;
 if to_regprocedure('public.harvest_event_league_for(integer,jsonb,smallint)') is null then
  raise exception 'Run World 2 leagues Part B (supabase/world-two-leagues-b.sql) first.'; end if;
 for fn in select jsonb_object_keys(want) loop
  select md5(prosrc) into have from pg_proc where oid=to_regprocedure('public.'||fn);
  if have is null or not (want->fn ? have) then raise exception 'public.% is not the one this file expects (md5 %); read the live definition first', fn, have; end if;
 end loop;
 -- Events that have ended are settled first, with the functions as they are now.
 perform public.harvest_event_settle(id) from public.live_events where ends_at<=now() and settled_at is null;
end $guard$;

-- 1. The table check allows a 55-minute event (it was 1 to 12 hours). farm-api keeps 1 to 12 hours for an event made by hand.
alter table public.live_events drop constraint if exists live_events_check;
alter table public.live_events add constraint live_events_check check (ends_at>=starts_at+interval '30 minutes' and ends_at<=starts_at+interval '12 hours');

-- 2. The pause switch: one row, only postgres and service_role (no policies), like chat_config. Not a player table.
create table if not exists public.event_config(id boolean primary key default true check (id), paused_until timestamptz,
 updated_at timestamptz not null default now());
insert into public.event_config(id) values (true) on conflict do nothing;
alter table public.event_config enable row level security;
revoke all on public.event_config from anon, authenticated;
${fn(PAUSE_HEAD,PAUSE_BODY)}
revoke all on function public.harvest_event_pause(timestamptz) from public, anon, authenticated;
grant execute on function public.harvest_event_pause(timestamptz) to service_role;

-- 3. The check on events, with the rules of an hourly event's prizes.
${HOUR_VALIDATE_SQL}

-- 4. The pick: one goal per league from the hour pools (public/event-goals.js EVENT_HOUR_POOLS), the same kind of play for everyone.
${HOUR_PICK_SQL}

-- 5. Settle: the event's own prizes. An hourly event (rewards with podium) pays ${HOUR_EVENT_REWARDS.podium.join(' / ')} and ${HOUR_EVENT_REWARDS.finisher} diamonds and no coins; an older
-- event is paid as Part B did.
${fn(SETTLE_HEAD,HOUR_SETTLE_BODY)}

-- 6. Schedule: an event every hour, the current hour and 2 ahead.
${fn(SCHEDULE_HEAD,SCHEDULE_BODY)}

-- 7. The progress trigger reads live_events on every farm save; the table now grows by 24 rows a day. Unsettled rows stay few.
create index if not exists live_events_open on public.live_events (starts_at) where settled_at is null;

-- 8. The two 6-hour events of 20 Oct 2026 that the pause left inactive (12:00 and 18:00 UTC, nobody in them) go, so they never show
-- in Recent events.
delete from public.live_events e where e.created_by is null and not e.active and e.starts_at>='2026-10-20 12:00+00'
 and e.ends_at-e.starts_at>interval '55 minutes' and not exists(select 1 from public.live_event_players lp where lp.event_id=e.id);

-- 9. The cron job every 5 minutes, so the run at :55 hands out the prizes in the gap (job 2, updated by name).
select cron.schedule('harvest-event-schedule','*/5 * * * *','select public.harvest_event_schedule()');

-- 10. The first events: at hh:00-hh:05 this hour's starts at once; otherwise the first starts at the next :00.
select public.harvest_event_schedule();

-- 11. Self-check of the pick: 500 hours from now, every one with ${LEAGUES} leagues of 1 goal from the hour pools, and a title.
do $check$ declare n bigint; t jsonb; s bigint:=floor(extract(epoch from now())/3600)::bigint; begin
 for n in s..s+500 loop t:=public.harvest_event_pick(n);
  if jsonb_array_length(t->'leagues')<>${LEAGUES} or exists(select 1 from jsonb_array_elements(t->'leagues') l where jsonb_array_length(l->'objectives')<>1 or coalesce(l->>'title','')=''
    or coalesce((l->'objectives'->0->>'target')::integer,0)<1 or coalesce(l->'objectives'->0->>'stat','') not in (${statList})
    or (l->'objectives'->0->>'stat'='lake_fish' and (l->'objectives'->0->>'target')::integer>${LAKE_FISH_PER_HOUR})) then raise exception 'pick %',n; end if;
 end loop; end $check$;

-- 12. After-check, in the same transaction.
do $after$ declare fn text; want jsonb:='${afterWant}'; kept jsonb:='${keptWant}'; begin
 for fn in select jsonb_object_keys(want) loop
  -- is distinct from: a missing function (NULL) fails too.
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||fn)) is distinct from want->>fn then raise exception 'public.% did not come out as generated',fn; end if;
 end loop;
 for fn in select jsonb_object_keys(kept) loop
  if not (kept->fn ? coalesce((select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||fn)),'')) then raise exception 'public.% changed',fn; end if;
 end loop;
 -- The headers as live: security definer, volatility and search_path, then the grants.
 if exists(select 1 from (values ('harvest_event_board(uuid)',true,'s'),('harvest_event_settle(uuid)',false,'v'),('harvest_event_progress()',false,'v'),
    ('harvest_event_validate()',false,'v'),('harvest_event_pick(bigint)',false,'s'),('harvest_event_league(integer)',false,'i'),
    ('harvest_event_league_for(integer,jsonb,smallint)',false,'i'),('harvest_event_schedule()',false,'v'),('harvest_event_claim(uuid,uuid)',false,'v'),
    ('harvest_event_pause(timestamptz)',false,'v')) w(name,secdef,vol)
   left join pg_proc p on p.oid=to_regprocedure('public.'||w.name)
   where p.oid is null or p.prosecdef is distinct from w.secdef or p.provolatile::text is distinct from w.vol or p.proconfig is distinct from array['search_path=""'])
  then raise exception 'a function header changed (security definer, volatility or search_path)'; end if;
 if exists(select 1 from unnest(array['harvest_event_board(uuid)','harvest_event_settle(uuid)','harvest_event_progress()','harvest_event_validate()','harvest_event_pick(bigint)','harvest_event_schedule()']) as checked(name)
    where (select proacl::text from pg_proc where oid=to_regprocedure('public.'||checked.name)) is distinct from '{postgres=X/postgres,service_role=X/postgres}')
  or not has_function_privilege('service_role','public.harvest_event_pause(timestamptz)','execute')
  or has_function_privilege('anon','public.harvest_event_pause(timestamptz)','execute')
  or has_function_privilege('authenticated','public.harvest_event_pause(timestamptz)','execute')
  then raise exception 'the grants of a harvest_event function changed'; end if;
 if not (select relrowsecurity from pg_class where oid='public.event_config'::regclass)
  or has_table_privilege('anon','public.event_config','select') or has_table_privilege('authenticated','public.event_config','select')
  or (select count(*) from public.event_config)<>1 then raise exception 'event_config is not one private row'; end if;
 if (select pg_get_constraintdef(oid) from pg_constraint where conname='live_events_check' and conrelid='public.live_events'::regclass) not like '%00:30:00%'
  then raise exception 'live_events_check still asks an hour'; end if;
 if (select schedule from cron.job where jobname='harvest-event-schedule') is distinct from '*/5 * * * *' then raise exception 'the cron job does not run every 5 minutes'; end if;
 -- The events made ahead: hourly, with the prizes, ${LEAGUES} leagues and one goal each.
 if (select count(*) from public.live_events where created_by is null and starts_at>now() and active)<2 then raise exception 'fewer than 2 hourly events made ahead'; end if;
 if exists(select 1 from public.live_events e where e.created_by is null and e.starts_at>now()
    and (e.ends_at-e.starts_at<>interval '55 minutes' or not e.rewards ? 'podium' or e.rewards<>'${REWARDS_JSON}'::jsonb or jsonb_array_length(e.leagues)<>${LEAGUES}
     or exists(select 1 from jsonb_array_elements(e.leagues) l where jsonb_array_length(l->'objectives')<>1)))
  then raise exception 'an automatic event made ahead is not an hourly event'; end if;
 -- No 6-hour leftovers: none unsettled, none inactive from 20 Oct 2026.
 if exists(select 1 from public.live_events e where e.created_by is null and e.ends_at-e.starts_at>interval '55 minutes'
    and (e.settled_at is null or (not e.active and e.starts_at>='2026-10-20 12:00+00')))
  then raise exception 'a 6-hour automatic event is left'; end if;
end $after$;
commit;
`;
export function hourlyEventsSql(){return SQL;}
if(import.meta.url===`file://${process.argv[1]}`){
 writeFileSync(new URL('../supabase/hourly-events.sql',import.meta.url),SQL);
 console.log('supabase/hourly-events.sql',SQL.length,'characters,',LEAGUES,'leagues,',HOUR_STATS.length,'goal kinds');
 for(const [name,hash] of Object.entries(NEW_MD5))console.log(name,list(LIVE_MD5[name]??'(new)').join(' or '),'->',hash);
 for(const [name,hash] of Object.entries(LIVE_MD5))if(!NEW_MD5[name]&&PART_B_MD5[name]&&PART_B_MD5[name]!==hash)console.log('NOTE',name,'differs from Part B NEW_MD5',PART_B_MD5[name]);
}
