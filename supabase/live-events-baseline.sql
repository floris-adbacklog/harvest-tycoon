-- Farm events count every action. The first version compared each save with the one before it and skipped any save
-- within 10 seconds of the last counted one, so quick play (care, water or harvest field after field) lost most of
-- its progress. Now each player's row keeps the stats it started from (baseline): progress is "stats now minus
-- baseline", so a skipped or bundled save never loses anything. The 10 seconds only limit how often a save counts as
-- a separate contribution (at least 3 over 10 minutes to qualify). Stat increases that are not the player's own event
-- gameplay (an admin gift, a family transfer, an action that does not match the goal) move the baseline, so they
-- never count. Run after live-events.sql; replaces only harvest_event_progress.
alter table public.live_event_players add column if not exists baseline jsonb;

create or replace function public.harvest_event_progress() returns trigger language plpgsql security invoker set search_path='' as $$
declare e public.live_events; p public.live_event_players; o jsonb; receipt jsonb; action text; stat text;
 before_v integer; after_v integer; value integer; changed boolean; moved boolean; fresh boolean; mapped boolean; base jsonb;
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
 if not exists(select 1 from auth.users where id=new.player_id and created_at<now()-interval '48 hours' and email_confirmed_at is not null) or not exists(select 1 from public.player_stats where player_id=new.player_id and level>=10) then return new; end if;
 for e in select * from public.live_events where active and starts_at<=now() and ends_at>now() and settled_at is null order by id for share loop
  select * into p from public.live_event_players where event_id=e.id and player_id=new.player_id;
  fresh:=not found;
  if fresh then p.progress:='{}';p.actions:=0;p.joined_at:=now();p.last_at:=now()-interval '1 day';p.baseline:=null;end if;
  if p.baseline is null then
   -- Start from the stats before this action; a row from before this change keeps the progress it already has.
   base:='{}';
   for o in select * from jsonb_array_elements(e.objectives) loop
    stat:=o->>'stat';
    base:=jsonb_set(base,array[stat],to_jsonb(coalesce((old.state#>>array['stats',stat])::integer,0)-coalesce((p.progress->>stat)::integer,0)));
   end loop;
   p.baseline:=base;
  end if;
  -- Freeze the qualifying completion time so further play never worsens reward priority.
  if not fresh and p.actions>=3 and p.last_at>=p.joined_at+interval '10 minutes' and not exists(select 1 from jsonb_array_elements(e.objectives) obj where coalesce((p.progress->>(obj->>'stat'))::integer,0)<(obj->>'target')::integer) then continue; end if;
  changed:=false;moved:=false;
  for o in select * from jsonb_array_elements(e.objectives) loop
   stat:=o->>'stat';
   before_v:=coalesce((old.state#>>array['stats',stat])::integer,0);after_v:=coalesce((new.state#>>array['stats',stat])::integer,0);
   mapped:=(stat in ('harvested','watered','tended') and action in ('field','tractor','collect_all')) or (stat='produced' and action in ('collect','collect_all')) or (stat='chores' and action='chore') or (stat='deliveries' and action='delivery');
   if not mapped then
    if after_v>before_v then p.baseline:=jsonb_set(p.baseline,array[stat],to_jsonb(coalesce((p.baseline->>stat)::integer,0)+after_v-before_v));moved:=true;end if;
    continue;
   end if;
   value:=least((o->>'target')::integer,greatest(0,after_v-coalesce((p.baseline->>stat)::integer,before_v)));
   if value>coalesce((p.progress->>stat)::integer,0) then changed:=true;p.progress:=jsonb_set(p.progress,array[stat],to_jsonb(value));end if;
  end loop;
  if changed then
   -- A save counts as a separate contribution at most once every 10 seconds; progress itself always counts.
   insert into public.live_event_players(event_id,player_id,progress,actions,joined_at,last_at,baseline)
    values(e.id,new.player_id,p.progress,p.actions+(case when p.last_at<=now()-interval '10 seconds' then 1 else 0 end),p.joined_at,now(),p.baseline)
    on conflict(event_id,player_id) do update set progress=excluded.progress,actions=excluded.actions,last_at=excluded.last_at,baseline=excluded.baseline;
  elsif moved and not fresh then
   update public.live_event_players set baseline=p.baseline where event_id=e.id and player_id=new.player_id;
  end if;
 end loop;
 return new;
end $$;
