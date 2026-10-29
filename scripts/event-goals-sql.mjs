// Writes supabase/live-event-league-goals.sql from public/event-goals.js (1 Oct 2026): harvest_event_pick draws an event's groups
// and sizes once, as before, and then each league's own goals and title from its own pool; harvest_event_schedule stores them.
// Run: node scripts/event-goals-sql.mjs
// 20 Oct 2026: the pick and the check are also exported (PICK_SQL, PICK_BODY, VALIDATE_SQL, VALIDATE_BODY), so
// scripts/world-two-leagues-sql.mjs writes exactly the same functions into the live switch to the village leagues.
import {writeFileSync} from 'node:fs';
// The 5-hour pick and the hourly pick that ran use the pools and titles from before one crop a harvest (22 Oct 2026); the hourly pick
// of supabase/one-crop.sql (scripts/one-crop-sql.mjs) uses today's (HOUR_PICK_BODY_ONE_CROP).
import {EVENT_HOUR_OLDER,EVENT_HOUR_MIX} from '../public/event-goals.js';
import {EVENT_GOAL_POOLS as ALL_GOAL_POOLS,EVENT_GOAL_TITLES_BEFORE_ONE_CROP as EVENT_GOAL_TITLES,EVENT_HOUR_POOLS_BEFORE_ONE_CROP as ALL_HOUR_POOLS,EVENT_HOUR_POOLS as ALL_POOLS_NOW,EVENT_GOAL_TITLES as TITLES_NOW} from '../public/event-goals.js';
// The functions this file writes are the live ones, made for the farm's six leagues and the village's six (EVENT_LEAGUES 0..11). The
// harbour's five (27 Oct 2026, 12..16) come with a patch of their own, so these stay exactly as they run.
export const LIVE_LEAGUES=12;
const EVENT_GOAL_POOLS=ALL_GOAL_POOLS.slice(0,LIVE_LEAGUES),EVENT_HOUR_POOLS=ALL_HOUR_POOLS.slice(0,LIVE_LEAGUES),HOUR_POOLS_NOW=ALL_POOLS_NOW.slice(0,LIVE_LEAGUES);

const pools=EVENT_GOAL_POOLS.map(league=>league.map(group=>group.map(({stat,targets})=>{
 const titles=EVENT_GOAL_TITLES[stat];if(!titles)throw Error(`No titles for ${stat}`);
 return {stat,targets,titles};
})));
const json=JSON.stringify(pools).replaceAll("'","''");
// Every goal an event may have (4 Oct 2026): the ones an operator's event could always use, and every goal in the leagues' pools.
// The check on live_events (harvest_event_validate) refused the goals the leagues brought in on 1 Oct (made_salad, sold_eggs, ...);
// harvest_event_schedule swallows a refusal, so about half the events since then were never made and the break ran to 7-13 hours.
const OPERATOR_STATS=['harvested','produced','watered','tended','chores','deliveries','harvest_wheat','harvest_corn','harvest_lettuce','harvest_barley','harvest_greenbeans','harvest_cabbage','made_eggs','planted','sold','earned','coins_spent','diamonds_spent','activities','upgrades','made_feed','made_milk','made_cheese','made_flour','fertilized','harvest_cauliflower','made_grainmeal','made_bread','parallel_batches','boosts_used','activity_rounds','sold_wheat'];
export const EVENT_STATS=[...new Set([...OPERATOR_STATS,...EVENT_GOAL_POOLS.flat(2).map(goal=>goal.stat)])];
const statList=EVENT_STATS.map(stat=>`'${stat}'`).join(',');

export const PICK_BODY=`
declare
 pools constant jsonb:='${json}';
 r bigint[]:=array[]::bigint[]; i int; lg int; head int; rest int[]; g1 int; g2 int; sizes int[]; groups int[]; kind jsonb; picked jsonb; title jsonb; main jsonb; pool jsonb;
 leagues jsonb:='[]'::jsonb;
begin
 for i in 1..8 loop r:=r||abs(hashtextextended('harvest-event-mix:'||n||':'||i,0)); end loop;
 head:=(n%5)::int;
 rest:=array_remove(array[0,1,2,3,4],head);
 g1:=rest[1+(r[1]%4)::int];rest:=array_remove(rest,g1);
 g2:=rest[1+(r[2]%3)::int];
 groups:=array[head,g1,g2];
 sizes:=case when r[3]%2=0 then array[2,1,0] else array[1,1,1] end;   -- index into targets: 0 easy, 1 medium, 2 hard
 for lg in 0..jsonb_array_length(pools)-1 loop
  pool:=pools->lg;picked:='[]'::jsonb;
  for i in 1..3 loop
   kind:=(pool->groups[i])->((r[3+i]%jsonb_array_length(pool->groups[i]))::int);
   if i=1 then main:=kind; end if;
   picked:=picked||jsonb_build_array(jsonb_build_object('stat',kind->>'stat','target',(kind->'targets'->>sizes[i])::int));
  end loop;
  title:=main->'titles'->((r[7]%jsonb_array_length(main->'titles'))::int);
  leagues:=leagues||jsonb_build_array(jsonb_build_object('title',title->>0,'description',title->>1,'objectives',picked));
 end loop;
 -- The event's own title and goals are the Sprout League's: admin screens and any older reader keep working.
 return jsonb_build_object('title',leagues->0->>'title','description',leagues->0->>'description','objectives',leagues->0->'objectives','leagues',leagues);
end `;
export const PICK_SQL=`create or replace function public.harvest_event_pick(n bigint)
 returns jsonb language plpgsql stable set search_path to '' as $function$${PICK_BODY}$function$;`;
export const VALIDATE_BODY=`
declare objective jsonb; k text;
begin
 perform pg_advisory_xact_lock(724919);
 if TG_OP='UPDATE' and old.starts_at<=now() and (new.title<>old.title or new.description<>old.description or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.objectives<>old.objectives or new.rewards<>old.rewards) then raise exception 'Started events are frozen. Create a new event to change the rules.'; end if;
 if new.active and new.ends_at>now() and exists(select 1 from public.live_events e where e.id<>new.id and e.active and e.starts_at<new.ends_at and e.ends_at>new.starts_at) then raise exception 'Active events cannot overlap.'; end if;
 if jsonb_typeof(new.objectives)<>'array' or jsonb_array_length(new.objectives) not between 1 and 4 then raise exception 'Choose 1–4 objectives.'; end if;
 for objective in select value from jsonb_array_elements(new.objectives) loop
  if coalesce(objective->>'stat','') not in (${statList}) or coalesce((objective->>'target')::integer,0) not between 1 and 10000 then raise exception 'Invalid event objective.'; end if;
 end loop;
 if (select count(distinct value->>'stat') from jsonb_array_elements(new.objectives))<>jsonb_array_length(new.objectives) then raise exception 'Objectives must be unique.'; end if;
 foreach k in array array['coins','diamondMin','diamondMax','participantStep','poolCap'] loop
  if not new.rewards ? k or jsonb_typeof(new.rewards->k)<>'number' or (new.rewards->>k)::numeric<>trunc((new.rewards->>k)::numeric) then raise exception 'Reward settings must be whole numbers.'; end if;
 end loop;
 if (new.rewards->>'coins')::integer not between 0 and 300 or (new.rewards->>'diamondMin')::integer not between 0 and 1 or (new.rewards->>'diamondMax')::integer not between 1 and 3 or (new.rewards->>'participantStep')::integer not between 10 and 1000 or (new.rewards->>'poolCap')::integer not between 0 and 200 then raise exception 'Reward settings exceed safe limits.'; end if;
 return new;
end `;
export const VALIDATE_SQL=`create or replace function public.harvest_event_validate()
 returns trigger language plpgsql set search_path to '' as $function$${VALIDATE_BODY}$function$;`;

// Hourly events (20 Oct 2026, the owner): one goal an hour (public/event-goals.js EVENT_HOUR_POOLS). New exports beside the ones
// above, which stay as they are: Part B (scripts/world-two-leagues-sql.mjs) imports PICK_BODY and VALIDATE_BODY, and its md5s must
// not change after it ran. scripts/hourly-events-sql.mjs writes these into supabase/hourly-events.sql.
const poolsWithTitles=(pools,titleOf)=>pools.map(league=>league.map(group=>group.map(({stat,target})=>{
 const titles=titleOf[stat];if(!titles)throw Error(`No titles for ${stat}`);
 return {stat,target,titles};
})));
export const HOUR_STATS=[...new Set(EVENT_HOUR_POOLS.flat(2).map(goal=>goal.stat))];
const hourPickBody=hourPools=>`
declare
 pools constant jsonb:='${JSON.stringify(hourPools).replaceAll("'","''")}';
 grp int:=(n%5)::int; lg int; r bigint; pool jsonb; kind jsonb; title jsonb; leagues jsonb:='[]'::jsonb;
begin
 -- The kind of play is the same for everyone this hour (fields, crops, buildings, market, helping out; in the village mine and
 -- forest, fields and kitchens, workshops, market square, around the village). 24 is not a multiple of 5, so an hour of the day
 -- gets another kind every day.
 for lg in 0..jsonb_array_length(pools)-1 loop
  pool:=pools->lg->grp;
  r:=abs(hashtextextended('harvest-hour-event:'||n||':'||lg,0));
  kind:=pool->((r%jsonb_array_length(pool))::int);
  title:=kind->'titles'->(((r/7)%jsonb_array_length(kind->'titles'))::int);
  leagues:=leagues||jsonb_build_array(jsonb_build_object('title',title->>0,'description',title->>1,
   'objectives',jsonb_build_array(jsonb_build_object('stat',kind->>'stat','target',(kind->>'target')::int))));
 end loop;
 -- The event's own title and goal are the Sprout League's: admin screens and any older reader keep working.
 return jsonb_build_object('title',leagues->0->>'title','description',leagues->0->>'description','objectives',leagues->0->'objectives','leagues',leagues);
end `;
export const HOUR_PICK_BODY=hourPickBody(poolsWithTitles(EVENT_HOUR_POOLS,EVENT_GOAL_TITLES));
export const HOUR_PICK_BODY_ONE_CROP=hourPickBody(poolsWithTitles(HOUR_POOLS_NOW,TITLES_NOW));
// The same pick with the harbour's five leagues too (29 Oct 2026, EVENT_LEAGUES 12..16): scripts/harbour-leagues-sql.mjs.
export const HOUR_PICK_BODY_HARBOUR=hourPickBody(poolsWithTitles(ALL_POOLS_NOW,TITLES_NOW));
// Older worlds' goals in the higher leagues (29 Oct 2026, the owner: option 2; public/event-goals.js EVENT_HOUR_MIX): each league
// first draws where its goal comes from (its own pool, or an older world's top pool), on a hash of its own, and then the goal as
// before. A league of the farm always draws 'own', so its goal is the same as before; so is any league's when it draws 'own'.
const olderWithTitles=Object.fromEntries(Object.entries(EVENT_HOUR_OLDER).map(([world,pool])=>[world,poolsWithTitles([pool],TITLES_NOW)[0]]));
export const HOUR_PICK_BODY_MIX=hourPickBody(poolsWithTitles(ALL_POOLS_NOW,TITLES_NOW))
 .replace(" grp int:=(n%5)::int; lg int; r bigint; pool jsonb;",` older constant jsonb:='${JSON.stringify(olderWithTitles).replaceAll("'","''")}';
 mix constant jsonb:='${JSON.stringify(EVENT_HOUR_MIX)}';
 grp int:=(n%5)::int; lg int; r bigint; src text; pool jsonb;`)
 .replace("  pool:=pools->lg->grp;\n",`  -- Where this league's goal comes from this hour (29 Oct 2026): its own pool, or an older world's (the farm's, the village's).
  src:=mix->lg->>((abs(hashtextextended('harvest-hour-source:'||n||':'||lg,0))%jsonb_array_length(mix->lg))::int);
  pool:=case when src='own' then pools->lg->grp else older->src->grp end;\n`);
if(!HOUR_PICK_BODY_MIX.includes("older->src->grp")||!HOUR_PICK_BODY_MIX.includes('mix constant jsonb'))throw Error('HOUR_PICK_BODY_MIX: the hour pick changed');
export const HOUR_PICK_SQL=`create or replace function public.harvest_event_pick(n bigint)
 returns jsonb language plpgsql stable set search_path to '' as $function$${HOUR_PICK_BODY}$function$;`;
export const HOUR_PICK_SQL_ONE_CROP=`create or replace function public.harvest_event_pick(n bigint)
 returns jsonb language plpgsql stable set search_path to '' as $function$${HOUR_PICK_BODY_ONE_CROP}$function$;`;
// The check, with the rules of an hourly event's prizes (podium, finisher and the family bonus in rewards; no coins).
const PODIUM_CHECK=` if new.rewards ? 'podium' then
  if jsonb_typeof(new.rewards->'podium')<>'array' or jsonb_array_length(new.rewards->'podium')<>3
   -- (a case, not an or: SQL does not promise to stop before casting a non-number)
   or exists(select 1 from jsonb_array_elements(new.rewards->'podium') d where case when jsonb_typeof(d)='number' then d::text::numeric<>trunc(d::text::numeric) or d::text::numeric not between 0 and 25 else true end)
   then raise exception 'Podium diamonds must be 3 whole numbers from 0 to 25.'; end if;
  foreach k in array array['finisher','familyFinishers','familyDiamonds'] loop
   if not new.rewards ? k or jsonb_typeof(new.rewards->k)<>'number' or (new.rewards->>k)::numeric<>trunc((new.rewards->>k)::numeric) then raise exception 'Reward settings must be whole numbers.'; end if;
  end loop;
  if (new.rewards->>'finisher')::integer not between 0 and 3 or (new.rewards->>'familyFinishers')::integer not between 2 and 10
   or (new.rewards->>'familyDiamonds')::integer not between 0 and 5 or (new.rewards->>'coins')::integer<>0
   then raise exception 'Reward settings exceed safe limits.'; end if;
 end if;
`;
if(VALIDATE_BODY.split('\n return new;\n').length!==2)throw Error('VALIDATE_BODY changed: one return new expected');
export const HOUR_VALIDATE_BODY=VALIDATE_BODY.replace('\n return new;\n',`\n${PODIUM_CHECK} return new;\n`);
export const HOUR_VALIDATE_SQL=`create or replace function public.harvest_event_validate()
 returns trigger language plpgsql set search_path to '' as $function$${HOUR_VALIDATE_BODY}$function$;`;

const sql=`-- Generated by scripts/event-goals-sql.mjs from public/event-goals.js. Do not edit by hand.
-- Farm event goals per league (1 Oct 2026): an event draws its 3 groups and their sizes once, the same for everyone (as before);
-- each league then draws its own kind of goal in those groups from its own pool, and the title of its first goal. The Sprout
-- League's pool is the one every event used before, so its goals and titles come out the same for the same slot.
alter table public.live_events add column if not exists leagues jsonb;

${PICK_SQL}

-- As live on 1 Oct 2026, now also storing each league's goals.
create or replace function public.harvest_event_schedule()
 returns void language plpgsql set search_path to '' as $function$
declare
 rewards constant jsonb:='{"coins":200,"diamondMin":1,"diamondMax":1,"participantStep":25,"poolCap":50}';
 slot bigint:=floor(extract(epoch from now())/21600)::bigint;
 ended uuid; n bigint; starts timestamptz; event_id uuid; t jsonb;
begin
 for ended in select e.id from public.live_events e where e.ends_at<=now() and e.settled_at is null loop
  perform public.harvest_event_settle(ended);
 end loop;
 for n in slot..slot+2 loop
  starts:=to_timestamp(n::bigint*21600);
  continue when starts+interval '5 hours'<=now();
  event_id:=md5('harvest-auto-event:'||n)::uuid;
  continue when exists(select 1 from public.live_events e where e.id=event_id);
  t:=public.harvest_event_pick(n);
  begin
   insert into public.live_events(id,title,description,starts_at,ends_at,active,objectives,rewards,created_by,leagues)
   values(event_id,t->>'title',t->>'description',starts,starts+interval '5 hours',true,t->'objectives',rewards,null,t->'leagues');
  exception
   -- An operator's own active event already holds this time, or a parallel run just created the same slot.
   when raise_exception or unique_violation then null;
  end;
 end loop;
end $function$;

-- As live on 4 Oct 2026, with every goal of the leagues' pools allowed (EVENT_STATS in scripts/event-goals-sql.mjs).
${VALIDATE_SQL}

-- The automatic events made ahead before this ran get their per-league goals too (never one that has started).
update public.live_events e set leagues=public.harvest_event_pick(floor(extract(epoch from e.starts_at)/21600)::bigint)->'leagues'
 where e.created_by is null and e.leagues is null and e.starts_at>now();
`;
if(import.meta.url===`file://${process.argv[1]}`){
writeFileSync(new URL('../supabase/live-event-league-goals.sql',import.meta.url),sql);
console.log('supabase/live-event-league-goals.sql',sql.length,'characters,',pools.length,'leagues');
}
