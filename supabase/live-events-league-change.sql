-- 11 Oct 2026: a goal the baseline lacks gets its own start point. A farmer who levels into the next league during an event gets that
-- league's goals, but the baseline only held the old league's: with no start point for a new goal, every save counted alone, so the
-- goal could never pass the most one save added (a farmer who reached level 30 during "Full throttle" saw the tractor goal stuck at 1
-- after more than 5 tractor jobs). Now any goal missing from the baseline starts from the stats before this action, less the progress
-- it already has, as a new row's goals always did, and the extended baseline is saved even when no progress changed.
-- The rest is the live function of 11 Oct 2026 unchanged (read from the database before this change).
create or replace function public.harvest_event_progress()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare e public.live_events; p public.live_event_players; o jsonb; receipt jsonb; action text; stat text;
 before_v integer; after_v integer; value integer; changed boolean; moved boolean; fresh boolean; mapped boolean; base jsonb;
 lg smallint; objs jsonb; extended boolean;
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
 select public.harvest_event_league(s.level) into lg from public.player_stats s where s.player_id=new.player_id and s.level>=15;
 if not found then return new; end if;
 for e in select * from public.live_events where active and starts_at<=now() and ends_at>now() and settled_at is null order by id for share loop
  objs:=coalesce(e.leagues->lg->'objectives',e.objectives);
  select * into p from public.live_event_players where event_id=e.id and player_id=new.player_id;
  fresh:=not found;
  if fresh then p.progress:='{}';p.actions:=0;p.joined_at:=now();p.last_at:=now()-interval '1 day';p.baseline:=null;end if;
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
    or (stat='tractor' and action='tractor') or (stat like 'sold\_%' and action='sell');
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
  elsif (moved or extended) and not fresh then
   update public.live_event_players set baseline=p.baseline where event_id=e.id and player_id=new.player_id;
  end if;
 end loop;
 return new;
end $function$;
