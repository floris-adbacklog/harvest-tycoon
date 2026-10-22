// Writes supabase/one-crop.sql (22 Oct 2026, the owner: "Doe 25%, b, verdubbel de doelen, ook de medailles"): the database's part of one
// crop a harvest. Farmers harvest about twice as often, so
// - the Family Chest counts two harvests as a point (harvest_family_chest: floor(harvested/2) of the new save minus that of the old, so
//   every second harvest is a point, exactly, whatever the saves in between);
// - an hourly event's "Harvest crops" goal asks twice as many, and the care goal's line no longer says care makes a harvest bigger
//   (harvest_event_pick, from public/event-goals.js EVENT_HOUR_POOLS and EVENT_GOAL_TITLES, HOUR_PICK_BODY_ONE_CROP).
// Run: node scripts/one-crop-sql.mjs. Never edit the SQL by hand. It refuses unless both functions are exactly the ones read live
// (md5 of prosrc, read 22 Oct 2026), and the after-check rolls everything back unless both came out as generated. No new function, no
// grant changes: create or replace keeps each function's owner and privileges.
// When to run it: right after farm-api of this change is live (the harvests double from then on). Any minute: an event already made
// keeps its own goals; the next hour's event is drawn with the new pick.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HOUR_PICK_BODY,HOUR_PICK_BODY_ONE_CROP} from './event-goals-sql.mjs';
import {FAMILY_CHEST_POINTS} from '../game/farm-state.js';
const md5=text=>createHash('md5').update(text).digest('hex');
// harvest_family_chest() as read live on 22 Oct 2026 (select prosrc ...): its body, exactly.
export const CHEST_BODY_LIVE=`
declare receipt jsonb; fam uuid; pts bigint; wk integer;
begin
 receipt:=new.receipts->-1;
 if receipt is null or receipt->>'eventAction' is null or receipt->>'id' is not distinct from old.receipts->-1->>'id' then return new; end if;
 if new.state->'stats' is not distinct from old.state->'stats' then return new; end if;
 pts:=greatest(0,coalesce((new.state->'stats'->>'harvested')::bigint,0)-coalesce((old.state->'stats'->>'harvested')::bigint,0))*1
  +greatest(0,coalesce((new.state->'stats'->>'produced')::bigint,0)-coalesce((old.state->'stats'->>'produced')::bigint,0))*2
  +greatest(0,coalesce((new.state->'stats'->>'deliveries')::bigint,0)-coalesce((old.state->'stats'->>'deliveries')::bigint,0))*10
  +greatest(0,coalesce((new.state->'stats'->>'chores')::bigint,0)-coalesce((old.state->'stats'->>'chores')::bigint,0))*3
  +greatest(0,coalesce((new.state->'stats'->>'activities')::bigint,0)-coalesce((old.state->'stats'->>'activities')::bigint,0))*2;
 if pts<=0 then return new; end if;
 select m.family_id into fam from public.family_members m join public.families f on f.id=m.family_id and f.deleted_at is null
  where m.player_id=new.player_id and m.left_at is null limit 1;
 if fam is null then return new; end if;
 wk:=floor((extract(epoch from now())*1000-4*86400000)/(7*86400000))::integer;   -- familyWeek(): weeks start Monday 00:00 UTC
 insert into public.family_chests(family_id,week,points) values(fam,wk,pts)
  on conflict(family_id,week) do update set points=public.family_chests.points+excluded.points;
 insert into public.family_chest_players(family_id,week,player_id,points) values(fam,wk,new.player_id,pts)
  on conflict(family_id,week,player_id) do update set points=public.family_chest_players.points+excluded.points;
 return new;
exception when others then return new;
end `;
export const LIVE_MD5=Object.freeze({'harvest_family_chest()':'b2935aa9acdcab783a7b943463607ad6','harvest_event_pick(bigint)':'a4354b4070af10908e1e609720cba26d'});
if(md5(CHEST_BODY_LIVE)!==LIVE_MD5['harvest_family_chest()'])throw Error('CHEST_BODY_LIVE is not the body read live');
if(md5(HOUR_PICK_BODY)!==LIVE_MD5['harvest_event_pick(bigint)'])throw Error('HOUR_PICK_BODY is not the pick read live');
if(FAMILY_CHEST_POINTS.harvested!==.5)throw Error('FAMILY_CHEST_POINTS.harvested must be 0.5 (two harvests a point)');
const OLD_LINE=" pts:=greatest(0,coalesce((new.state->'stats'->>'harvested')::bigint,0)-coalesce((old.state->'stats'->>'harvested')::bigint,0))*1\n";
const NEW_LINE=" -- Two harvests make a point (one crop a harvest, 22 Oct 2026): whole halves, so every second harvest counts, exactly.\n pts:=greatest(0,coalesce((new.state->'stats'->>'harvested')::bigint,0)/2-coalesce((old.state->'stats'->>'harvested')::bigint,0)/2)\n";
if(CHEST_BODY_LIVE.split(OLD_LINE).length!==2)throw Error('the harvest line changed');
export const CHEST_BODY=CHEST_BODY_LIVE.replace(OLD_LINE,()=>NEW_LINE);
export const NEW_MD5=Object.freeze({'harvest_family_chest()':md5(CHEST_BODY),'harvest_event_pick(bigint)':md5(HOUR_PICK_BODY_ONE_CROP)});
const guard=(sig,hash,when)=>` select md5(p.prosrc) into m from pg_proc p where p.oid='public.${sig}'::regprocedure;
 if m is distinct from '${hash}' then raise exception '${when}: public.${sig} is %, not ${hash}', m; end if;`;
export function oneCropSql(){return `-- One crop a harvest (22 Oct 2026): two harvests a Family Chest point, and hourly "Harvest crops" goals twice as big.
-- Generated by scripts/one-crop-sql.mjs; do not edit by hand. Run right after farm-api of the one-crop release is live.
-- Before: harvest_family_chest() ${LIVE_MD5['harvest_family_chest()']}, harvest_event_pick(bigint) ${LIVE_MD5['harvest_event_pick(bigint)']} (md5 of prosrc).
-- After:  harvest_family_chest() ${NEW_MD5['harvest_family_chest()']}, harvest_event_pick(bigint) ${NEW_MD5['harvest_event_pick(bigint)']}.
-- The care goal's line: "A little care makes every harvest bigger." becomes "A little care brings every harvest in sooner."
begin;

do $guard$ declare m text; begin
${guard('harvest_family_chest()',LIVE_MD5['harvest_family_chest()'],'Not the function read live')}
${guard('harvest_event_pick(bigint)',LIVE_MD5['harvest_event_pick(bigint)'],'Not the function read live')}
end $guard$;

create or replace function public.harvest_family_chest()
 returns trigger language plpgsql security definer set search_path to '' as $function$${CHEST_BODY}$function$;

create or replace function public.harvest_event_pick(n bigint)
 returns jsonb language plpgsql stable set search_path to '' as $function$${HOUR_PICK_BODY_ONE_CROP}$function$;

-- After-check: both exactly as generated, and the chest still security definer with an empty search_path.
do $check$ declare m text; d boolean; c text[]; begin
${guard('harvest_family_chest()',NEW_MD5['harvest_family_chest()'],'After-check')}
${guard('harvest_event_pick(bigint)',NEW_MD5['harvest_event_pick(bigint)'],'After-check')}
 select p.prosecdef, p.proconfig into d, c from pg_proc p where p.oid='public.harvest_family_chest()'::regprocedure;
 if not d or c is distinct from array['search_path=""'] then raise exception 'After-check: harvest_family_chest lost security definer or its search_path'; end if;
end $check$;

commit;
`;}
if(import.meta.url===`file://${process.argv[1]}`){writeFileSync(new URL('../supabase/one-crop.sql',import.meta.url),oneCropSql());console.log('supabase/one-crop.sql',NEW_MD5);}
