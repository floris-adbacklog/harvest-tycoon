-- Automatic farm events pay a fixed base: 200 coins and 1 diamond for every farmer who finishes (the first 50), no longer
-- "1-2 diamonds" depending on how many finish, so the event screen can show one list with exact totals per place (with the
-- podium prizes of live-events-prizes.sql: 1st 2,200 coins + 21 diamonds, 2nd 1,200 + 11, 3rd 700 + 6, everyone else 300 + 2).
-- harvest_event_schedule is the live definition read on 23 Sep 2026 (prosrc md5 11506f96e4dacc6ee9ad57fd66a50229, the same as
-- live-events-schedule.sql) with only diamondMax 2 -> 1. Automatic events that have not started yet get the same base; one that
-- has started is frozen by harvest_event_validate and keeps its rules.
create or replace function public.harvest_event_schedule() returns void language plpgsql security invoker set search_path='' as $$
declare
 -- Targets fit a 5-hour window for a level-10 farmer who plays for part of it. Deliveries are left out: the daily
 -- order board can run empty, and an event must never be impossible.
 templates constant jsonb:='[
  {"title":"Harvest rush","description":"Bring in the harvest together with farmers across the valley.","objectives":[{"stat":"harvested","target":40},{"stat":"watered","target":20}]},
  {"title":"Busy kitchens","description":"Keep your buildings humming and collect fresh batches.","objectives":[{"stat":"produced","target":10},{"stat":"harvested","target":20}]},
  {"title":"Green thumbs","description":"Give your fields some extra love with water and care.","objectives":[{"stat":"watered","target":25},{"stat":"tended","target":15}]},
  {"title":"Helping hands","description":"Lend a hand around the farm and keep the kitchens going.","objectives":[{"stat":"chores","target":4},{"stat":"harvested","target":20},{"stat":"produced","target":5}]},
  {"title":"Full baskets","description":"A little of everything: harvest, bake and tend.","objectives":[{"stat":"harvested","target":30},{"stat":"produced","target":6},{"stat":"tended","target":10}]}
 ]';
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
  t:=templates->(n%jsonb_array_length(templates))::integer;
  begin
   insert into public.live_events(id,title,description,starts_at,ends_at,active,objectives,rewards,created_by)
   values(event_id,t->>'title',t->>'description',starts,starts+interval '5 hours',true,t->'objectives',rewards,null);
  exception
   -- An operator's own active event already holds this time, or a parallel run just created the same slot.
   when raise_exception or unique_violation then null;
  end;
 end loop;
end $$;

update public.live_events set rewards=rewards||'{"diamondMax":1}'::jsonb
 where created_by is null and starts_at>now() and settled_at is null and (rewards->>'diamondMax')::integer<>1;
