-- Automatic farm events: every 6 hours (00, 06, 12 and 18 UTC) a 5-hour event starts, followed by a 1-hour
-- break. Run after live-events.sql. A pg_cron job creates the running event and the next two ahead of time and
-- settles ended events, so rewards can be collected even when nobody opened the event list in between.
-- Admin-made events keep working: when one already holds a slot, that automatic event is skipped.
begin;
-- Automatic events have no creator.
alter table public.live_events alter column created_by drop not null;

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
 rewards constant jsonb:='{"coins":200,"diamondMin":1,"diamondMax":2,"participantStep":25,"poolCap":50}';
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
revoke all on function public.harvest_event_schedule() from public,anon,authenticated;
grant execute on function public.harvest_event_schedule() to service_role;

select cron.schedule('harvest-event-schedule','*/15 * * * *','select public.harvest_event_schedule()');
select public.harvest_event_schedule();
commit;
