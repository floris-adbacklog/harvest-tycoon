-- More farm events (24 Sep 2026): twelve automatic events instead of five, the seven new ones about one crop or eggs ("The wheat
-- race", "Corn country", "The egg hunt", "Salad days", "Beans and barley", "The great harvest", "Market garden"). Every goal is
-- open to every farm from level 10, when events open: crops unlocked by level 9 and eggs from the coop, which is free.
-- 1. harvest_event_validate: goals may also count one crop's harvest (harvest_wheat ... harvest_cabbage) or eggs (made_eggs).
-- 2. harvest_event_progress: a crop's harvest counts for field and tractor actions, a good for collecting batches.
-- 3. harvest_event_schedule: the twelve templates (rewards unchanged: 200 coins + 1 diamond, podium on top).
-- All three are the live definitions read on 24 Sep 2026 (prosrc md5: validate 3b8962ea..., progress ff591a0b..., schedule
-- d4b14055..., the same as live-events.sql, live-events-baseline.sql and live-events-fixed-base.sql) with only these changes.
-- Events already created keep their goals.

create or replace function public.harvest_event_validate() returns trigger language plpgsql security invoker set search_path='' as $$
declare objective jsonb; k text;
begin
 perform pg_advisory_xact_lock(724919);
 if TG_OP='UPDATE' and old.starts_at<=now() and (new.title<>old.title or new.description<>old.description or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.objectives<>old.objectives or new.rewards<>old.rewards) then raise exception 'Started events are frozen. Create a new event to change the rules.'; end if;
 if new.active and new.ends_at>now() and exists(select 1 from public.live_events e where e.id<>new.id and e.active and e.starts_at<new.ends_at and e.ends_at>new.starts_at) then raise exception 'Active events cannot overlap.'; end if;
 if jsonb_typeof(new.objectives)<>'array' or jsonb_array_length(new.objectives) not between 1 and 4 then raise exception 'Choose 1–4 objectives.'; end if;
 for objective in select value from jsonb_array_elements(new.objectives) loop
  if coalesce(objective->>'stat','') not in ('harvested','produced','watered','tended','chores','deliveries','harvest_wheat','harvest_corn','harvest_lettuce','harvest_barley','harvest_greenbeans','harvest_cabbage','made_eggs') or coalesce((objective->>'target')::integer,0) not between 1 and 10000 then raise exception 'Invalid event objective.'; end if;
 end loop;
 if (select count(distinct value->>'stat') from jsonb_array_elements(new.objectives))<>jsonb_array_length(new.objectives) then raise exception 'Objectives must be unique.'; end if;
 foreach k in array array['coins','diamondMin','diamondMax','participantStep','poolCap'] loop
  if not new.rewards ? k or jsonb_typeof(new.rewards->k)<>'number' or (new.rewards->>k)::numeric<>trunc((new.rewards->>k)::numeric) then raise exception 'Reward settings must be whole numbers.'; end if;
 end loop;
 if (new.rewards->>'coins')::integer not between 0 and 300 or (new.rewards->>'diamondMin')::integer not between 0 and 1 or (new.rewards->>'diamondMax')::integer not between 1 and 3 or (new.rewards->>'participantStep')::integer not between 10 and 1000 or (new.rewards->>'poolCap')::integer not between 0 and 200 then raise exception 'Reward settings exceed safe limits.'; end if;
 return new;
end $$;

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
   mapped:=(stat in ('harvested','watered','tended') and action in ('field','tractor','collect_all')) or (stat='produced' and action in ('collect','collect_all')) or (stat='chores' and action='chore') or (stat='deliveries' and action='delivery')
    or (stat like 'harvest\_%' and action in ('field','tractor')) or (stat like 'made\_%' and action in ('collect','collect_all'));
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

create or replace function public.harvest_event_schedule() returns void language plpgsql security invoker set search_path='' as $$
declare
 -- Targets fit a 5-hour window for a level-10 farmer who plays for part of it, and every goal is open to every farm from
 -- level 10 (crops unlocked by level 9, eggs from the free coop; no Bakery or Dairy Barn needed). Deliveries are left out: the daily
 -- order board can run empty, and an event must never be impossible.
 templates constant jsonb:='[
  {"title":"Harvest rush","description":"Bring in the harvest together with farmers across the valley.","objectives":[{"stat":"harvested","target":40},{"stat":"watered","target":20}]},
  {"title":"Busy kitchens","description":"Keep your buildings humming and collect fresh batches.","objectives":[{"stat":"produced","target":10},{"stat":"harvested","target":20}]},
  {"title":"Green thumbs","description":"Give your fields some extra love with water and care.","objectives":[{"stat":"watered","target":25},{"stat":"tended","target":15}]},
  {"title":"Helping hands","description":"Lend a hand around the farm and keep the kitchens going.","objectives":[{"stat":"chores","target":4},{"stat":"harvested","target":20},{"stat":"produced","target":5}]},
  {"title":"Full baskets","description":"A little of everything: harvest, bake and tend.","objectives":[{"stat":"harvested","target":30},{"stat":"produced","target":6},{"stat":"tended","target":10}]},
  {"title":"The wheat race","description":"Every farm grows wheat. Bring in yours before the rest of the valley does.","objectives":[{"stat":"harvest_wheat","target":150},{"stat":"watered","target":20}]},
  {"title":"Corn country","description":"Fill the barns with golden corn and give the fields a little care.","objectives":[{"stat":"harvest_corn","target":60},{"stat":"tended","target":10}]},
  {"title":"The egg hunt","description":"Keep the hens fed and the baskets full.","objectives":[{"stat":"made_eggs","target":45},{"stat":"harvest_corn","target":20}]},
  {"title":"Salad days","description":"Crisp lettuce and cabbage for every kitchen in the village.","objectives":[{"stat":"harvest_lettuce","target":60},{"stat":"harvest_cabbage","target":12}]},
  {"title":"Beans and barley","description":"Two sturdy crops for the whole valley.","objectives":[{"stat":"harvest_barley","target":30},{"stat":"harvest_greenbeans","target":15}]},
  {"title":"The great harvest","description":"Wheat, corn and lettuce: a little of everything the valley grows.","objectives":[{"stat":"harvest_wheat","target":60},{"stat":"harvest_corn","target":30},{"stat":"harvest_lettuce","target":30}]},
  {"title":"Market garden","description":"Cabbage and green beans for the market stalls, watered on time.","objectives":[{"stat":"harvest_cabbage","target":15},{"stat":"harvest_greenbeans","target":15},{"stat":"watered","target":20}]}
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
